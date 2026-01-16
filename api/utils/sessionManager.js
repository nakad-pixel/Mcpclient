import { MCPClient } from './mcpClient.js';
import { TIMEOUTS } from './constants.js';

function createSessionId(serverId) {
    return `sess_${serverId}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class SessionManager {
    constructor() {
        this.sessions = new Map();
    }

    async createSession(serverId, serverUrl, headers) {
        const sessionId = createSessionId(serverId);
        const client = new MCPClient(serverUrl, headers);

        try {
            const initResult = await client.initialize();
            const toolsResult = await client.listTools();

            const session = {
                sessionId,
                serverId,
                serverUrl,
                headers,
                client,
                tools: toolsResult.tools || [],
                capabilities: initResult.capabilities || {},
                serverInfo: initResult.serverInfo || {},
                timestamp: Date.now()
            };

            this.sessions.set(sessionId, session);
            return session;
        } catch (err) {
            throw err;
        }
    }

    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        
        if (!session) {
            const error = new Error('Session not found or expired');
            error.code = 'SESSION_NOT_FOUND';
            throw error;
        }

        if (Date.now() - session.timestamp > TIMEOUTS.SESSION_EXPIRY) {
            this.sessions.delete(sessionId);
            const error = new Error('Session expired');
            error.code = 'SESSION_NOT_FOUND';
            throw error;
        }

        session.timestamp = Date.now();
        return session;
    }

    closeSession(sessionId) {
        this.sessions.delete(sessionId);
    }

    invalidateTools(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.tools = [];
        }
    }

    listActiveSessions() {
        return Array.from(this.sessions.values()).map(s => ({
            sessionId: s.sessionId,
            serverId: s.serverId,
            serverUrl: s.serverUrl,
            toolCount: s.tools.length,
            timestamp: s.timestamp
        }));
    }
}

export const globalSessionManager = new SessionManager();
