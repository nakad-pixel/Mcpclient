export const STATES = {
    IDLE: 'IDLE',
    THINKING: 'THINKING',
    TOOL_CALLING: 'TOOL_CALLING',
    WAITING_FOR_TOOL: 'WAITING_FOR_TOOL',
    FINALIZING: 'FINALIZING',
    DONE: 'DONE',
    ERROR: 'ERROR'
};

export class Orchestrator {
    constructor(app) {
        this.app = app;
        this.state = STATES.IDLE;
        this.messages = [];
        this.maxLoops = 8;
    }

    setState(newState) {
        this.state = newState;
        document.getElementById('app-status').textContent = `● ${newState}`;
        console.log(`State transition: ${newState}`);
    }

    async processUserInput(text, attachments = []) {
        if (this.state !== STATES.IDLE && this.state !== STATES.DONE) return;

        const userMessage = {
            role: 'user',
            content: text,
            attachments: attachments
        };

        this.messages.push(userMessage);
        this.app.chatUI.renderMessage(userMessage);
        this.app.chatUI.clearInput();
        this.app.uploadUI.clear();

        try {
            await this.runLoop();
        } catch (e) {
            this.setState(STATES.ERROR);
            this.app.chatUI.renderMessage({
                role: 'assistant',
                content: `Error: ${e.message}`
            });
        }
    }

    async runLoop() {
        let loopCount = 0;
        this.setState(STATES.THINKING);

        while (loopCount < this.maxLoops) {
            this.app.chatUI.showLoading();
            
            const tools = this.app.mcpClient.getAllTools();
            const response = await this.app.llmManager.generateResponse(
                this.messages,
                "You are a helpful assistant with access to tools via the Model Context Protocol (MCP).",
                tools
            );

            this.app.chatUI.hideLoading();
            this.messages.push(response);
            this.app.chatUI.renderMessage(response);

            if (!response.tool_use || response.tool_use.length === 0) {
                this.setState(STATES.DONE);
                this.app.saveConfig();
                return;
            }

            this.setState(STATES.TOOL_CALLING);
            
            for (const toolCall of response.tool_use) {
                const { serverId, tool } = this.app.toolRouter.routeToolCall(toolCall);
                const validation = this.app.toolRouter.validateToolArguments(tool, toolCall.input);
                
                if (!validation.valid) {
                    throw new Error(`Invalid arguments for tool ${toolCall.name}: ${validation.error}`);
                }

                this.setState(STATES.WAITING_FOR_TOOL);
                const result = await this.app.mcpClient.executeToolCall(toolCall, serverId);
                
                const toolResultMessage = this.app.toolRouter.buildToolResult(toolCall, result);
                this.messages.push(toolResultMessage);
                this.app.chatUI.renderMessage(toolResultMessage);
            }

            this.setState(STATES.FINALIZING);
            loopCount++;
        }

        if (loopCount >= this.maxLoops) {
            throw new Error('Maximum tool execution loops reached');
        }
    }

    loadHistory(history) {
        this.messages = history || [];
        this.messages.forEach(msg => this.app.chatUI.renderMessage(msg));
    }
}
