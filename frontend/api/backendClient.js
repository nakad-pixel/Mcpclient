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

            const data = await response.json();

            if (!data.success) {
                const error = data.error;
                const err = new Error(`${error.code}: ${error.message}`);
                err.code = error.code;
                err.details = error.details;
                throw err;
            }

            return data.data;
        } catch (err) {
            if (err.code) {
                throw err;
            }

            const networkError = new Error(`Network error: ${err.message}`);
            networkError.code = 'NETWORK_ERROR';
            throw networkError;
        }
    }
}
