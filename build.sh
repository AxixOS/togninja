#!/bin/bash

echo "🔨 Starting build process..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Working directory: $(pwd)"

# Clean any previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist node_modules/.cache

# Install dependencies with legacy peer deps support
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps --no-audit --no-fund

# Check if vite is available
echo "🔍 Checking Vite availability..."
npx vite --version

# Build the client
echo "⚡ Building client..."
npm run build:client

echo "✅ Build completed successfully!"
