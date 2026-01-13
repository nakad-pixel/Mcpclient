# MCP Client

A production-ready, vanilla JavaScript Model Context Protocol (MCP) client. No build step required.

## Features

- **Claude-like Chat Interface**: Clean, responsive, and mobile-friendly.
- **MCP Tool Execution**: Seamlessly connect to and execute tools from any MCP server.
- **LLM Council Mode**: Query multiple models in parallel and choose the best response.
- **File Uploads**: Support for images and documents (up to 50MB).
- **Persistence**: Your configurations and chat history are saved locally.
- **No Build Step**: Pure HTML, CSS, and ES Modules.

## Quick Start

1. Clone this repository or download the files.
2. Open `index.html` in any modern web browser.
3. Add an LLM model in the sidebar (e.g., OpenAI or OpenRouter).
4. Add an MCP server URL.
5. Start chatting!

## Adding MCP Servers

MCP servers must support the HTTP protocol for this client.

1. Click the **+** button in the **MCP Servers** section.
2. Enter a name (e.g., "Weather Service").
3. Enter the URL of the MCP server (e.g., `https://my-mcp-server.netlify.app/.netlify/functions/mcp`).
4. (Optional) Provide an Authorization header.
5. Click **Save**.

## Configuring LLMs

Supported providers include OpenAI-compatible endpoints and OpenRouter.

1. Click the **+** button in the **LLM Models** section.
2. Select your provider.
3. Enter the API endpoint (e.g., `https://api.openai.com/v1`).
4. Enter your API Key. **Note: API keys are stored in memory and not in LocalStorage for security.**
5. Enter the Model Identifier (e.g., `gpt-4-turbo`).
6. Click **Save**.

## Council Mode

Enable **Council Mode** to query multiple models simultaneously. The orchestrator will:
- Send your message to all selected models in the council.
- If any model suggests a tool call, it will be prioritized.
- Otherwise, it uses the first successful response.

## Deploying an MCP Server on Netlify

1. Create a GitHub repository with your MCP server implementation (e.g., using the MCP SDK).
2. Connect the repository to Netlify.
3. Set any necessary environment variables in the Netlify dashboard.
4. Deploy the site.
5. Copy the function endpoint URL and register it in the MCP Client UI.

## Architecture

```text
+----------------+      +-------------------+      +----------------+
|   Chat UI      | <--> |   Orchestrator    | <--> |  LLM Manager   |
+----------------+      |  (State Machine)  |      +----------------+
                        +---------+---------+               ^
                                  |                         |
                                  v                         |
                        +-------------------+               |
                        |   Tool Router     |               |
                        +---------+---------+               |
                                  |                         |
                                  v                         |
                        +-------------------+               |
                        |   MCP Client      | <-------------+
                        +-------------------+
```

## Security Best Practices

- **API Keys**: This client does not persist API keys to LocalStorage. You will need to re-enter them if you refresh the page.
- **CORS**: Ensure your MCP servers and LLM endpoints have CORS enabled for the domain where you host this client.
- **HTTPS**: Always use HTTPS for both the client and the servers to protect your data and API keys.

## Troubleshooting

- **Connection Refused**: Check if the server URL is correct and the server is running.
- **CORS Errors**: The server must allow requests from the client's origin.
- **Invalid API Key**: Double-check your key and ensure the endpoint is correct.
- **Tool Execution Timeout**: Tool calls have a 30-second timeout. Check if the server is responsive.
