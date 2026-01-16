export class ToolRouter {
    constructor(mcpClient) {
        this.mcpClient = mcpClient;
    }

    routeToolCall(toolCall) {
        const tools = this.mcpClient.getAllTools();
        const tool = tools.find(t => t.name === toolCall.name);

        if (!tool) {
            throw new Error(`Tool ${toolCall.name} not found on any registered server`);
        }

        return {
            serverId: tool.serverId,
            tool
        };
    }

    validateToolArguments(toolSchema, args) {
        if (toolSchema.inputSchema && toolSchema.inputSchema.required) {
            for (const req of toolSchema.inputSchema.required) {
                if (!(req in args)) {
                    return { valid: false, error: `Missing required argument: ${req}` };
                }
            }
        }
        return { valid: true };
    }

    buildToolResult(toolCall, executionResult) {
        return {
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolCall.name,
            content:
                typeof executionResult.output === 'string'
                    ? executionResult.output
                    : JSON.stringify(executionResult.output)
        };
    }
}
