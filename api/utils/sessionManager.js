import { MCPClient } from './mcpClient.js';
import { TIMEOUTS } from './constants.js';

function createSessionId(serverId) {
    return `sess_${serverId}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.llmKeys = new Map(); // serviceName -> apiKey (for LLM key management)
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

    /**
     * LLM Key Management Methods
     * These methods handle in-memory storage of LLM API keys
     */

    /**
     * Save an LLM API key in memory
     * @param {string} serviceName - Name of the LLM service (e.g., "OpenRouter")
     * @param {string} apiKey - The API key
     */
    setLLMKey(serviceName, apiKey) {
        if (!serviceName || !apiKey) {
            throw new Error('Service name and API key are required');
        }
        this.llmKeys.set(serviceName.toLowerCase(), {
            name: serviceName,
            key: apiKey,
            addedAt: new Date().toISOString()
        });
    }

    /**
     * Retrieve an LLM API key
     * @param {string} serviceName - Name of the LLM service
     * @returns {string|null} The API key or null if not found
     */
    getLLMKey(serviceName) {
        const entry = this.llmKeys.get(serviceName.toLowerCase());
        return entry ? entry.key : null;
    }

    /**
     * Check if an LLM key exists
     * @param {string} serviceName - Name of the LLM service
     * @returns {boolean}
     */
    hasLLMKey(serviceName) {
        return this.llmKeys.has(serviceName.toLowerCase());
    }

    /**
     * Remove an LLM API key
     * @param {string} serviceName - Name of the LLM service
     */
    removeLLMKey(serviceName) {
        this.llmKeys.delete(serviceName.toLowerCase());
    }

    /**
     * Get all stored LLM services (names only, not keys)
     * @returns {Array<{name: string, addedAt: string}>}
     */
    getAllLLMServices() {
        return Array.from(this.llmKeys.values()).map(entry => ({
            name: entry.name,
            addedAt: entry.addedAt
        }));
    }

    /**
     * Clear all LLM keys (usually on logout/reset)
     */
    clearAllLLMKeys() {
        this.llmKeys.clear();
    }
}

export const globalSessionManager = new SessionManager();
