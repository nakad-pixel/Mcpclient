/**
 * MCP Client Utilities
 * Consolidated MCP client functionality for serverless functions
 */

import { TIMEOUTS } from './9-core-utils.js';

function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class MCPClient {
    constructor(serverUrl, headers = {}) {
        this.serverUrl = serverUrl;
        this.headers = headers;
    }

    async call(method, params = {}) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUTS.MCP_CALL);

        try {
            const body = {
                jsonrpc: '2.0',
                id: generateRequestId(),
                method,
                params
            };

            const requestHeaders = {
                'Content-Type': 'application/json',
                ...this.headers
            };

            // Debug logging for MCP requests
            console.log(`[MCP Client] Making ${method} request to:`, this.serverUrl);
            console.log(`[MCP Client] Request headers:`, JSON.stringify(requestHeaders, null, 2));
            console.log(`[MCP Client] Request body:`, JSON.stringify(body, null, 2));

            const response = await fetch(this.serverUrl, {
                method: 'POST',
                headers: requestHeaders,
                body: JSON.stringify(body),
                signal: controller.signal
            });

            // Log response details
            console.log(`[MCP Client] Response status:`, response.status, response.statusText);
            console.log(`[MCP Client] Response headers:`, Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const text = await response.text().catch(() => null);
                console.log(`[MCP Client] Error response body:`, text);

                const error = new Error(`MCP call failed: ${response.status} ${response.statusText}`);
                error.status = response.status;
                error.body = text;

                // Additional debug for 401 errors
                if (response.status === 401) {
                    console.error(`[MCP Client] 401 Unauthorized - Server rejected the request`);
                    console.error(`[MCP Client] URL: ${this.serverUrl}`);
                    console.error(`[MCP Client] Headers sent:`, JSON.stringify(requestHeaders, null, 2));
                    console.error(`[MCP Client] Request method: POST`);
                    console.error(`[MCP Client] Request body:`, JSON.stringify(body, null, 2));
                    console.error(`[MCP Client] Troubleshooting:`);
                    console.error(`[MCP Client]   - If server doesn't require auth, headers should be empty object {}`);
                    console.error(`[MCP Client]   - If server requires auth, check Authorization header format`);
                    console.error(`[MCP Client]   - Some servers reject unexpected headers like User-Agent or Accept`);
                }

                throw error;
            }

            // Get response text first to check if it's JSON or HTML
            const responseText = await response.text();
            
            // Check if response is HTML (likely an error page)
            if (responseText.trim().startsWith('<') || responseText.startsWith('The page')) {
                const error = new Error('Server returned HTML instead of JSON');
                error.isHtmlResponse = true;
                error.status = response.status;
                error.body = responseText.substring(0, 200); // First 200 chars for debugging
                
                // Provide specific suggestions based on HTTP status code
                let suggestion = 'Check that the MCP server URL is correct and supports CORS requests.';
                let detailedMessage = '';
                
                switch (response.status) {
                    case 401:
                        suggestion = 'The server requires authentication. Check if you need to provide API keys or authentication headers.';
                        detailedMessage = '401 Unauthorized: Server requires authentication.';
                        break;
                    case 403:
                        suggestion = 'Access forbidden. The server may be blocking requests from this domain or IP.';
                        detailedMessage = '403 Forbidden: Access to the server is restricted.';
                        break;
                    case 404:
                        suggestion = 'Server URL not found. Check that the URL is correct and the strata_id is valid.';
                        detailedMessage = '404 Not Found: The server URL or resource does not exist.';
                        break;
                    case 500:
                    case 502:
                    case 503:
                    case 504:
                        suggestion = 'Server error. The MCP server may be temporarily unavailable.';
                        detailedMessage = `${response.status} Server Error: The server is currently unavailable.`;
                        break;
                    default:
                        suggestion = 'Check the server URL, CORS configuration, and network connectivity.';
                        detailedMessage = `${response.status} Error: Server returned HTML instead of JSON.`;
                }
                
                error.suggestion = suggestion;
                error.detailedMessage = detailedMessage;
                error.responsePreview = responseText.substring(0, 200);
                
                // Log detailed error information for debugging
                console.error(`MCP Client Error - Status: ${response.status}`, {
                    url: this.serverUrl,
                    status: response.status,
                    responsePreview: responseText.substring(0, 200),
                    suggestion: suggestion,
                    detailedMessage: detailedMessage
                });
                
                throw error;
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                const error = new Error(`Invalid JSON response: ${parseError.message}`);
                error.status = response.status;
                error.body = responseText.substring(0, 200);
                error.suggestion = 'The server may be returning an error page. Verify the URL and server status.';
                throw error;
            }

            if (data.error) {
                const err = new Error(data.error.message || 'MCP error');
                err.mcpError = data.error;
                throw err;
            }

            return data.result;
        } catch (err) {
            if (err.name === 'AbortError') {
                const timeoutError = new Error('MCP call timed out');
                timeoutError.code = 'TIMEOUT';
                throw timeoutError;
            }
            throw err;
        } finally {
            clearTimeout(timeout);
        }
    }

    async initialize() {
        return this.call('initialize', {});
    }

    async listTools() {
        return this.call('tools/list', {});
    }

    async callTool(name, args) {
        return this.call('tools/call', {
            name,
            arguments: args || {}
        });
    }
}