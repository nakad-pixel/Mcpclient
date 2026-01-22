export class BackendClient {
    constructor(backendBaseUrl) {
        this.baseUrl = backendBaseUrl || '/api';
    }

    async connectMCP(serverId, serverUrl, headers) {
        return this.post('/mcp/connect', { serverId, serverUrl, headers });
    }

    async getMCPTools(sessionId) {
        return this.post('/mcp/tools', { sessionId });
    }

    async callMCPTool(sessionId, tool, args) {
        return this.post('/mcp/call', { sessionId, tool, args });
    }

    async disconnectMCP(sessionId) {
        return this.post('/mcp/disconnect', { sessionId });
    }

    async getConsensus(sessionId, prompt, models, temperature, maxTokens) {
        return this.post('/council/consensus', {
            sessionId,
            prompt,
            models,
            temperature,
            maxTokens
        });
    }

    async post(path, body) {
        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            // Handle non-JSON responses (like HTML error pages)
            const responseText = await response.text();
            
            if (!responseText.trim()) {
                throw new Error(`Server returned empty response (${response.status})`);
            }
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                // Check if response is HTML
                if (responseText.trim().startsWith('<') || responseText.startsWith('The page')) {
                    const error = new Error(`Server returned HTML instead of JSON. This may be a CORS issue or server error.`);
                    error.isHtmlResponse = true;
                    error.status = response.status;
                    error.body = responseText.substring(0, 200);
                    throw error;
                }
                throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
            }

            if (!data.success) {
                const error = data.error;
                const err = new Error(`${error.code}: ${error.message}`);
                err.code = error.code;
                err.details = error.details;
                err.suggestion = error.suggestion;
                err.isHtmlResponse = error.isHtmlResponse;
                throw err;
            }

            return data.data;
        } catch (err) {
            if (err.code) {
                throw err;
            }

            const networkError = new Error(`${err.message}`);
            networkError.code = 'NETWORK_ERROR';
            networkError.isHtmlResponse = err.isHtmlResponse;
            networkError.status = err.status;
            throw networkError;
        }
    }
}
