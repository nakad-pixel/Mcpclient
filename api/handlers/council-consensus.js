import { globalSessionManager } from './session-manager.js';
import { readJsonBody, corsMiddleware, sendSuccess, sendError, handleUnknownError, ERROR_CODES, HTTP_STATUS } from './utils.js';

function getLLMToolName(modelName) {
    const normalized = modelName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `llm_${normalized}`;
}

function buildLLMPrompt(prompt, temperature, maxTokens) {
    return {
        prompt,
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 500
    };
}

function parseModelResponse(toolResult) {
    if (!toolResult) return null;

    if (typeof toolResult === 'string') {
        return toolResult;
    }

    if (toolResult.content) {
        if (Array.isArray(toolResult.content)) {
            return toolResult.content
                .map(item => {
                    if (item.type === 'text') return item.text;
                    if (item.text) return item.text;
                    return JSON.stringify(item);
                })
                .join('\n');
        }
        if (typeof toolResult.content === 'string') {
            return toolResult.content;
        }
    }

    if (toolResult.response) {
        return toolResult.response;
    }

    if (toolResult.text) {
        return toolResult.text;
    }

    return JSON.stringify(toolResult);
}

function calculateConsensus(responses) {
    if (!responses || responses.length === 0) {
        return null;
    }

    if (responses.length === 1) {
        return {
            consensus: responses[0].response,
            votedModel: responses[0].model,
            strategy: 'single_model'
        };
    }

    const responseMap = new Map();
    for (const resp of responses) {
        const normalized = (resp.response || '').trim().toLowerCase();
        if (!responseMap.has(normalized)) {
            responseMap.set(normalized, []);
        }
        responseMap.get(normalized).push(resp);
    }

    let maxCount = 0;
    let consensusKey = null;
    for (const [key, items] of responseMap.entries()) {
        if (items.length > maxCount) {
            maxCount = items.length;
            consensusKey = key;
        }
    }

    if (maxCount > responses.length / 2) {
        const winningGroup = responseMap.get(consensusKey);
        return {
            consensus: winningGroup[0].response,
            votedModel: winningGroup[0].model,
            strategy: 'majority_vote'
        };
    }

    const longest = responses.reduce((prev, curr) => {
        return (curr.response || '').length > (prev.response || '').length ? curr : prev;
    });

    return {
        consensus: longest.response,
        votedModel: longest.model,
        strategy: 'longest_response'
    };
}

export default async function handler(req, res) {
    if (corsMiddleware(req, res)) return;

    if (req.method !== 'POST') {
        return sendError(
            res,
            ERROR_CODES.INVALID_REQUEST,
            'Method not allowed',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const startTime = Date.now();

    try {
        const body = await readJsonBody(req);
        const { sessionId, prompt, models, temperature, maxTokens } = body;

        if (!sessionId || typeof sessionId !== 'string') {
            return sendError(
                res,
                ERROR_CODES.INVALID_REQUEST,
                'sessionId is required and must be a string',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        if (!prompt || typeof prompt !== 'string') {
            return sendError(
                res,
                ERROR_CODES.INVALID_REQUEST,
                'prompt is required and must be a string',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        if (!Array.isArray(models) || models.length === 0) {
            return sendError(
                res,
                ERROR_CODES.INVALID_REQUEST,
                'models must be a non-empty array',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const session = globalSessionManager.getSession(sessionId);

        const tasks = models.map(async modelName => {
            const toolName = getLLMToolName(modelName);

            try {
                const input = {
                    model: modelName,
                    ...buildLLMPrompt(prompt, temperature, maxTokens)
                };

                const toolResult = await session.client.callTool(toolName, input);
                const responseText = parseModelResponse(toolResult);

                if (!responseText) {
                    throw new Error('Empty model response');
                }

                return {
                    model: modelName,
                    response: responseText,
                    confidence: typeof toolResult?.confidence === 'number' ? toolResult.confidence : 1.0
                };
            } catch (err) {
                return {
                    model: modelName,
                    error: err.message,
                    response: null,
                    confidence: 0
                };
            }
        });

        const results = await Promise.all(tasks);
        const successful = results.filter(r => r.response);

        if (successful.length === 0) {
            return sendError(
                res,
                ERROR_CODES.MCP_ERROR,
                'All council models failed',
                HTTP_STATUS.BAD_GATEWAY,
                { results }
            );
        }

        const vote = calculateConsensus(successful);
        const executionTime = Date.now() - startTime;

        sendSuccess(res, {
            consensus: vote.consensus,
            details: results.map(r => ({
                model: r.model,
                ...(r.response ? { response: r.response, confidence: r.confidence } : { error: r.error })
            })),
            votedModel: vote.votedModel,
            strategy: vote.strategy,
            executionTime
        });
    } catch (err) {
        if (err.code === 'INVALID_JSON') {
            return sendError(
                res,
                ERROR_CODES.INVALID_REQUEST,
                err.message,
                HTTP_STATUS.BAD_REQUEST
            );
        }

        if (err.code === 'SESSION_NOT_FOUND') {
            return sendError(
                res,
                ERROR_CODES.SESSION_NOT_FOUND,
                'Session not found or expired. Please reconnect.',
                HTTP_STATUS.UNAUTHORIZED
            );
        }

        if (err.code === 'TIMEOUT') {
            return sendError(
                res,
                ERROR_CODES.TIMEOUT,
                'Council request timed out',
                HTTP_STATUS.GATEWAY_TIMEOUT
            );
        }

        handleUnknownError(res, err);
    }
}