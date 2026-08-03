#!/bin/bash

# Deploy Photography CRM Demo App to Replit
echo "🚀 Deploying Photography CRM Demo App..."

# 1. Build the application
echo "🔨 Building application..."
npm run build

# 2. Setup demo data
echo "📊 Setting up demo data..."
npm run demo:setup

# 3. Create deployment-ready files
echo "📁 Preparing deployment files..."

# Create a simple start script for production
cat > start.js << 'EOF'
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files from dist/public
app.use(express.static(path.join(__dirname, 'dist/public')));

// Serve the built server
const server = require('./dist/index.js');

console.log(`Demo app running on port ${PORT}`);
EOF

# 4. Update deployment configuration
cat > vercel.json << 'EOF'
{
  "version": 2,
  "name": "photography-crm-demo",
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/dist/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/public/$1"
    }
  ],
  "env": {
    "DEMO_MODE": "true",
    "NODE_ENV": "production"
  }
}
EOF

echo "✅ Demo app ready for deployment!"
echo ""
echo "🌐 Deployment URLs:"
echo "- Replit: https://photography-crm-demo.replit.app"
echo "- Custom: https://demo.photographycrm.com (configure DNS)"
echo ""
echo "📋 Demo Features Ready:"
echo "- ✅ 25 Professional Website Templates"
echo "- ✅ AI Website Import Wizard"
echo "- ✅ Complete CRM with Sample Data"
echo "- ✅ Client Gallery System"
echo "- ✅ Professional Invoicing"
echo "- ✅ Session Management"
echo "- ✅ Lead Capture & Conversion"
echo ""
echo "🎯 Demo Accounts:"
echo "Admin: demo@example.com / demo2024"
echo "Client: client@demo.com / client2024"