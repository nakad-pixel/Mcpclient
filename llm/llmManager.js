export class LLMManager {
    constructor() {
        this.models = [];
        this.activeModelId = null;
        this.councilEnabled = false;
        this.councilModelIds = [];
    }

    registerModel(modelConfig) {
        const id = modelConfig.id || crypto.randomUUID();
        const model = { ...modelConfig, id };
        this.models.push(model);
        return model;
    }

    removeModel(modelId) {
        this.models = this.models.filter(m => m.id !== modelId);
        if (this.activeModelId === modelId) {
            this.activeModelId = this.models.length > 0 ? this.models[0].id : null;
        }
    }

    selectModel(modelId) {
        this.activeModelId = modelId;
    }

    listModels() {
        return this.models;
    }

    getActiveModel() {
        return this.models.find(m => m.id === this.activeModelId);
    }

    toggleCouncil(enabled) {
        this.councilEnabled = enabled;
    }

    setCouncilModels(modelIds) {
        this.councilModelIds = modelIds;
    }

    async generateResponse(messages, systemPrompt, tools) {
        if (this.councilEnabled && this.councilModelIds.length > 0) {
            return this.generateCouncilResponse(messages, systemPrompt, tools);
        }

        const model = this.getActiveModel();
        if (!model) throw new Error('No active model selected');

        return this.callModel(model, messages, systemPrompt, tools);
    }

    async callModel(model, messages, systemPrompt, tools) {
        const formattedMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => {
                if (m.attachments && m.attachments.length > 0) {
                    const content = [{ type: 'text', text: m.content || '' }];
                    m.attachments.forEach(att => {
                        if (att.type === 'image') {
                            content.push({
                                type: 'image_url',
                                image_url: { url: att.data }
                            });
                        } else {
                            content.push({
                                type: 'text',
                                text: `\n[File Attachment: ${att.name}]\n${att.data}`
                            });
                        }
                    });
                    return { role: m.role, content };
                }
                return { role: m.role, content: m.content };
            })
        ];

        const payload = {
            model: model.modelId,
            messages: formattedMessages,
            tools: tools.length > 0 ? tools.map(t => ({
                type: 'function',
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.inputSchema
                }
            })) : undefined,
            tool_choice: tools.length > 0 ? 'auto' : undefined
        };

        const response = await fetch(model.endpoint + '/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${model.apiKey}`,
                ...(model.provider === 'openrouter' ? { 'HTTP-Referer': window.location.origin, 'X-Title': 'MCP Client' } : {})
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const choice = data.choices[0].message;

        return {
            role: 'assistant',
            content: choice.content || '',
            tool_use: choice.tool_calls?.map(tc => ({
                id: tc.id,
                name: tc.function.name,
                input: JSON.parse(tc.function.arguments)
            })) || []
        };
    }

    async generateCouncilResponse(messages, systemPrompt, tools) {
        const models = this.models.filter(m => this.councilModelIds.includes(m.id));
        const promises = models.map(m => this.callModel(m, messages, systemPrompt, tools).catch(e => {
            console.error(`Council model ${m.name} failed:`, e);
            return null;
        }));

        const results = await Promise.all(promises);
        const validResults = results.filter(r => r !== null);

        if (validResults.length === 0) throw new Error('All council models failed');

        // Strategy: if any model returns tool_use, use the first one. Otherwise use first successful result.
        const toolResult = validResults.find(r => r.tool_use && r.tool_use.length > 0);
        if (toolResult) return toolResult;

        return validResults[0];
    }

    async validateApiKey(modelConfig) {
        try {
            const response = await fetch(modelConfig.endpoint + '/models', {
                headers: { 'Authorization': `Bearer ${modelConfig.apiKey}` }
            });
            return response.ok;
        } catch (e) {
            return false;
        }
    }
}
