/**
 * Main API Index Handler - Main router and health check
 * Provides API information and handles any unmatched routes
 */

import { corsMiddleware, sendSuccess, sendError, ERROR_CODES, HTTP_STATUS } from './9-core-utils.js';

export default async function handler(req, res) {
    if (corsMiddleware(req, res)) return;

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    try {
        // Health check endpoint
        if (path === '/api/health' || path === '/api') {
            return sendSuccess(res, {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '2.0.0',
                endpoints: {
                    llm: {
                        'POST /api/llm/key': 'Save LLM API key',
                        'DELETE /api/llm/key': 'Remove LLM API key',
                        'GET /api/llm/key': 'Check LLM API key',
                        'GET /api/llm/services': 'List configured LLM services'
                    },
                    mcp: {
                        'POST /api/mcp/connect': 'Connect to MCP server',
                        'POST /api/mcp/call': 'Execute MCP tool',
                        'POST /api/mcp/disconnect': 'Disconnect MCP session',
                        'GET /api/mcp/tools': 'List MCP tools'
                    },
                    council: {
                        'POST /api/council/consensus': 'LLM Council consensus',
                        'GET /api/council': 'Council information'
                    }
                },
                functions: [
                    '1-llm-management.js',
                    '2-mcp-connect.js',
                    '3-mcp-call.js',
                    '4-mcp-disconnect.js',
                    '5-mcp-tools.js',
                    '6-council-consensus.js',
                    '7-council-routing.js',
                    '8-session-utils.js',
                    '9-core-utils.js',
                    '10-mcp-client.js',
                    '11-index.js'
                ]
            });
        }

        // If no route matches, return 404
        return sendError(
            res,
            ERROR_CODES.INVALID_REQUEST,
            'API endpoint not found',
            HTTP_STATUS.NOT_FOUND,
            { path: path }
        );

    } catch (err) {
        console.error('API Index Handler Error:', err);
        return sendError(
            res,
            ERROR_CODES.INTERNAL_ERROR,
            'Internal server error',
            HTTP_STATUS.INTERNAL_ERROR,
            { message: err.message }
        );
    }
}