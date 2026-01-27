import { Storage } from './storage/storage.js';
import { MCPClient } from './mcp/mcpClient.js';
import { ToolRouter } from './mcp/toolRouter.js';
import { Orchestrator } from './orchestrator.js';
import { ChatUI } from './ui/chatUI.js';
import { SidebarUI } from './ui/sidebarUI.js';
import { UploadUI } from './ui/uploadUI.js';

/**
 * SECURITY NOTICE:
 * - LLM API keys are stored ONLY in memory (this.llmKeys object)
 * - Keys are NEVER persisted to localStorage
 * - Keys are LOST on page refresh (by design for security)
 * - Backend stores keys in sessionManager (also in-memory, session-scoped)
 * - Always validate API keys server-side before use
 * - Never log or expose API keys in console/network traces
 */

class App {
    constructor() {
        this.storage = Storage;
        this.mcpClient = new MCPClient();
        this.toolRouter = new ToolRouter(this.mcpClient);
        this.orchestrator = new Orchestrator(this);

        this.chatUI = new ChatUI('chat-messages', 'chat-input', 'send-btn');
        this.sidebarUI = new SidebarUI(this);
        this.uploadUI = new UploadUI(this);

        this.councilEnabled = false;
        this.councilModels = [];
        this.activeModel = null;
        this.llmKeys = {}; // In-memory storage: { serviceName: apiKey }

        this.init();
    }

    async init() {
        console.log('Initializing MCP Client App...');

        const theme = this.storage.load(this.storage.KEYS.THEME);
        if (theme === 'dark') document.body.classList.add('dark-mode');

        const savedServers = this.storage.load(this.storage.KEYS.SERVERS) || [];
        savedServers.forEach(s => this.mcpClient.registerServer(s));

        const councilEnabled = this.storage.load(this.storage.KEYS.COUNCIL_ENABLED);
        if (councilEnabled) {
            this.councilEnabled = true;
            document.getElementById('council-mode-toggle').checked = true;
            const councilModels = this.storage.load(this.storage.KEYS.COUNCIL_MODELS) || [];
            this.councilModels = councilModels;
        }

        const activeModel = this.storage.load(this.storage.KEYS.ACTIVE_MODEL);
        if (activeModel) {
            this.activeModel = activeModel;
        }

        // Sync LLM keys from backend on startup
        await this.syncLLMKeysFromBackend();

        this.sidebarUI.renderModels();
        this.sidebarUI.renderServers();
        this.updateActiveModelDisplay();

        const history = this.storage.load(this.storage.KEYS.CHAT_HISTORY);
        if (history) this.orchestrator.loadHistory(history);

        this.mcpClient.listServers().forEach(s => {
            this.mcpClient.refreshTools(s.id).then(() => this.sidebarUI.renderServers()).catch(() => {});
        });

        this.setupAppEventListeners();

        window.app = this;
    }

    setupAppEventListeners() {
        const sendBtn = document.getElementById('send-btn');
        const chatInput = document.getElementById('chat-input');

        const handleSend = () => {
            const text = chatInput.value.trim();
            const attachments = this.uploadUI.getAttachments();
            if (text || attachments.length > 0) {
                this.orchestrator.processUserInput(text, attachments);
            }
        };

        sendBtn.onclick = handleSend;
        chatInput.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        };

