export class MCPClient {
    constructor() {
        this.servers = [];
    }

    registerServer(serverConfig) {
        const id = serverConfig.id || crypto.randomUUID();
        const server = { 
            ...serverConfig, 
            id, 
            status: 'disconnected',
            tools: [] 
        };
        this.servers.push(server);
        return server;
    }

    removeServer(serverId) {
        this.servers = this.servers.filter(s => s.id !== serverId);
    }

    async refreshTools(serverId) {
        const server = this.servers.find(s => s.id === serverId);
        if (!server) return;

        try {
            const response = await fetch(`${server.url}/tools`, {
                headers: server.auth ? { 'Authorization': server.auth } : {}
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            server.tools = data.tools || [];
            server.status = 'connected';
        } catch (e) {
            console.error(`Failed to refresh tools for ${server.name}`, e);
            server.status = 'error';
            throw e;
        }
    }

    listServers() {
        return this.servers;
    }

    getAllTools() {
        return this.servers.flatMap(s => s.tools.map(t => ({ ...t, serverId: s.id })));
    }

    async executeToolCall(toolCall, serverId) {
        const server = this.servers.find(s => s.id === serverId);
        if (!server) throw new Error(`Server ${serverId} not found`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(`${server.url}/tool/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(server.auth ? { 'Authorization': server.auth } : {})
                },
                body: JSON.stringify({
                    tool_name: toolCall.name,
                    arguments: toolCall.input
                }),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (e) {
            clearTimeout(timeout);
            if (e.name === 'AbortError') throw new Error('Tool execution timed out');
            throw e;
        }
    }

    async testConnection(url, auth) {
        try {
            const response = await fetch(`${url}/tools`, {
                headers: auth ? { 'Authorization': auth } : {}
            });
            return response.ok;
        } catch (e) {
            return false;
        }
    }
}
