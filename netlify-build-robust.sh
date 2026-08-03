#!/bin/bash

set -e  # Exit on any error

echo "🚀 Netlify Build Process Starting..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Working directory: $(pwd)"
echo "Environment: $NODE_ENV"

# Check if package.json exists
if [ ! -f "package.json" ]; then
  echo "❌ package.json not found!"
  exit 1
fi

# Clean any existing build artifacts
echo "🧹 Cleaning previous builds..."
rm -rf dist node_modules/.cache .vite || true

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --legacy-peer-deps --production=false --no-audit --no-fund

# Verify Vite is available
echo "🔍 Checking Vite installation..."
if ! npx vite --version; then
  echo "❌ Vite not found! Installing Vite..."
  npm install vite@latest --save-dev
fi

# Build the application
echo "⚡ Building application..."
npm run build

# Verify build output
echo "📁 Build output verification:"
if [ -d "dist/public" ]; then
  ls -la dist/public/
  echo "✅ Build output directory exists"
else
  echo "❌ Build output directory not found!"
  exit 1
fi

if [ -f "dist/public/index.html" ]; then
  echo "✅ index.html found"
else
  echo "❌ index.html not found!"
  exit 1
fi

echo "✅ Netlify build complete!"
