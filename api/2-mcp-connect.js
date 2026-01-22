/**
 * MCP Connect Handler - POST /api/mcp/connect
 * Establishes connection to MCP server and creates session
 */

import { globalSessionManager } from './8-session-utils.js';
import { readJsonBody, corsMiddleware, isValidHttpUrl, isHttpsUrl, isLocalhostUrl, sendSuccess, sendError, handleUnknownError, ERROR_CODES, HTTP_STATUS } from './9-core-utils.js';

export default async function handler(req, res) {
    if (corsMiddleware(req, res)) return;

    if (req.method !== 'POST') {
        return sendError(
            res,
            ERROR_CODES.INVALID_REQUEST,
            'Method not allowed',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    try {
        const body = await readJsonBody(req);
        const { serverId, serverUrl, headers } = body;

        if (!serverId || typeof serverId !== 'string') {
            return sendError(
                res,
                ERROR_CODES.INVALID_REQUEST,
                'serverId is required and must be a string',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        if (!serverUrl || typeof serverUrl !== 'string') {
            return sendError(
                res,
                ERROR_CODES.INVALID_REQUEST,
                'serverUrl is required and must be a string',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        if (!isValidHttpUrl(serverUrl)) {
            return sendError(
                res,
                ERROR_CODES.INVALID_REQUEST,
                'serverUrl must be a valid HTTP/HTTPS URL',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        if (!isHttpsUrl(serverUrl) && !isLocalhostUrl(serverUrl)) {
            return sendError(
                res,
                ERROR_CODES.INVALID_REQUEST,
                'serverUrl must use HTTPS (localhost exceptions allowed)',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const mcpHeaders = headers && typeof headers === 'object' ? headers : {};

        const session = await globalSessionManager.createSession(serverId, serverUrl, mcpHeaders);

        sendSuccess(res, {
            sessionId: session.sessionId,
            capabilities: session.capabilities,
            serverInfo: session.serverInfo,
            toolCount: session.tools.length
        });
    } catch (err) {
        if (err.code === 'INVALID_JSON') {
            return sendError(
                res,
                ERROR_CODES.INVALID_REQUEST,
                `Invalid response from server: ${err.message}. This may indicate a CORS issue or incorrect URL.`,
                HTTP_STATUS.BAD_REQUEST,
                { suggestion: 'Check that the MCP server URL is correct and returns JSON responses.' }
            );
        }

        if (err.code === 'TIMEOUT') {
            return sendError(
                res,
                ERROR_CODES.TIMEOUT,
                'Connection to MCP server timed out. The server may be slow or unavailable.',
                HTTP_STATUS.GATEWAY_TIMEOUT,
                { url: req.body?.serverUrl }
            );
        }

        if (err.status) {
            // Check if this is an HTML response error
            if (err.isHtmlResponse) {
                return sendError(
                    res,
                    ERROR_CODES.MCP_ERROR,
                    `Connection failed: Server returned HTML instead of JSON. This indicates either a CORS issue or incorrect URL. Check that:\n• The MCP server URL is correct\n• The server supports CORS requests\n• The strata_id parameter is valid`,
                    HTTP_STATUS.BAD_GATEWAY,
                    { 
                        status: err.status, 
                        body: err.body,
                        suggestion: err.suggestion,
                        isHtmlResponse: true
                    }
                );
            }
            
            return sendError(
                res,
                ERROR_CODES.MCP_ERROR,
                `Failed to connect to MCP server: ${err.message}`,
                HTTP_STATUS.BAD_GATEWAY,
                { status: err.status, body: err.body }
            );
        }

        handleUnknownError(res, err);
    }
}