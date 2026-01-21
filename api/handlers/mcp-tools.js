import { globalSessionManager } from './session-manager.js';
import { corsMiddleware, sendSuccess, sendError, handleUnknownError, ERROR_CODES, HTTP_STATUS } from './utils.js';

export default async function handler(req, res) {
    if (corsMiddleware(req, res)) return;

    if (req.method !== 'GET') {
        return sendError(
            res,
            ERROR_CODES.INVALID_REQUEST,
            'Method not allowed - GET required',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const sessionId = url.searchParams.get('sessionId');

        if (!sessionId || typeof sessionId !== 'string') {
            return sendError(
                res,
                ERROR_CODES.INVALID_REQUEST,
                'sessionId query parameter is required and must be a string',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const session = globalSessionManager.getSession(sessionId);

        if (!session.tools || session.tools.length === 0) {
            const toolsResult = await session.client.listTools();
            session.tools = toolsResult.tools || [];
        }

        sendSuccess(res, { tools: session.tools });
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
                'MCP server timed out while listing tools',
                HTTP_STATUS.GATEWAY_TIMEOUT
            );
        }

        if (err.status) {
            return sendError(
                res,
                ERROR_CODES.MCP_ERROR,
                'MCP server error while listing tools',
                HTTP_STATUS.BAD_GATEWAY,
                { status: err.status, body: err.body }
            );
        }

        handleUnknownError(res, err);
    }
}