#!/bin/bash
# Quick route testing script for local verification
# Run this after starting the server with: node test-server.js

echo "Testing API Routes..."
echo ""

BASE_URL="http://localhost:3000"

echo "1. Testing /api/llm/services (GET)..."
curl -s -X GET "$BASE_URL/api/llm/services" | jq '.'
echo ""

echo "2. Testing /api/llm/key (POST - Save Key)..."
curl -s -X POST "$BASE_URL/api/llm/key" \
  -H "Content-Type: application/json" \
  -d '{"serviceName":"openrouter","apiKey":"test_key_123"}' | jq '.'
echo ""

echo "3. Testing /api/llm/services (GET - Should show 1 service)..."
curl -s -X GET "$BASE_URL/api/llm/services" | jq '.'
echo ""

echo "4. Testing /api/llm/key (DELETE - Remove Key)..."
curl -s -X DELETE "$BASE_URL/api/llm/key" \
  -H "Content-Type: application/json" \
  -d '{"serviceName":"openrouter"}' | jq '.'
echo ""

echo "5. Testing 404 handling..."
curl -s -X GET "$BASE_URL/api/invalid/route" | jq '.'
echo ""

echo "6. Testing method not allowed..."
curl -s -X GET "$BASE_URL/api/mcp/call" | jq '.'
echo ""

echo "All tests completed!"
