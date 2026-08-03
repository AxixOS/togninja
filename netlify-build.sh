# Netlify deployment script
#!/bin/bash

echo "🚀 Netlify Build Process Starting..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --legacy-peer-deps --no-audit --no-fund

# Build the application
echo "⚡ Building application for Netlify..."
npx vite build --mode production

# Verify build output
echo "📁 Build output verification:"
ls -la dist/public/

echo "✅ Netlify build complete!"
