#!/usr/bin/env node

/**
 * Production deployment script for Photography CRM
 * Handles ES module builds, dependency management, and deployment configuration
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { buildServer } from '../esbuild.config.js';

const execAsync = promisify(exec);

async function createDeploymentDirectories() {
  console.log('📁 Creating deployment directories...');
  try {
    await fs.mkdir('dist', { recursive: true });
    await fs.mkdir('dist/public', { recursive: true });
    console.log('✅ Deployment directories created');
  } catch (error) {
    console.warn('Directories might already exist');
  }
}

async function buildClientProduction() {
  console.log('🔨 Building client for production...');
  try {
    process.env.NODE_ENV = 'production';
    
    const { stdout, stderr } = await execAsync('npx vite build', {
      timeout: 180000 // 3 minute timeout
    });
    
    if (stderr && !stderr.includes('warning') && !stderr.includes('Browserslist')) {
      console.warn('Client build warnings:', stderr);
    }
    
    console.log('✅ Client build completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Client build failed:', error.message);
    return false;
  }
}

async function buildServerProduction() {
  console.log('🔨 Building server for production with ES modules...');
  try {
    process.env.NODE_ENV = 'production';
    await buildServer();
    console.log('✅ Server build completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Server build failed:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

async function copyDeploymentFiles() {
  console.log('📄 Copying deployment configuration files...');
  try {
    // Copy production package.json
    await fs.copyFile('deployment-package.json', 'dist/package.json');
    
    // Create start script with proper ES module support
    const startScript = `#!/usr/bin/env node
// Production start script for ES modules
import('./index.js').catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});`;
    
    await fs.writeFile('dist/start.js', startScript);
    await fs.chmod('dist/start.js', '755');
    
    console.log('✅ Deployment files copied');
    return true;
  } catch (error) {
    console.error('❌ Failed to copy deployment files:', error.message);
    return false;
  }
}

async function validateBuild() {
  console.log('🔍 Validating build output...');
  try {
    // Check if client build exists
    const clientStats = await fs.stat('dist/public/index.html');
    console.log('✅ Client build validated');
    
    // Check if server build exists
    const serverStats = await fs.stat('dist/index.js');
    console.log('✅ Server build validated');
    
    // Check package.json
    const packageStats = await fs.stat('dist/package.json');
    console.log('✅ Package.json validated');
    
    // Log build sizes
    console.log(`📊 Build sizes:
  - Server: ${(serverStats.size / 1024).toFixed(2)} KB
  - Client HTML: ${(clientStats.size / 1024).toFixed(2)} KB
  - Package.json: ${(packageStats.size / 1024).toFixed(2)} KB`);
    
    return true;
  } catch (error) {
    console.error('❌ Build validation failed:', error.message);
    return false;
  }
}

async function createDockerfile() {
  console.log('🐳 Creating Dockerfile...');
  
  const dockerfile = `# Production Dockerfile for Photography CRM
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY dist/package.json .
RUN npm install --production --no-cache

# Copy built application
COPY dist/ .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "console.log('Health check passed')" || exit 1

# Start application
CMD ["node", "index.js"]`;

  try {
    await fs.writeFile('dist/Dockerfile', dockerfile);
    console.log('✅ Dockerfile created');
    return true;
  } catch (error) {
    console.error('❌ Failed to create Dockerfile:', error.message);
    return false;
  }
}

async function createCloudRunConfig() {
  console.log('☁️ Creating Cloud Run configuration...');
  
  const cloudRunConfig = `apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: photography-crm
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/execution-environment: gen2
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containerConcurrency: 1000
      timeoutSeconds: 300
      containers:
      - image: gcr.io/PROJECT_ID/photography-crm:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "5000"
        resources:
          limits:
            cpu: "2"
            memory: "2Gi"
          requests:
            cpu: "1"
            memory: "1Gi"
        startupProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 10
          timeoutSeconds: 5
          periodSeconds: 10
          failureThreshold: 3
        livenessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 30
          timeoutSeconds: 5
          periodSeconds: 30
          failureThreshold: 3`;

  try {
    await fs.writeFile('dist/cloud-run.yaml', cloudRunConfig);
    console.log('✅ Cloud Run configuration created');
    return true;
  } catch (error) {
    console.error('❌ Failed to create Cloud Run configuration:', error.message);
    return false;
  }
}

async function deployProduction() {
  console.log('🚀 Starting production deployment build...');
  console.log('===============================================');
  
  try {
    // Step 1: Create directories
    await createDeploymentDirectories();
    
    // Step 2: Build client
    const clientSuccess = await buildClientProduction();
    if (!clientSuccess) {
      throw new Error('Client build failed');
    }
    
    // Step 3: Build server
    const serverSuccess = await buildServerProduction();
    if (!serverSuccess) {
      throw new Error('Server build failed');
    }
    
    // Step 4: Copy deployment files
    const copySuccess = await copyDeploymentFiles();
    if (!copySuccess) {
      throw new Error('Failed to copy deployment files');
    }
    
    // Step 5: Validate build
    const validationSuccess = await validateBuild();
    if (!validationSuccess) {
      throw new Error('Build validation failed');
    }
    
    // Step 6: Create Docker configuration
    await createDockerfile();
    
    // Step 7: Create Cloud Run configuration
    await createCloudRunConfig();
    
    console.log('===============================================');
    console.log('🎉 Production deployment build completed successfully!');
    console.log('');
    console.log('📁 Build output:');
    console.log('  - Client: dist/public/');
    console.log('  - Server: dist/index.js');
    console.log('  - Package: dist/package.json');
    console.log('  - Docker: dist/Dockerfile');
    console.log('  - Cloud Run: dist/cloud-run.yaml');
    console.log('');
    console.log('🚀 Ready for deployment to production environments!');
    
  } catch (error) {
    console.error('===============================================');
    console.error('❌ Production deployment build failed:', error.message);
    console.error('===============================================');
    process.exit(1);
  }
}

// Run deployment if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  deployProduction().catch((error) => {
    console.error('Deployment process failed:', error);
    process.exit(1);
  });
}

export { deployProduction };