# MCP Client

A production-ready, HTTP-only Model Context Protocol (MCP) client with backend proxy and LLM Council support.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Vercel Static Site)                               │
│ - Vanilla JS, pure REST/HTTPS                               │
│ - All MCP calls via fetch() to backend                      │
│ - Council UI for multi-model voting                         │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTPS
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend (Vercel Serverless Functions)                       │
│ - /api/mcp/*     → MCP proxy endpoints                      │
│ - /api/council/* → LLM Council decision engine              │
│ - Session management (in-memory)                            │
│ - Error handling (standardized JSON responses)              │
└──────────────────┬──────────────────────────────────────────┘
                   │ MCP JSON-RPC 2.0
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Klavis AI MCP Server (or any MCP-compliant server)         │
│ - https://strata.klavis.ai/mcp/                             │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **HTTP-Only Backend Proxy**: All MCP communication routed through Vercel serverless functions
- **Session Management**: Secure session-based MCP connections with auto-expiration
- **LLM Council Mode**: Multi-model consensus with voting details
- **Tool Execution**: Browse and execute MCP tools with JSON arguments
- **Multiple Servers**: Connect to multiple MCP servers simultaneously
- **Chat History**: Persistent localStorage-based history
- **Dark Mode**: Toggle-able dark/light theme
- **Mobile Friendly**: Responsive design for all devices

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/mcpclient.git
cd mcpclient
npm install -g vercel  # If not already installed
```

### 2. Configure Environment

Create a `.env.local` file in the project root:

```env
MCP_KLAVIS_URL=https://strata.klavis.ai/mcp/
MCP_KLAVIS_TOKEN=your-bearer-token-here
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Run Locally

```bash
vercel dev
```

Navigate to `http://localhost:3000`

## Deployment to Vercel

### Option A: GitHub Integration (Recommended)

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **Add New Project**
4. Import your GitHub repository
5. Set environment variables in Vercel dashboard:
   - `FRONTEND_URL` → Your Vercel deployment URL (e.g., `https://mcpclient.vercel.app`)
   - `MCP_KLAVIS_URL` → `https://strata.klavis.ai/mcp/`
   - `MCP_KLAVIS_TOKEN` → Your Klavis bearer token
   - `NODE_ENV` → `production`
6. Click **Deploy**

### Option B: Vercel CLI

```bash
vercel login
vercel
# Follow prompts, then set env vars:
vercel env add FRONTEND_URL production
vercel env add MCP_KLAVIS_URL production
vercel env add MCP_KLAVIS_TOKEN production
vercel env add NODE_ENV production
vercel --prod
```

## Backend API Specification

### POST /api/mcp/connect

Initialize MCP session.

**Request:**
```json
{
  "serverId": "klavis-strata",
  "serverUrl": "https://strata.klavis.ai/mcp/",
  "headers": {
    "Authorization": "Bearer eyJhbGci..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_abc123...",
    "capabilities": ["tools"],
    "serverInfo": {...},
    "toolCount": 24
  }
}
```

### POST /api/mcp/tools

List tools in session.

**Request:**
```json
{
  "sessionId": "sess_abc123..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tools": [
      {
        "name": "read_file",
        "description": "Read file contents",
        "inputSchema": {...}
      }
    ]
  }
}
```

### POST /api/mcp/call

Execute tool.

**Request:**
```json
{
  "sessionId": "sess_abc123...",
  "tool": "read_file",
  "args": { "path": "/etc/passwd" }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "toolName": "read_file",
    "result": "file contents...",
    "executionTime": 234
  }
}
```

### POST /api/council/consensus

Run LLM Council vote.

**Request:**
```json
{
  "sessionId": "sess_abc123...",
  "prompt": "What is 2+2?",
  "models": ["gpt-4-turbo", "llama2"],
  "temperature": 0.7,
  "maxTokens": 500
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "consensus": "The answer is 4",
    "details": [
      { "model": "gpt-4-turbo", "response": "The answer is 4", "confidence": 1.0 },
      { "model": "llama2", "response": "2 + 2 = 4", "confidence": 0.95 }
    ],
    "votedModel": "gpt-4-turbo",
    "strategy": "majority_vote",
    "executionTime": 1523
  }
}
```

## Error Responses

All errors return:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {...}
  }
}
```

**Error Codes:**
- `INVALID_REQUEST` (400) - Bad request parameters
- `SESSION_NOT_FOUND` (401) - Session expired or invalid
- `TOOL_NOT_FOUND` (404) - Tool doesn't exist
- `TOOL_VALIDATION_ERROR` (400) - Invalid tool arguments
- `MCP_ERROR` (502) - MCP server error
- `TIMEOUT` (504) - Request timed out
- `INTERNAL_ERROR` (500) - Internal server error

## Usage Guide

### Adding an MCP Server

1. Click **+ Add Server** in sidebar
2. Enter server details:
   - **Name**: e.g., "Klavis Strata"
   - **URL**: `https://strata.klavis.ai/mcp/`
   - **Headers**: `{"Authorization":"Bearer YOUR_TOKEN"}`
3. Click **Test Connection**
4. Click **Save**
5. Click **🔄 Refresh** to connect and load tools

### Using LLM Council Mode

1. Connect to an MCP server that exposes `llm_*` tools
2. Enable **Council Mode** toggle in sidebar
3. Select 2+ models from the list
4. Type a message and send
5. View voting details by expanding the **🤝 Council Vote** section

### Running Tools Manually

1. Click **🛠️** icon in header
2. Select a tool from dropdown
3. Enter arguments as JSON (e.g., `{"path": "/etc/passwd"}`)
4. Click **Run**
5. View result in chat

## Security Best Practices

1. **API Keys**: Set via Vercel environment variables only
2. **HTTPS**: Always use HTTPS for MCP server URLs (except localhost)
3. **CORS**: Backend enforces origin whitelist
4. **Sessions**: Auto-expire after 1 hour of inactivity
5. **Input Validation**: All backend endpoints validate inputs

## Troubleshooting

### Session Expired Error

**Problem**: `SESSION_NOT_FOUND` error when calling tools  
**Solution**: Click the **🔄 Refresh** button on the server to reconnect

### CORS Errors

**Problem**: CORS errors when connecting to MCP server  
**Solution**: Ensure `FRONTEND_URL` env var matches your deployment URL

### Tool Not Found

**Problem**: `llm_*` tools not showing in Council Mode  
**Solution**: Verify your MCP server exposes LLM tools with `llm_` prefix

### Connection Timeout

**Problem**: Backend requests timing out  
**Solution**: MCP calls have 30s timeout; check server responsiveness

### 401 Unauthorized Error

**Problem**: Getting "401 Unauthorized" when connecting to a private server that doesn't require authentication

**Solution**:
1. Ensure the headers field is left empty if your server doesn't require authentication
2. Check server logs to see exactly what headers are being sent (detailed logging is now enabled)
3. Use the debug test script to test the connection:
   ```bash
   node test-mcp-connection.js http://your-server-url
   ```

**Debug Information**:
When you encounter a 401 error, the backend now logs:
- The exact headers being sent to the server
- The request body format
- The response from the server
- Troubleshooting suggestions

Check your Vercel deployment logs or local dev console to see these details.

**Common Causes**:
- Unwanted headers being sent (User-Agent, Accept, etc.)
- Authorization header present when not needed
- Server expects specific headers format
- URL is incorrect or path mismatch

## Development

### Project Structure

```
Mcpclient/
├── frontend/                # Static frontend
│   ├── api/
│   │   └── backendClient.js # Backend HTTP wrapper
│   ├── mcp/
│   │   ├── mcpClient.js     # MCP client (uses backend)
│   │   └── toolRouter.js    # Tool routing logic
│   ├── ui/
│   │   ├── chatUI.js
│   │   ├── sidebarUI.js
│   │   └── uploadUI.js
│   ├── storage/
│   │   └── storage.js       # localStorage wrapper
│   ├── orchestrator.js      # Message flow
│   ├── app.js               # Main app
│   ├── index.html
│   └── styles.css
├── api/                     # Vercel serverless functions
│   ├── mcp/
│   │   ├── connect.js       # POST /api/mcp/connect
│   │   ├── tools.js         # POST /api/mcp/tools
│   │   ├── call.js          # POST /api/mcp/call
│   │   └── disconnect.js    # POST /api/mcp/disconnect
│   ├── council/
│   │   ├── consensus.js     # POST /api/council/consensus
│   │   └── modelRouter.js   # LLM routing logic
│   └── utils/
│       ├── mcpClient.js     # MCP JSON-RPC client
│       ├── sessionManager.js # Session state
│       ├── errorHandler.js  # Error responses
│       ├── cors.js          # CORS middleware
│       ├── request.js       # Request helpers
│       └── constants.js     # Error codes
├── vercel.json
├── package.json
└── .env.example
```

### Testing Backend Locally

```bash
# In terminal 1
vercel dev

# In terminal 2
curl -X POST http://localhost:3000/api/mcp/connect \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": "test",
    "serverUrl": "https://strata.klavis.ai/mcp/",
    "headers": {"Authorization":"Bearer YOUR_TOKEN"}
  }'
```

## Klavis Configuration Example

```json
{
  "serverId": "klavis-strata",
  "serverUrl": "https://strata.klavis.ai/mcp/",
  "headers": {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI5Y2M4ZWNkOC0zOGVlLTQwYTQtYTExMy03NDNhYzhhNTQ0YWEiLCJhY2NvdW50SWQiOiIyMDc0ZThiMS0wOGU5LTRiOWQtYjlhYy0yY2MyMTNhNzU4NjIiLCJpc1RlYW1BY2NvdW50Ijp0cnVlLCJpYXQiOjE3Njg1NTY3NjZ9.JnKTYI4KXLj9jT2kR13j7TlA51HkCoURkJAfUIOGHNs"
  }
}
```

## License

MIT

## Contributing

Pull requests welcome! Please ensure:
- All backend endpoints return standardized JSON
- Frontend uses BackendClient for all API calls
- Error handling follows error codes in constants.js
- Council voting logic is transparent and deterministic
