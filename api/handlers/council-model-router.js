/**
 * Council Model Router Handler - Handles LLM model routing logic
 * Provides helper functions for model name mapping and prompt building
 */

import { corsMiddleware, sendSuccess, sendError, ERROR_CODES, HTTP_STATUS } from './utils.js';

export function getLLMToolName(modelName) {
    const normalized = modelName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `llm_${normalized}`;
}

export function buildLLMPrompt(prompt, temperature, maxTokens) {
    return {
        prompt,
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 500
    };
}

export function parseModelResponse(toolResult) {
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

export function calculateConsensus(responses) {
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

    if (req.method !== 'GET') {
        return sendError(
            res,
            ERROR_CODES.INVALID_REQUEST,
            'Method not allowed',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    sendSuccess(res, {
        functions: {
            getLLMToolName: 'Convert model name to tool name format',
            buildLLMPrompt: 'Build standardized LLM prompt object',
            parseModelResponse: 'Parse various MCP response formats',
            calculateConsensus: 'Calculate consensus from multiple model responses'
        }
    });
}