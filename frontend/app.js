import { Storage } from './storage/storage.js';
import { MCPClient } from './mcp/mcpClient.js';
import { ToolRouter } from './mcp/toolRouter.js';
import { Orchestrator } from './orchestrator.js';
import { ChatUI } from './ui/chatUI.js';
import { SidebarUI } from './ui/sidebarUI.js';
import { UploadUI } from './ui/uploadUI.js';

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
                this.storage.remove(this.storage.KEYS.CHAT_HISTORY);
                location.reload();
            }
        };

        document.getElementById('reset-app').onclick = () => {
            if (confirm('Reset everything? All servers will be deleted.')) {
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
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});
