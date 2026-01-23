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

            const response = await fetch(this.serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.headers
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });

            if (!response.ok) {
                const text = await response.text().catch(() => null);
                const error = new Error(`MCP call failed: ${response.status} ${response.statusText}`);
                error.status = response.status;
                error.body = text;
                throw error;
            }

            // Get response text first to check if it's JSON or HTML
            const responseText = await response.text();
            
            // Check if response is HTML (likely an error page)
            if (responseText.trim().startsWith('<') || responseText.startsWith('The page')) {
                const error = new Error('Server returned HTML instead of JSON. This may be a CORS error, incorrect URL, or server issue.');
                error.isHtmlResponse = true;
                error.status = response.status;
                error.body = responseText.substring(0, 200); // First 200 chars for debugging
                error.suggestion = 'Check that the MCP server URL is correct and supports CORS requests.';
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