#!/usr/bin/env node
/**
 * Simple test server to verify API routing works correctly
 * This simulates how Vercel will handle requests to api/index.js
 */

import http from 'http';
import handler from './api/index.js';

const PORT = 3000;

const server = http.createServer(async (req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    // Simulate Vercel request/response
    try {
        await handler(req, res);
    } catch (err) {
        console.error('Handler error:', err);
        if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Internal server error', details: err.message }));
        }
    }
});

server.listen(PORT, () => {
    console.log(`Test server running at http://localhost:${PORT}`);
    console.log('\nTest the following endpoints:');
    console.log('  POST   http://localhost:3000/api/mcp/connect');
    console.log('  POST   http://localhost:3000/api/mcp/call');
    console.log('  POST   http://localhost:3000/api/mcp/disconnect');
    console.log('  GET    http://localhost:3000/api/mcp/tools');
    console.log('  POST   http://localhost:3000/api/council/consensus');
    console.log('  POST   http://localhost:3000/api/llm/key');
    console.log('  GET    http://localhost:3000/api/llm/services');
    console.log('  DELETE http://localhost:3000/api/llm/key');
    console.log('\nPress Ctrl+C to stop');
});