        chatInput.oninput = () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = chatInput.scrollHeight + 'px';
        };

        document.getElementById('council-mode-toggle').onchange = (e) => {
            this.councilEnabled = e.target.checked;
            this.sidebarUI.renderModels();
            this.saveConfig();
        };

        document.getElementById('clear-history').onclick = () => {
            if (confirm('Clear all chat history?')) {
                this.clearAllLLMKeys(); // Clear LLM keys when clearing history
                this.storage.remove(this.storage.KEYS.CHAT_HISTORY);
                location.reload();
            }
        };

        document.getElementById('reset-app').onclick = () => {
            if (confirm('Reset everything? All servers will be deleted.')) {
                this.clearAllLLMKeys(); // Clear LLM keys on reset
                this.storage.clear();
                location.reload();
            }
        };

        document.getElementById('export-history').onclick = () => {
            const data = this.storage.exportChatHistory();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chat-history-${new Date().toISOString()}.json`;
            a.click();
        };
    }

    getActiveSessionContext() {
        const servers = this.mcpClient.listServers();
        const connected = servers.find(s => s.status === 'connected');
        if (!connected) return null;

        const sessionId = this.mcpClient.getSessionId(connected.id);
        if (!sessionId) return null;

        return { sessionId, server: connected, serverId: connected.id };
    }

    updateActiveModelDisplay() {
        const servers = this.mcpClient.listServers();
        const connected = servers.find(s => s.status === 'connected');
        if (connected) {
            document.getElementById('active-model-info').textContent = `Server: ${connected.name} (${connected.tools.length} tools)`;
        } else {
            document.getElementById('active-model-info').textContent = 'Disconnected';
        }
    }

    saveConfig() {
        this.storage.save(this.storage.KEYS.SERVERS, this.mcpClient.listServers());
        this.storage.save(this.storage.KEYS.COUNCIL_ENABLED, this.councilEnabled);
        this.storage.save(this.storage.KEYS.COUNCIL_MODELS, this.councilModels);
        this.storage.save(this.storage.KEYS.ACTIVE_MODEL, this.activeModel);
        this.storage.save(this.storage.KEYS.CHAT_HISTORY, this.orchestrator.messages);
    }

    /**
     * LLM Key Management Methods
     */

    /**
     * Sync LLM keys from backend
     */
    async syncLLMKeysFromBackend() {
        try {
            const response = await fetch('/api/llm/services');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    // Update in-memory LLM keys with backend data
                    const services = data.data.services || [];
                    services.forEach(service => {
                        // Mark that we have a service configured (but we can't get the actual key)
                        this.llmKeys[service.name.toLowerCase()] = {
                            name: service.name,
                            key: '[stored-in-backend]', // Placeholder for backend-stored keys
                            addedAt: service.addedAt
                        };
                    });
                }
            }
        } catch (err) {
            console.warn('Failed to sync LLM keys from backend:', err);
        }
    }

    /**
     * Save an LLM API key in memory
     */
    async saveLLMKey(serviceName, apiKey) {
        if (!serviceName || !apiKey) {
            throw new Error('Service name and API key are required');
        }
        // Store in memory (not localStorage for security)
        this.llmKeys[serviceName.toLowerCase()] = {
            name: serviceName,
            key: apiKey,
            addedAt: new Date().toISOString()
        };
        
        // Also send to backend
        try {
            const response = await fetch('/api/llm/key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceName,
                    apiKey
                })
            });
            
            if (!response.ok) {
                throw new Error(`Backend returned ${response.status}`);
            }
        } catch (err) {
            console.warn('Failed to sync key to backend:', err);
            // Still keep it in memory even if backend sync fails
        }
        
        // Update UI to refresh Council controls
        this.sidebarUI.renderModels();
        this.sidebarUI.renderLLMKeys();
    }

    /**
     * Get an LLM API key
     */
    getLLMKey(serviceName) {
        const entry = this.llmKeys[serviceName.toLowerCase()];
        return entry ? entry.key : null;
    }

    /**
     * Remove an LLM API key
     */
    removeLLMKey(serviceName) {
        delete this.llmKeys[serviceName.toLowerCase()];
        
        // Also notify backend
        fetch('/api/llm/key', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceName })
        }).catch(err => console.warn('Failed to sync deletion to backend:', err));
        
        // Update UI to refresh Council controls
        this.sidebarUI.renderModels();
        this.sidebarUI.renderLLMKeys();
    }

    /**
     * Get all stored LLM services (names and metadata only)
     */
    getAllLLMServices() {
        return Object.values(this.llmKeys).map(entry => ({
            name: entry.name,
            addedAt: entry.addedAt
        }));
    }

    /**
     * Check if we have multiple configured LLM services
     */
    hasMultipleLLMServices() {
        return this.getAllLLMServices().length >= 2;
    }

    /**
     * Clear all LLM keys on reset
     */
    clearAllLLMKeys() {
        this.llmKeys = {};
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});
