# Debugging 401 Unauthorized Errors - Implementation Summary

## Problem
MCPclient was receiving "401 Unauthorized" errors when connecting to private Klavis MCP servers that don't require authentication headers.

## Root Cause
The issue is that when a server returns 401, it's unclear what exactly is causing the rejection. The server could be rejecting due to:
- Unwanted headers being sent
- Missing required headers (when auth IS needed)
- Incorrect header format
- Server-specific expectations

## Implementation

### 1. Backend Debug Logging (server/10-mcp-client.js)
Added comprehensive logging to MCPClient.call() method:
- Logs the exact URL being called
- Logs all headers being sent (in pretty JSON format)
- Logs the full request body
- Logs response status and headers
- Logs error response body
- **Special enhanced 401 error logging** with troubleshooting suggestions

### 2. Connect Handler Logging (server/2-mcp-connect.js)
Added logging to the MCP connect endpoint:
- Logs the server ID and URL
- Logs the headers object passed from frontend
- Logs the headers type (for debugging)
- Helps trace the flow from frontend → backend → MCP server

### 3. Frontend UI Improvements (frontend/index.html)
- Updated headers field label to "Headers (JSON, optional)"
- Changed placeholder to show format more clearly
- Added help text: "Leave empty for servers that don't require authentication"
- Makes it obvious that auth is optional

### 4. Frontend Error Messages (frontend/api/backendClient.js)
- Updated 401 error message to be more specific
- Mentions that servers without auth should have empty headers
- Helps users understand the issue better

### 5. CSS Styling (frontend/styles.css)
- Added `.help-text` class for styling the help text
- Ensures consistent, readable UI

### 6. Test Script (test-mcp-connection.js)
Created standalone test script for debugging:
- Can be run locally to test MCP connections
- Shows exactly what's being sent to server
- Provides detailed error output
- Includes specific guidance for 401 errors
- Usage: `node test-mcp-connection.js <URL> [HEADERS_JSON]`

### 7. Documentation (README.md)
Added new troubleshooting section for 401 errors:
- Lists solutions and steps
- Documents the debug logging features
- Explains how to use test script
- Lists common causes

## Debug Output Example

When a 401 error occurs, logs will show:

```
[MCP Connect] Connection request received:
[MCP Connect] Server ID: klavis-private
[MCP Connect] Server URL: http://user-server:3000/mcp
[MCP Connect] Headers provided: {}
[MCP Connect] Headers object type: object, isArray: false

[MCP Client] Making initialize request to: http://user-server:3000/mcp
[MCP Client] Request headers: {
  "Content-Type": "application/json"
}
[MCP Client] Request body: {
  "jsonrpc": "2.0",
  "id": "req_1234567890_abc",
  "method": "initialize",
  "params": {}
}
[MCP Client] Response status: 401 Unauthorized
[MCP Client] Response headers: {...}

[MCP Client] Error response body: {...}

[MCP Client] 401 Unauthorized - Server rejected the request
[MCP Client] URL: http://user-server:3000/mcp
[MCP Client] Headers sent: {
  "Content-Type": "application/json"
}
[MCP Client] Request method: POST
[MCP Client] Request body: {
  "jsonrpc": "2.0",
  "id": "req_1234567890_abc",
  "method": "initialize",
  "params": {}
}
[MCP Client] Troubleshooting:
[MCP Client]   - If server doesn't require auth, headers should be empty object {}
[MCP Client]   - If server requires auth, check Authorization header format
[MCP Client]   - Some servers reject unexpected headers like User-Agent or Accept
```

## How to Use

### For Local Development
1. Run `npm run dev` to start the server
2. Try to connect to your MCP server
3. Check the console output for detailed debug logs
4. Use `node test-mcp-connection.js <URL>` for isolated testing

### For Vercel Deployment
1. Deploy changes to Vercel
2. Try to connect from the frontend
3. Check Vercel Function Logs for debug output
4. Look for `[MCP Client]` and `[MCP Connect]` prefixed logs
5. Analyze what headers are being sent vs what server expects

## Key Insights

The implementation ensures:
1. **Transparency**: You can see exactly what's being sent to the server
2. **Actionable guidance**: Error messages suggest what to check
3. **Local testing**: Test script allows debugging without deployment
4. **User education**: UI makes it clear headers are optional
5. **Future-proof**: Logging helps debug ANY MCP connection issue, not just 401

## Next Steps for User

1. Check logs to see what headers are being sent
2. Verify the headers field is truly empty (check for whitespace)
3. Use test script to isolate the issue
4. If needed, modify headers in the backend to strip unwanted ones
5. Contact server admin for exact expected format

## Files Modified

- `server/10-mcp-client.js` - Added debug logging
- `server/2-mcp-connect.js` - Added connection logging
- `frontend/index.html` - Updated headers field UI
- `frontend/api/backendClient.js` - Updated error messages
- `frontend/styles.css` - Added help text styling
- `README.md` - Added troubleshooting documentation
- `test-mcp-connection.js` - Created new test script
