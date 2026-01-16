import { BackendClient } from '../api/backendClient.js';

export class MCPClient {
    constructor() {
        this.backendClient = new BackendClient();
        this.servers = [];
        this.sessionIds = new Map();
    }

    registerServer(serverConfig) {
        const id = serverConfig.id || crypto.randomUUID();
        const server = {
            ...serverConfig,
            id,
            status: 'disconnected',
            statusMessage: null,
            tools: []
        };
        this.servers.push(server);
        return server;
    }

    removeServer(serverId) {
        const sessionId = this.sessionIds.get(serverId);
        if (sessionId) {
            this.backendClient.disconnectMCP(sessionId).catch(() => {});
            this.sessionIds.delete(serverId);
        }
        this.servers = this.servers.filter(s => s.id !== serverId);
    }

    getSessionId(serverId) {
        return this.sessionIds.get(serverId) || null;
    }

    async connect(serverId) {
        const server = this.servers.find(s => s.id === serverId);
        if (!server) throw new Error('Server not found');

        server.status = 'connecting';
        server.statusMessage = null;

        const headers = server.headers && typeof server.headers === 'object' ? server.headers : {};
        const result = await this.backendClient.connectMCP(serverId, server.url, headers);
        this.sessionIds.set(serverId, result.sessionId);
        server.status = 'connected';
        return result.sessionId;
    }

    async refreshTools(serverId) {
        const server = this.servers.find(s => s.id === serverId);
        if (!server) return;

        try {
            let sessionId = this.sessionIds.get(serverId);

            if (!sessionId) {
                sessionId = await this.connect(serverId);
            }

            const toolsResult = await this.backendClient.getMCPTools(sessionId);
            server.tools = toolsResult.tools || [];
            server.status = 'connected';
            server.statusMessage = null;
        } catch (err) {
            server.status = 'error';
            server.statusMessage = err.message;

            if (err.code === 'SESSION_NOT_FOUND') {
                this.sessionIds.delete(serverId);
            }

            throw err;
        }
    }

    listServers() {
        return this.servers;
    }

    getAllTools() {
        return this.servers.flatMap(s => s.tools.map(t => ({ ...t, serverId: s.id })));
    }

    async callTool(serverId, toolName, args) {
        const sessionId = this.sessionIds.get(serverId);
        if (!sessionId) {
            throw new Error('No active session. Please connect to the server.');
        }

        return this.backendClient.callMCPTool(sessionId, toolName, args);
    }

    async testConnection(url, headers) {
        const testId = `test_${Date.now()}`;
        const result = await this.backendClient.connectMCP(testId, url, headers || {});
        await this.backendClient.disconnectMCP(result.sessionId).catch(() => {});
        return true;
    }
}
