#!/bin/bash

# Test script for Rust backend service

echo "=== Testing Yes Sessions Backend ==="

# Wait for service to start
sleep 2

# Test health endpoint
echo -e "\n[1/5] Testing health endpoint..."
curl -s http://localhost:3000/health | jq .

# Test sessions endpoint
echo -e "\n[2/5] Testing sessions endpoint..."
curl -s http://localhost:3000/api/sessions/opencode | jq .

# Test settings endpoint
echo -e "\n[3/5] Testing settings endpoint..."
curl -s http://localhost:3000/api/settings | jq .

# Test settings update
echo -e "\n[4/5] Testing settings update..."
curl -s -X POST http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"theme": "dark"}' | jq .

# Test terminal creation
echo -e "\n[5/5] Testing terminal creation..."
curl -s -X POST http://localhost:3000/api/terminal \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-123", "cwd": "~"}' | jq .

echo -e "\n=== Test Complete ==="