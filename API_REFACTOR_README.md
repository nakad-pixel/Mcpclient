# Vercel API Refactoring - Single Entry Point

## 📋 Overview
This refactoring consolidates the MCPclient API from 14 separate serverless functions into a single unified entry point, ensuring compatibility with Vercel's free tier (12 function limit).

## 🎯 Objectives Achieved
- ✅ Reduced from 14 serverless functions to 1
- ✅ Maintained all existing API functionality
- ✅ Preserved modular code structure
- ✅ Standardized error handling across all routes
- ✅ Successfully tested all endpoints locally

## 📁 File Changes

### Modified Files
1. **vercel.json**
   - Changed: `"api/**/*.js"` → `"api/index.js"`
   - Impact: Only one serverless function deployed

2. **api/routes/llmRoutes.js**
   - Changed: Express-style responses → Standard Node.js responses
   - Added: Proper error/success handlers
   - Impact: Consistent with other API routes

### New Documentation Files
- `DEPLOYMENT_REFACTOR.md` - Detailed technical documentation
- `REFACTOR_SUMMARY.md` - Quick reference guide
- `VERIFICATION_CHECKLIST.md` - Pre/post deployment checks
- `API_REFACTOR_README.md` - This file

### Development Tools
- `test-server.js` - Local testing server
- `test-routes.sh` - Automated route testing script

## 🏗️ Architecture

### Before Refactoring
```
Vercel Deployment:
├── api/index.js → Function 1
├── api/mcp/call.js → Function 2
├── api/mcp/connect.js → Function 3
├── api/mcp/disconnect.js → Function 4
├── api/mcp/tools.js → Function 5
├── api/council/consensus.js → Function 6
├── api/council/modelRouter.js → Function 7
├── api/routes/llmRoutes.js → Function 8
├── api/utils/constants.js → Function 9
├── api/utils/cors.js → Function 10
├── api/utils/errorHandler.js → Function 11
├── api/utils/mcpClient.js → Function 12
├── api/utils/request.js → Function 13
└── api/utils/sessionManager.js → Function 14
Total: 14 functions ❌ (exceeds 12 limit)
```

### After Refactoring
```
Vercel Deployment:
└── api/index.js → SINGLE Function
    ├── imports routes/llmRoutes.js
    ├── imports mcp/call.js
    ├── imports mcp/connect.js
    ├── imports mcp/disconnect.js
    ├── imports mcp/tools.js
    ├── imports council/consensus.js
    └── routes requests to handlers
Total: 1 function ✅ (within 12 limit)
```

## 🔄 Request Flow

```
Client Request
    ↓
Vercel Edge Network
    ↓
api/index.js (Single Serverless Function)
    ↓
Route Matching
    ├─→ /api/llm/* → llmRoutes.handleLLMRequest()
    ├─→ /api/mcp/call → callHandler()
    ├─→ /api/mcp/connect → connectHandler()
    ├─→ /api/mcp/disconnect → disconnectHandler()
    ├─→ /api/mcp/tools → toolsHandler()
    ├─→ /api/council/consensus → consensusHandler()
    └─→ (unknown) → 404 Error
    ↓
Response to Client
```

## 🧪 Testing

### Local Testing
1. Start the test server:
   ```bash
   node test-server.js
   ```

2. Run automated tests:
   ```bash
   ./test-routes.sh
   ```

3. Manual testing:
   ```bash
   # Test LLM endpoints
   curl -X GET http://localhost:3000/api/llm/services
   
   # Test MCP endpoints (requires session)
   curl -X POST http://localhost:3000/api/mcp/connect \
     -H "Content-Type: application/json" \
     -d '{"serverId":"test","serverUrl":"https://example.com"}'
   ```

### Verified Endpoints
- ✅ GET /api/llm/services
- ✅ POST /api/llm/key
- ✅ DELETE /api/llm/key
- ✅ POST /api/mcp/connect
- ✅ POST /api/mcp/call
- ✅ POST /api/mcp/disconnect
- ✅ GET /api/mcp/tools (requires POST)
- ✅ POST /api/council/consensus
- ✅ 404 handling for unknown routes

## 🚀 Deployment

### Pre-Deployment
1. Review changes:
   ```bash
   git diff vercel.json
   git diff api/routes/llmRoutes.js
   ```

2. Verify syntax:
   ```bash
   node -c api/index.js
   ```

3. Test locally (optional):
   ```bash
   node test-server.js
   ```

### Deploy to Vercel
```bash
# Production deployment
vercel --prod

# Or development deployment
vercel
```

### Post-Deployment Verification
1. Check Vercel Dashboard:
   - Navigate to Functions tab
   - Verify only 1 function is listed
   - Check function size and memory usage

2. Test live endpoints:
   ```bash
   # Replace YOUR_DOMAIN with actual domain
   curl -X GET https://YOUR_DOMAIN/api/llm/services
   ```

3. Monitor logs:
   ```bash
   vercel logs
   ```

## 🔧 Configuration

### vercel.json
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "frontend",
  "functions": {
    "api/index.js": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

**Key Points:**
- Only `api/index.js` is specified (not glob pattern)
- Memory: 1024 MB
- Max duration: 60 seconds
- All other files are imported as modules

## 📊 Benefits

### Cost & Scalability
- ✅ Stays within free tier (1/12 functions used)
- ✅ Room for 11 more functions if needed
- ✅ Reduced cold start overhead (1 function vs 14)

### Code Quality
- ✅ Standardized error handling
- ✅ Consistent response format
- ✅ Better code organization
- ✅ Easier debugging (single entry point)

### Maintenance
- ✅ Modular structure preserved
- ✅ Clear separation of concerns
- ✅ Easy to add new routes
- ✅ Single point for middleware (CORS, auth, etc.)

## 🐛 Troubleshooting

### Issue: "Too many functions" error
**Solution:** Verify `vercel.json` specifies only `api/index.js`

### Issue: 404 on all routes
**Solution:** Check that `api/index.js` is exporting default handler

### Issue: CORS errors
**Solution:** Verify `FRONTEND_URL` environment variable is set in Vercel dashboard

### Issue: Module import errors
**Solution:** Ensure all imports use `.js` extension (ES modules)

## 📚 Related Documentation
- [DEPLOYMENT_REFACTOR.md](./DEPLOYMENT_REFACTOR.md) - Detailed technical changes
- [REFACTOR_SUMMARY.md](./REFACTOR_SUMMARY.md) - Quick reference
- [VERIFICATION_CHECKLIST.md](./VERIFICATION_CHECKLIST.md) - Deployment checklist
- [README.md](./README.md) - Project README

## 🤝 Contributing
When adding new API routes:
1. Create handler in appropriate subdirectory (e.g., `api/routes/`)
2. Import handler in `api/index.js`
3. Add route matching logic in main handler
4. Use `sendSuccess()` and `sendError()` for responses
5. Test locally before deploying

## 📝 Notes
- All files in `api/` are imported as modules (not deployed as functions)
- Only `api/index.js` is a serverless function
- Response format: `{success: true/false, data/error: {...}}`
- CORS is handled globally in `api/index.js`
- Sessions are managed in-memory (1-hour expiration)
