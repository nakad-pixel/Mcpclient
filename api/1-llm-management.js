/**
 * LLM Management Handler - All /api/llm/* endpoints
 * Handles POST/DELETE/GET /api/llm/key and GET /api/llm/services
 */

import { globalSessionManager } from './8-session-utils.js';
import { readJsonBody, corsMiddleware, sendSuccess, sendError, ERROR_CODES, HTTP_STATUS } from './9-core-utils.js';

export default async function handler(req, res) {
    if (corsMiddleware(req, res)) return;

    // Parse the URL to get the path
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    try {
        // Route LLM API key management requests
        if (path === '/api/llm/key') {
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

            if (req.method === 'GET') {
                // Get an LLM API key (for verification, returns metadata)
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

                const hasKey = globalSessionManager.hasLLMKey(serviceName);
                
                return sendSuccess(res, {
                    service: serviceName,
                    hasKey: hasKey,
                    ...(hasKey && {
                        message: 'Key exists (metadata only, key not returned)'
                    })
                });
            }
        }

        if (path === '/api/llm/services') {
            if (req.method !== 'GET') {
                return sendError(
                    res,
                    ERROR_CODES.INVALID_REQUEST,
                    'Method not allowed',
                    HTTP_STATUS.BAD_REQUEST
                );
            }

            const services = globalSessionManager.getAllLLMServices();
            
            return sendSuccess(res, {
                services: services,
                count: services.length
            });
        }

        return sendError(
            res,
            ERROR_CODES.INVALID_REQUEST,
            'Invalid endpoint',
            HTTP_STATUS.NOT_FOUND
        );

    } catch (err) {
        console.error('LLM Management Handler Error:', err);
        return sendError(
            res,
            ERROR_CODES.INTERNAL_ERROR,
            'Internal server error',
            HTTP_STATUS.INTERNAL_ERROR,
            { message: err.message }
        );
    }
}