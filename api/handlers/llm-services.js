/**
 * LLM Services Handler - GET /api/llm/services
 * Returns list of configured LLM services (metadata only, no keys)
 */

import { globalSessionManager } from './session-manager.js';
import { corsMiddleware, sendSuccess, sendError, ERROR_CODES, HTTP_STATUS } from './utils.js';

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

    try {
        const services = globalSessionManager.getAllLLMServices();
        
        sendSuccess(res, {
            services: services,
            count: services.length
        });
    } catch (err) {
        console.error('LLM Services Handler Error:', err);
        return sendError(
            res,
            ERROR_CODES.INTERNAL_ERROR,
            'Internal server error',
            HTTP_STATUS.INTERNAL_ERROR,
            { message: err.message }
        );
    }
}