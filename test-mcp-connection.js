#!/usr/bin/env node
/**
 * Test script to debug MCP connection issues
 * Run with: node test-mcp-connection.js <SERVER_URL> [HEADERS_JSON]
 */

import { MCPClient } from './server/10-mcp-client.js';

const serverUrl = process.argv[2];
const headersArg = process.argv[3];

if (!serverUrl) {
    console.error('Usage: node test-mcp-connection.js <SERVER_URL> [HEADERS_JSON]');
    console.error('');
    console.error('Examples:');
    console.error('  node test-mcp-connection.js http://localhost:3000/mcp');
    console.error('  node test-mcp-connection.js http://localhost:3000/mcp \'{"Authorization":"Bearer token"}\'');
    process.exit(1);
}

let headers = {};
if (headersArg) {
    try {
        headers = JSON.parse(headersArg);
    } catch (e) {
        console.error('Invalid JSON in headers argument:', e.message);
        process.exit(1);
    }
}

console.log('='.repeat(60));
console.log('MCP Connection Test');
console.log('='.repeat(60));
console.log('');
console.log('Server URL:', serverUrl);
console.log('Headers:', JSON.stringify(headers, null, 2));
console.log('');

const client = new MCPClient(serverUrl, headers);

async function test() {
    try {
        console.log('Attempting to initialize connection...');
        const initResult = await client.initialize();
        console.log('✅ Initialize successful!');
        console.log('Server info:', JSON.stringify(initResult.serverInfo, null, 2));
        console.log('Capabilities:', JSON.stringify(initResult.capabilities, null, 2));
        console.log('');

        console.log('Fetching tools...');
        const toolsResult = await client.listTools();
        console.log('✅ Tools fetched successfully!');
        console.log('Tool count:', toolsResult.tools?.length || 0);
        console.log('');

        if (toolsResult.tools && toolsResult.tools.length > 0) {
            console.log('Available tools:');
            toolsResult.tools.forEach((tool, index) => {
                console.log(`  ${index + 1}. ${tool.name}`);
                if (tool.description) {
                    console.log(`     Description: ${tool.description}`);
                }
            });
        }
        console.log('');
        console.log('✅ All tests passed!');

    } catch (err) {
        console.log('');
        console.log('❌ Connection failed!');
        console.log('');
        console.log('Error:', err.message);
        console.log('');

        if (err.status) {
            console.log(`HTTP Status: ${err.status} ${err.statusText || ''}`);
        }

        if (err.body) {
            console.log('Response body:', err.body);
        }

        if (err.isHtmlResponse) {
            console.log('');
            console.log('⚠️  Server returned HTML instead of JSON');
            console.log('This typically means:');
            console.log('  - Wrong URL or path');
            console.log('  - CORS restrictions');
            console.log('  - Server expects different request format');
        }

        if (err.status === 401) {
            console.log('');
            console.log('🔐 401 Unauthorized');
            console.log('');
            console.log('Possible causes:');
            console.log('  1. Server requires authentication - try with headers');
            console.log('  2. Unwanted headers being sent - try empty headers object {}');
            console.log('  3. Server expects specific headers format');
            console.log('');
            console.log('Debug suggestions:');
            console.log('  - Check server logs for exact rejection reason');
            console.log('  - Try accessing URL in browser to see expected format');
            console.log('  - Use curl: curl -X POST <URL> -H "Content-Type: application/json" -d \'{"jsonrpc":"2.0","id":"test","method":"initialize","params":{}}\'');
        }

        process.exit(1);
    }
}

test();
