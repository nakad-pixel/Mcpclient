/**
 * API Route Handler - Main entry point for all API routes
 * Routes requests to appropriate handlers based on path
 */

// Import LLM handlers
import llmKeysHandler from './handlers/llm-keys.js';
import llmServicesHandler from './handlers/llm-services.js';
import llmKeyGetHandler from './handlers/llm-key-get.js';

// Import MCP handlers
import mcpCallHandler from './handlers/mcp-call.js';
import mcpConnectHandler from './handlers/mcp-connect.js';
import mcpDisconnectHandler from './handlers/mcp-disconnect.js';
import mcpToolsHandler from './handlers/mcp-tools.js';

// Import Council handlers
import councilConsensusHandler from './handlers/council-consensus.js';
import councilRouterHandler from './handlers/council-router.js';

// Import Health handler
import healthHandler from './handlers/health.js';

// CORS middleware
import { corsMiddleware } from './handlers/utils.js';

// Main API route handler
export default async function handler(req, res) {
    // Apply CORS middleware first
    if (corsMiddleware(req, res)) return;

    // Parse the URL to get the path
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    try {
        // Route LLM API key management requests
        if (path === '/api/llm/key') {
            if (req.method === 'POST' || req.method === 'DELETE') {
                return await llmKeysHandler(req, res);
            }
        }

        if (path === '/api/llm/services') {
            return await llmServicesHandler(req, res);
        }

        if (path === '/api/llm/key' && req.method === 'GET') {
            return await llmKeyGetHandler(req, res);
        }

        // Route MCP proxy requests
        if (path === '/api/mcp/call') {
            return await mcpCallHandler(req, res);
        }

        if (path === '/api/mcp/connect') {
            return await mcpConnectHandler(req, res);
        }

        if (path === '/api/mcp/disconnect') {
            return await mcpDisconnectHandler(req, res);
        }

        if (path === '/api/mcp/tools') {
            return await mcpToolsHandler(req, res);
        }

        // Route LLM Council requests
        if (path === '/api/council/consensus') {
            return await councilConsensusHandler(req, res);
        }

        if (path === '/api/council') {
            return await councilRouterHandler(req, res);
        }

        // Health check endpoint
        if (path === '/api/health') {
            return await healthHandler(req, res);
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