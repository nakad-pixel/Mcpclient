import { Storage } from './storage/storage.js';
import { LLMManager } from './llm/llmManager.js';
import { MCPClient } from './mcp/mcpClient.js';
import { ToolRouter } from './mcp/toolRouter.js';
import { Orchestrator } from './orchestrator.js';
import { ChatUI } from './ui/chatUI.js';
import { SidebarUI } from './ui/sidebarUI.js';
import { UploadUI } from './ui/uploadUI.js';

class App {
    constructor() {
        this.storage = Storage;
        this.llmManager = new LLMManager();
        this.mcpClient = new MCPClient();
        this.toolRouter = new ToolRouter(this.mcpClient);
        this.orchestrator = new Orchestrator(this);
        
        this.chatUI = new ChatUI('chat-messages', 'chat-input', 'send-btn');
        this.sidebarUI = new SidebarUI(this);
        this.uploadUI = new UploadUI(this);

        this.init();
    }

    async init() {
        console.log('Initializing MCP Client App...');
        
        // Load settings
        const theme = this.storage.load(this.storage.KEYS.THEME);
        if (theme === 'dark') document.body.classList.add('dark-mode');

        const savedServers = this.storage.load(this.storage.KEYS.SERVERS) || [];
        savedServers.forEach(s => this.mcpClient.registerServer(s));

        const savedModels = this.storage.load(this.storage.KEYS.MODELS) || [];
        savedModels.forEach(m => this.llmManager.registerModel(m));

        const activeModelId = this.storage.load(this.storage.KEYS.ACTIVE_MODEL);
        if (activeModelId) this.llmManager.selectModel(activeModelId);

        const councilEnabled = this.storage.load(this.storage.KEYS.COUNCIL_ENABLED);
        if (councilEnabled) {
            this.llmManager.toggleCouncil(true);
            document.getElementById('council-mode-toggle').checked = true;
            const councilModels = this.storage.load(this.storage.KEYS.COUNCIL_MODELS);
            if (councilModels) this.llmManager.setCouncilModels(councilModels);
        }

        // Initialize UI
        this.sidebarUI.renderModels();
        this.sidebarUI.renderServers();
        this.updateActiveModelDisplay();

        // Load chat history
        const history = this.storage.load(this.storage.KEYS.CHAT_HISTORY);
        if (history) this.orchestrator.loadHistory(history);

        // Refresh servers in background
        this.mcpClient.listServers().forEach(s => {
            this.mcpClient.refreshTools(s.id).then(() => this.sidebarUI.renderServers()).catch(() => {});
        });

        this.setupAppEventListeners();
        
        // Global reference for debugging
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

        // Auto-resize textarea
        chatInput.oninput = () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = chatInput.scrollHeight + 'px';
        };

        document.getElementById('council-mode-toggle').onchange = (e) => {
            this.llmManager.toggleCouncil(e.target.checked);
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
            if (confirm('Reset everything? All models and servers will be deleted.')) {
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

    updateActiveModelDisplay() {
        const model = this.llmManager.getActiveModel();
        document.getElementById('active-model-info').textContent = model ? `Model: ${model.name}` : 'No model selected';
    }

    saveConfig() {
        this.storage.save(this.storage.KEYS.SERVERS, this.mcpClient.listServers());
        this.storage.save(this.storage.KEYS.MODELS, this.llmManager.listModels());
        this.storage.save(this.storage.KEYS.ACTIVE_MODEL, this.llmManager.activeModelId);
        this.storage.save(this.storage.KEYS.COUNCIL_ENABLED, this.llmManager.councilEnabled);
        this.storage.save(this.storage.KEYS.COUNCIL_MODELS, this.llmManager.councilModelIds);
        this.storage.save(this.storage.KEYS.CHAT_HISTORY, this.orchestrator.messages);
    }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
