/**
 * Main API Router - Unified serverless function entry point
 * Routes all /api/* requests to appropriate handlers
 * Ensures ALL responses are JSON (never HTML)
 */

import llmManagementHandler from '../server/1-llm-management.js';
import mcpConnectHandler from '../server/2-mcp-connect.js';
import mcpCallHandler from '../server/3-mcp-call.js';
import mcpDisconnectHandler from '../server/4-mcp-disconnect.js';
import mcpToolsHandler from '../server/5-mcp-tools.js';
import councilConsensusHandler from '../server/6-council-consensus.js';
import councilRoutingHandler from '../server/7-council-routing.js';
import healthCheckHandler from '../server/11-index.js';

import { corsMiddleware, sendError, ERROR_CODES, HTTP_STATUS } from '../server/9-core-utils.js';

function getBaseUrl(req) {
    return `http://${req.headers.host || 'localhost'}`;
}

function normalizeUrlForDownstreamHandlers(req) {
    const base = getBaseUrl(req);
    const incomingUrl = new URL(req.url, base);

    // When Vercel routes all /api/* to this function, it may rewrite the URL to:
    //   /api/index?__path=mcp/connect
    // Normalize it back to the original path so existing handlers (which parse req.url)
    // behave exactly as before.
    if (incomingUrl.pathname === '/api/index' || incomingUrl.pathname === '/api/index.js') {
        const params = new URLSearchParams(incomingUrl.searchParams);
        const pathOverride = params.get('__path') || '';
        params.delete('__path');

        const normalizedPath = pathOverride ? `/api/${pathOverride.replace(/^\/+/, '')}` : '/api';
        const search = params.toString();
        req.url = `${normalizedPath}${search ? `?${search}` : ''}`;

        return new URL(req.url, base);
    }

    return incomingUrl;
}

export default async function handler(req, res) {
    if (corsMiddleware(req, res)) return;

    const url = normalizeUrlForDownstreamHandlers(req);
    const path = url.pathname;
    const method = req.method;

    try {
        // LLM Management Routes
        if (path === '/api/llm/key' || path === '/api/llm/services') {
            return await llmManagementHandler(req, res);
        }

        // MCP Routes
        if (path === '/api/mcp/connect') {
            return await mcpConnectHandler(req, res);
        }

        if (path === '/api/mcp/call') {
            return await mcpCallHandler(req, res);
        }

        if (path === '/api/mcp/disconnect') {
            return await mcpDisconnectHandler(req, res);
        }

        if (path === '/api/mcp/tools') {
            return await mcpToolsHandler(req, res);
        }

        // Council Routes
        if (path === '/api/council/consensus') {
            return await councilConsensusHandler(req, res);
        }

        if (path === '/api/council') {
            return await councilRoutingHandler(req, res);
        }

        // Health + API Info
        if (path === '/api/health' || path === '/api' || path === '/api/') {
            return await healthCheckHandler(req, res);
        }

        return sendError(
            res,
            ERROR_CODES.INVALID_REQUEST,
            'API endpoint not found',
            HTTP_STATUS.NOT_FOUND,
            {
                path,
                method
            }
        );
    } catch (err) {
        console.error('API Router Error:', err);
        return sendError(
            res,
            ERROR_CODES.INTERNAL_ERROR,
            'Internal server error in API router',
            HTTP_STATUS.INTERNAL_ERROR,
            {
                message: err.message,
                path,
                method
            }
        );
    }
}
