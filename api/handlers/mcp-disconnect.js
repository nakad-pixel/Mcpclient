import { globalSessionManager } from './session-manager.js';
import { readJsonBody, corsMiddleware, sendSuccess, sendError, ERROR_CODES, HTTP_STATUS } from './utils.js';

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
        const { sessionId } = body;

        if (!sessionId || typeof sessionId !== 'string') {
            return sendError(
                res,
                ERROR_CODES.INVALID_REQUEST,
                'sessionId is required and must be a string',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        globalSessionManager.closeSession(sessionId);

        sendSuccess(res, { message: 'Session closed' });
    } catch {
        sendSuccess(res, { message: 'Session closed' });
    }
}