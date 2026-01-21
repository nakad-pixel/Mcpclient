/**
 * Health Check Handler - GET /api/health
 * Returns service health status
 */

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
        const healthInfo = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '1.0.0',
            endpoints: [
                'GET /api/health',
                'POST /api/llm/key',
                'DELETE /api/llm/key',
                'GET /api/llm/services',
                'GET /api/llm/key',
                'POST /api/mcp/call',
                'POST /api/mcp/connect',
                'POST /api/mcp/disconnect',
                'GET /api/mcp/tools',
                'POST /api/council/consensus',
                'GET /api/council',
                'GET /api/council/model-router'
            ]
        };

        sendSuccess(res, healthInfo);
    } catch (err) {
        sendError(
            res,
            ERROR_CODES.INTERNAL_ERROR,
            'Health check failed',
            HTTP_STATUS.INTERNAL_ERROR,
            { error: err.message }
        );
    }
}