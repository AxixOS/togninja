#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

async function createDeploymentConfig() {
  console.log('🔧 Creating deployment configuration files...');

  // Create production package.json for deployment
  const productionPackageJson = {
    "name": "photography-crm-demo",
    "version": "1.0.0",
    "type": "module",
    "engines": {
      "node": ">=18.0.0"
    },
    "scripts": {
      "start": "node index.js",
      "dev": "node index.js"
    },
    "dependencies": {
      "@neondatabase/serverless": "^0.9.0",
      "drizzle-orm": "^0.29.3",
      "drizzle-zod": "^0.5.1",
      "express": "^4.18.2",
      "express-session": "^1.17.3",
      "connect-pg-simple": "^9.0.1",
      "passport": "^0.7.0",
      "passport-local": "^1.0.0",
      "node-fetch": "^3.3.2",
      "jsdom": "^23.2.0",
      "papaparse": "^5.4.1",
      "uuid": "^9.0.1",
      "date-fns": "^3.2.0",
      "zod": "^3.22.4",
      "nanoid": "^5.0.4"
    }
  };

  // Create Dockerfile for containerized deployment
  const dockerfile = `# Production Dockerfile for Photography CRM
FROM node:18-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY public ./public
COPY index.js ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "index.js"]`;

  // Create Cloud Run deployment config
  const cloudRunConfig = {
    "apiVersion": "serving.knative.dev/v1",
    "kind": "Service",
    "metadata": {
      "name": "photography-crm",
      "annotations": {
        "run.googleapis.com/ingress": "all"
      }
    },
    "spec": {
      "template": {
        "metadata": {
          "annotations": {
            "run.googleapis.com/execution-environment": "gen2"
          }
        },
        "spec": {
          "containerConcurrency": 80,
          "timeoutSeconds": 300,
          "containers": [{
            "image": "gcr.io/PROJECT_ID/photography-crm",
            "ports": [{
              "name": "http1",
              "containerPort": 3000
            }],
            "env": [
              {
                "name": "NODE_ENV",
                "value": "production"
              },
              {
                "name": "PORT",
                "value": "3000"
              }
            ],
            "resources": {
              "limits": {
                "cpu": "1000m",
                "memory": "512Mi"
              }
            }
          }]
        }
      }
    }
  };

  // Create deployment script
  const deployScript = `#!/bin/bash

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

echo "🎉 Deployment preparation complete!"`;

  try {
    // Ensure scripts directory exists
    await fs.mkdir('scripts', { recursive: true });
    
    // Write all deployment files
    await Promise.all([
      fs.writeFile('scripts/deployment-package.json', JSON.stringify(productionPackageJson, null, 2)),
      fs.writeFile('scripts/Dockerfile', dockerfile),
      fs.writeFile('scripts/cloud-run.yaml', JSON.stringify(cloudRunConfig, null, 2)),
      fs.writeFile('scripts/deploy.sh', deployScript),
    ]);

    // Make deploy script executable
    await fs.chmod('scripts/deploy.sh', 0o755);

    console.log('✅ Deployment configuration created:');
    console.log('  - scripts/deployment-package.json (Production dependencies)');
    console.log('  - scripts/Dockerfile (Container deployment)');
    console.log('  - scripts/cloud-run.yaml (Google Cloud Run config)');
    console.log('  - scripts/deploy.sh (Deployment script)');

  } catch (error) {
    console.error('❌ Failed to create deployment config:', error.message);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createDeploymentConfig().catch((error) => {
    console.error('Configuration creation failed:', error);
    process.exit(1);
  });
}

export { createDeploymentConfig };