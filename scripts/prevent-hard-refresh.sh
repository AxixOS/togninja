#!/bin/bash

# Comprehensive Hard Refresh Prevention Script
# Implements the three-step solution to prevent data loss during AI agent file changes

echo "🛡️  Setting up hard refresh prevention..."

# Step 1: Build production version without file watching
echo "📦 Building production bundle..."
npm run build:client
npm run build:server

# Step 2: Start keep-alive service
echo "💓 Starting keep-alive service on port 5001..."
node keepalive.js &
KEEPALIVE_PID=$!

# Step 3: Start production server without file watching
echo "🚀 Starting production server on port 5000..."
NODE_ENV=production PORT=5000 tsx server/index.ts &
SERVER_PID=$!

# Monitor processes
echo "✅ Hard refresh prevention active:"
echo "   - Keep-alive PID: $KEEPALIVE_PID"
echo "   - Server PID: $SERVER_PID"
echo "   - AI agent file changes will NOT restart server"
echo "   - Draft auto-save protects user work"
echo "   - Container stays warm with keep-alive pings"

# Wait for either process to exit
wait $SERVER_PID