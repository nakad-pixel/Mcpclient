/**
 * API Route Handler - Main entry point for all API routes
 * Routes requests to appropriate handlers based on path
 */

import { handleLLMRequest } from './routes/llmRoutes.js';

// Import MCP handlers
import callHandler from './mcp/call.js';
import connectHandler from './mcp/connect.js';
import disconnectHandler from './mcp/disconnect.js';
import toolsHandler from './mcp/tools.js';
import consensusHandler from './council/consensus.js';

// CORS middleware
import { corsMiddleware } from './utils/cors.js';

// Main API route handler
export default async function handler(req, res) {
    // Apply CORS middleware first
    if (corsMiddleware(req, res)) return;

    // Parse the URL to get the path
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    try {
        // Route LLM API key management requests
        if (path.startsWith('/api/llm/')) {
            return await handleLLMRequest(req, res);
        }

        // Route MCP proxy requests
        if (path === '/api/mcp/call') {
            return await callHandler(req, res);
        }

        if (path === '/api/mcp/connect') {
            return await connectHandler(req, res);
        }

        if (path === '/api/mcp/disconnect') {
            return await disconnectHandler(req, res);
        }

        if (path === '/api/mcp/tools') {
            return await toolsHandler(req, res);
        }

        // Route LLM Council consensus requests
        if (path === '/api/council/consensus') {
            return await consensusHandler(req, res);
        }

        // If no route matches, return 404
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            error: {
                code: 'NOT_FOUND',
                message: 'API endpoint not found',
                path: path
            }
        }));

    } catch (err) {
        console.error('API Handler Error:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Internal server error',
                details: err.message
            }
        }));
    }
}