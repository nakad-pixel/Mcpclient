/**
 * MCP Call Handler - POST /api/mcp/call
 * Executes tools on connected MCP servers
 */

import { globalSessionManager } from './8-session-utils.js';
import { readJsonBody, corsMiddleware, sendSuccess, sendError, handleUnknownError, ERROR_CODES, HTTP_STATUS } from './9-core-utils.js';

function validateToolArguments(tool, args) {
    if (!tool.inputSchema) return { valid: true };

    const schema = tool.inputSchema;
    if (schema.required && Array.isArray(schema.required)) {
        for (const field of schema.required) {
            if (!(field in args)) {
                return {
                    valid: false,
                    error: `Missing required argument: ${field}`
                };
            }
        }
    }

    return { valid: true };
}

function transformToolResult(mcpResult) {
    if (!mcpResult) return 'No result';

    if (typeof mcpResult === 'string') return mcpResult;

    if (mcpResult.content) {
        if (Array.isArray(mcpResult.content)) {
            return mcpResult.content
                .map(item => {
                    if (item.type === 'text') return item.text;
                    if (item.text) return item.text;
                    return JSON.stringify(item);
                })
                .join('\n');
        }
        return mcpResult.content;
    }

    return JSON.stringify(mcpResult);
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

    try {
        const body = await readJsonBody(req);
        const { sessionId, tool, args } = body;

        if (!sessionId || typeof sessionId !== 'string') {
            return sendError(
                res,
                ERROR_CODES.INVALID_REQUEST,
                'sessionId is required and must be a string',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        if (!tool || typeof tool !== 'string') {
            return sendError(
                res,
                ERROR_CODES.INVALID_REQUEST,
                'tool is required and must be a string',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const session = globalSessionManager.getSession(sessionId);

        const toolDef = session.tools.find(t => t.name === tool);
        if (!toolDef) {
            return sendError(
                res,
                ERROR_CODES.TOOL_NOT_FOUND,
                `Tool '${tool}' not found in session`,
                HTTP_STATUS.NOT_FOUND,
                { availableTools: session.tools.map(t => t.name) }
            );
        }

        const validation = validateToolArguments(toolDef, args || {});
        if (!validation.valid) {
            return sendError(
                res,
                ERROR_CODES.TOOL_VALIDATION_ERROR,
                validation.error,
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const startTime = Date.now();
        const result = await session.client.callTool(tool, args || {});
        const executionTime = Date.now() - startTime;

        sendSuccess(res, {
            toolName: tool,
            result: transformToolResult(result),
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
                'Tool execution timed out',
                HTTP_STATUS.GATEWAY_TIMEOUT
            );
        }

        if (err.status) {
            return sendError(
                res,
                ERROR_CODES.MCP_ERROR,
                `Tool execution failed: ${err.message}`,
                HTTP_STATUS.BAD_GATEWAY,
                { status: err.status }
            );
        }

        handleUnknownError(res, err);
    }
}