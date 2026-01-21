# Pre-Deployment Verification Checklist

## Configuration Files
- [x] `vercel.json` updated to use `api/index.js` (not glob pattern)
- [x] `.gitignore` properly configured
- [x] `package.json` has correct scripts

## Code Quality
- [x] All .js files pass syntax validation
- [x] No circular dependencies
- [x] Consistent error handling pattern across all routes
- [x] CORS middleware applied to all routes

## API Routes Testing (Local)
- [x] `/api/llm/services` (GET) - Returns services list
- [x] `/api/llm/key` (POST) - Saves API key
- [x] `/api/llm/key` (DELETE) - Removes API key
- [x] `/api/mcp/connect` (POST) - Connects to MCP server
- [x] `/api/mcp/call` (POST) - Calls MCP tool
- [x] `/api/mcp/disconnect` (POST) - Disconnects from server
- [x] `/api/mcp/tools` (GET) - Lists available tools
- [x] `/api/council/consensus` (POST) - LLM Council consensus
- [x] Unknown routes return 404

## Post-Deployment Verification (To Do After Deploy)

### Vercel Dashboard Checks
- [ ] Only 1 serverless function shown in Functions tab
- [ ] Function size is within limits
- [ ] No deployment warnings or errors
- [ ] Environment variables are set correctly

### Live API Testing
Use these curl commands to test after deployment:

```bash
# Replace YOUR_DOMAIN with your actual Vercel domain

# Test LLM services endpoint
curl -X GET https://YOUR_DOMAIN/api/llm/services

# Test 404 handling
curl -X GET https://YOUR_DOMAIN/api/invalid-route

# Test CORS (from allowed origin)
curl -X OPTIONS https://YOUR_DOMAIN/api/llm/services \
  -H "Origin: YOUR_FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET"
```

### Frontend Integration Testing
- [ ] Can connect to MCP servers
- [ ] Can list and call tools
- [ ] Can manage LLM API keys
- [ ] Council mode works correctly
- [ ] Chat history persists correctly
- [ ] Error messages display properly

### Monitoring
- [ ] Check Vercel logs for any runtime errors
- [ ] Monitor function execution time
- [ ] Verify CORS is working for frontend domain
- [ ] Check for any memory issues

## Rollback Plan
If deployment fails:
1. Revert `vercel.json` changes
2. Redeploy previous version
3. Review deployment logs for errors

## Success Criteria
✅ Deployment completes without errors
✅ Only 1 serverless function created
✅ All API endpoints return expected responses
✅ Frontend can communicate with backend
✅ No console errors in browser
✅ No 500 errors in Vercel logs
