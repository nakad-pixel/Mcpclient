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
                { 
                    suggestion: 'Check that the MCP server URL is correct and returns JSON responses.',
                    status: err.status,
                    responsePreview: err.body
                }
            );
        }

        if (err.code === 'TIMEOUT') {
            return sendError(
                res,
                ERROR_CODES.TIMEOUT,
                'Connection to MCP server timed out. The server may be slow or unavailable.',
                HTTP_STATUS.GATEWAY_TIMEOUT,
                { 
                    url: req.body?.serverUrl,
                    suggestion: 'Check your network connection and try again. If the issue persists, the server may be down.'
                }
            );
        }

        if (err.status) {
            // Check if this is an HTML response error
            if (err.isHtmlResponse) {
                // Provide detailed error message based on HTTP status code
                let errorMessage = err.detailedMessage || `Connection failed: Server returned HTML instead of JSON`;
                let suggestion = err.suggestion || 'Check that the MCP server URL is correct and supports CORS requests.';
                
                // Add specific troubleshooting steps for common issues
                let troubleshooting = [];
                switch (err.status) {
                    case 401:
                        troubleshooting = [
                            '• Verify if the server requires authentication headers',
                            '• Check if you need to provide API keys or tokens',
                            '• Contact the server administrator for access credentials'
                        ];
                        break;
                    case 403:
                        troubleshooting = [
                            '• The server may be blocking requests from this domain',
                            '• Try accessing the URL directly in your browser to verify',
                            '• Contact the server administrator for access permissions'
                        ];
                        break;
                    case 404:
                        troubleshooting = [
                            '• Verify the server URL is correct',
                            '• Check that the strata_id parameter is valid and not expired',
                            '• Try accessing the URL directly in your browser'
                        ];
                        break;
                    case 500:
                    case 502:
                    case 503:
                    case 504:
                        troubleshooting = [
                            '• The server may be temporarily unavailable',
                            '• Try again later',
                            '• Contact the server administrator if the issue persists'
                        ];
                        break;
                    default:
                        troubleshooting = [
                            '• Check the server URL is correct',
                            '• Verify CORS configuration on the server',
                            '• Test the URL directly in your browser'
                        ];
                }
                
                return sendError(
                    res,
                    ERROR_CODES.MCP_ERROR,
                    errorMessage,
                    HTTP_STATUS.BAD_GATEWAY,
                    { 
                        status: err.status, 
                        responsePreview: err.responsePreview,
                        suggestion: suggestion,
                        troubleshooting: troubleshooting,
                        isHtmlResponse: true,
                        serverUrl: req.body?.serverUrl
                    }
                );
            }
             
            return sendError(
                res,
                ERROR_CODES.MCP_ERROR,
                `Failed to connect to MCP server: ${err.message}`,
                HTTP_STATUS.BAD_GATEWAY,
                { 
                    status: err.status, 
                    body: err.body,
                    suggestion: 'Check the server URL and try again.'
                }
            );
        }

        handleUnknownError(res, err);
    }
}