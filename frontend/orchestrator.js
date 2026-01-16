export const STATES = {
    IDLE: 'IDLE',
    THINKING: 'THINKING',
    TOOL_CALLING: 'TOOL_CALLING',
    DONE: 'DONE',
    ERROR: 'ERROR'
};

function formatPrompt(text, attachments) {
    if (!attachments || attachments.length === 0) return text;

    const attachmentSummary = attachments
        .map(a => `- ${a.name || 'attachment'} (${a.type || 'file'})`)
        .join('\n');

    return `${text}\n\n[Attachments]\n${attachmentSummary}`;
}

export class Orchestrator {
    constructor(app) {
        this.app = app;
        this.state = STATES.IDLE;
        this.messages = [];
    }

    setState(newState) {
        this.state = newState;
        document.getElementById('app-status').textContent = `● ${newState}`;
    }

    async processUserInput(text, attachments = []) {
        if (this.state !== STATES.IDLE && this.state !== STATES.DONE) return;

        const userMessage = {
            role: 'user',
            content: text,
            attachments,
            timestamp: Date.now()
        };

        this.messages.push(userMessage);
        this.app.chatUI.renderMessage(userMessage);
        this.app.chatUI.clearInput();
        this.app.uploadUI.clear();

        try {
            await this.generateAssistantResponse(text, attachments);
            this.setState(STATES.DONE);
            this.app.saveConfig();
        } catch (e) {
            this.setState(STATES.ERROR);
            this.app.chatUI.renderMessage({
                role: 'assistant',
                content: `Error: ${e.message}`
            });
        }
    }

    async generateAssistantResponse(text, attachments) {
        const active = this.app.getActiveSessionContext();
        if (!active) {
            this.setState(STATES.DONE);
            this.app.chatUI.renderMessage({
                role: 'assistant',
                content: 'No active MCP session. Please add a server and click refresh to connect.'
            });
            return;
        }

        const prompt = formatPrompt(text, attachments);

        const models = this.app.councilEnabled
            ? this.app.councilModels
            : this.app.activeModel
                ? [this.app.activeModel]
                : [];

        if (models.length === 0) {
            throw new Error('No LLM model selected. Connect to an MCP server that exposes llm_* tools.');
        }

        if (this.app.councilEnabled && models.length < 2) {
            throw new Error('Council Mode requires selecting 2+ models');
        }

        this.setState(STATES.THINKING);
        this.app.chatUI.showLoading();

        try {
            const data = await this.app.mcpClient.backendClient.getConsensus(
                active.sessionId,
                prompt,
                models,
                0.7,
                500
            );

            const assistantMessage = {
                role: 'assistant',
                content: data.consensus,
                timestamp: Date.now(),
                ...(models.length > 1 ? { councilVote: data } : {})
            };

            this.messages.push(assistantMessage);
            this.app.chatUI.renderMessage(assistantMessage);
        } finally {
            this.app.chatUI.hideLoading();
        }
    }

    async runToolManually(toolName, args) {
        const active = this.app.getActiveSessionContext();
        if (!active) {
            throw new Error('No active MCP session. Connect to a server first.');
        }

        this.setState(STATES.TOOL_CALLING);

        const tools = this.app.mcpClient.getAllTools();
        const tool = tools.find(t => t.name === toolName);

        if (!tool) {
            throw new Error(`Tool ${toolName} not found`);
        }

        const toolCall = {
            id: `tool_${Date.now()}`,
            name: toolName,
            input: args
        };

        const validation = this.app.toolRouter.validateToolArguments(tool, args);
        if (!validation.valid) {
            throw new Error(`Invalid arguments: ${validation.error}`);
        }

        const result = await this.app.mcpClient.backendClient.callMCPTool(active.sessionId, toolName, args);

        const toolResultMessage = {
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolName,
            content: result.result,
            timestamp: Date.now()
        };

        this.messages.push(toolResultMessage);
        this.app.chatUI.renderMessage(toolResultMessage);

        this.setState(STATES.DONE);
        this.app.saveConfig();
    }

    loadHistory(history) {
        this.messages = history || [];
        this.messages.forEach(msg => this.app.chatUI.renderMessage(msg));
    }
}
