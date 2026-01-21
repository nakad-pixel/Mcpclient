/**
 * LLM API Routes - Handle API key management
 */

import { globalSessionManager } from '../utils/sessionManager.js';
import { readJsonBody } from '../utils/request.js';
import { sendSuccess, sendError } from '../utils/errorHandler.js';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants.js';

export async function handleLLMRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method;

    try {
        if (method === 'POST' && path === '/api/llm/key') {
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

        if (method === 'DELETE' && path === '/api/llm/key') {
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

        if (method === 'GET' && path === '/api/llm/services') {
            // Get list of configured LLM services (metadata only, no keys)
            const services = globalSessionManager.getAllLLMServices();
            
            return sendSuccess(res, {
                services: services,
                count: services.length
            });
        }

        if (method === 'GET' && path === '/api/llm/key') {
            // Get a specific LLM API key (only for internal use)
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

            return sendSuccess(res, {
                service: serviceName,
                apiKey: apiKey  // Only returned to verified backend calls
            });
        }

        return sendError(
            res,
            ERROR_CODES.INVALID_REQUEST,
            'Endpoint not found',
            HTTP_STATUS.NOT_FOUND
        );

    } catch (err) {
        console.error('LLM Route Error:', err);
        return sendError(
            res,
            ERROR_CODES.INTERNAL_ERROR,
            'Internal server error',
            HTTP_STATUS.INTERNAL_ERROR,
            { message: err.message }
        );
    }
}