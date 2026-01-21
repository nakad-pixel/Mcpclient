/**
 * LLM Key Get Handler - GET /api/llm/key
 * Returns a specific LLM API key (internal use only)
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
        const url = new URL(req.url, `http://${req.headers.host}`);
        const serviceName = url.searchParams.get('service');
        
        if (!serviceName) {
            return sendError(
                res,
                ERROR_CODES.INVALID_REQUEST,
                'Service name required',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const apiKey = globalSessionManager.getLLMKey(serviceName);
        
        if (!apiKey) {
            return sendError(
                res,
                ERROR_CODES.INVALID_REQUEST,
                `No API key found for "${serviceName}"`,
                HTTP_STATUS.NOT_FOUND
            );
        }

        sendSuccess(res, {
            service: serviceName,
            apiKey: apiKey
        });
    } catch (err) {
        console.error('LLM Key Get Handler Error:', err);
        return sendError(
            res,
            ERROR_CODES.INTERNAL_ERROR,
            'Internal server error',
            HTTP_STATUS.INTERNAL_ERROR,
            { message: err.message }
        );
    }
}