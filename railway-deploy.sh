#!/bin/bash
# Railway deployment script - skip build, use pre-built files
echo "Starting deployment with pre-built files..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Files in dist/public:"
ls -la dist/public/ || echo "dist/public not found"
echo "Starting server..."
npm start
