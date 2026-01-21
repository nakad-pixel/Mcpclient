/**
 * LLM API Keys Handler - POST/DELETE /api/llm/key
 */

import { globalSessionManager } from '../handlers/session-manager.js';
import { readJsonBody, corsMiddleware, ERROR_CODES, HTTP_STATUS, sendSuccess, sendError } from '../handlers/utils.js';

export default async function handler(req, res) {
    if (corsMiddleware(req, res)) return;

    try {
        if (req.method === 'POST') {
            // Save an LLM API key
            const body = await readJsonBody(req);
            const { serviceName, apiKey } = body;
            
            if (!serviceName || !apiKey) {
                return sendError(
                    res,
                    ERROR_CODES.INVALID_REQUEST,
                    'Service name and API key required',
                    HTTP_STATUS.BAD_REQUEST
                );
            }

            globalSessionManager.setLLMKey(serviceName, apiKey);
            
            return sendSuccess(res, {
                message: `API key for "${serviceName}" saved successfully`,
                service: serviceName
            });
        }

        if (req.method === 'DELETE') {
            // Remove an LLM API key
            const body = await readJsonBody(req);
            const { serviceName } = body;
            
            if (!serviceName) {
                return sendError(
                    res,
                    ERROR_CODES.INVALID_REQUEST,
                    'Service name required',
                    HTTP_STATUS.BAD_REQUEST
                );
            }

            globalSessionManager.removeLLMKey(serviceName);
            
            return sendSuccess(res, {
                message: `API key for "${serviceName}" removed`,
                service: serviceName
            });
        }

        return sendError(
            res,
            ERROR_CODES.INVALID_REQUEST,
            'Method not allowed for this endpoint',
            HTTP_STATUS.BAD_REQUEST
        );

    } catch (err) {
        console.error('LLM Keys Handler Error:', err);
        return sendError(
            res,
            ERROR_CODES.INTERNAL_ERROR,
            'Internal server error',
            HTTP_STATUS.INTERNAL_ERROR,
            { message: err.message }
        );
    }
}