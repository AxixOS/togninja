#!/bin/bash

# Deployment script for Photography CRM
set -e

echo "🚀 Starting deployment process..."

# Build application
echo "📦 Building application..."
node scripts/build-production.js

# Create deployment directory
mkdir -p deploy
cd deploy

# Copy built files
cp -r ../dist/public ./public
cp ../dist/index.js ./index.js
cp ../scripts/deployment-package.json ./package.json
cp ../scripts/Dockerfile ./Dockerfile

echo "✅ Deployment package ready in ./deploy/"
echo "📋 Contents:"
ls -la

echo "🔧 Next steps:"
echo "1. Upload deploy/ directory to your hosting platform"
echo "2. Set environment variables (DATABASE_URL, etc.)"
echo "3. Run 'npm ci --only=production' on the server"
echo "4. Run 'npm start' to start the application"

echo "🎉 Deployment preparation complete!"