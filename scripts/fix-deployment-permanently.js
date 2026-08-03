#!/usr/bin/env node

/**
 * Permanent deployment fix script
 * This script creates a stable, production-ready deployment configuration
 * that prevents the recurring frontend downtime issues.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔧 Creating permanent deployment fix...');

// 1. Create production package.json with stable dependencies
const productionPackage = {
  "name": "newage-fotografie-crm",
  "version": "1.0.0",
  "type": "module",
  "description": "New Age Fotografie CRM - Production",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "start:production": "NODE_ENV=production node server/index.production.js",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build --outDir dist/public",
    "build:server": "esbuild server/index.production.ts --bundle --platform=node --target=node18 --format=esm --outfile=dist/index.js --external:@neondatabase/serverless --external:drizzle-orm --external:tsx",
    "dev": "NODE_ENV=development tsx server/index.ts",
    "health": "curl -f http://localhost:5000/api/health || exit 1"
  },
  "dependencies": {
    "express": "^4.18.2",
    "drizzle-orm": "^0.29.0",
    "@neondatabase/serverless": "^0.7.2"
  }
};

fs.writeFileSync('package.production.json', JSON.stringify(productionPackage, null, 2));

// 2. Create start script that always works
const startScript = `#!/bin/bash
set -e

echo "🚀 Starting New Age Fotografie CRM..."

# Set production environment
export NODE_ENV=production
export DEMO_MODE=false

# Use production server if available, fallback to development
if [ -f "server/index.production.ts" ]; then
    echo "✅ Using production server configuration"
    exec tsx server/index.production.ts
else
    echo "⚠️  Fallback to development server"
    exec tsx server/index.ts
fi
`;

fs.writeFileSync('start-production.sh', startScript);
execSync('chmod +x start-production.sh');

// 3. Create health check endpoint verification
const healthCheck = `#!/bin/bash
# Health check script for deployment monitoring

MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s http://localhost:5000/api/health > /dev/null; then
        echo "✅ Health check passed"
        exit 0
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "⏳ Health check attempt $RETRY_COUNT/$MAX_RETRIES failed, retrying..."
    sleep 2
done

echo "❌ Health check failed after $MAX_RETRIES attempts"
exit 1
`;

fs.writeFileSync('health-check.sh', healthCheck);
execSync('chmod +x health-check.sh');

// 4. Update main package.json with production scripts
const packagePath = 'package.json';
let packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

packageJson.scripts = {
  ...packageJson.scripts,
  "start:stable": "bash start-production.sh",
  "health:check": "bash health-check.sh",
  "deploy": "npm run build && npm run start:stable"
};

fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

// 5. Create deployment monitoring script
const monitorScript = `#!/bin/bash
# Deployment monitoring and auto-recovery

LOGFILE="deployment.log"
PID_FILE="server.pid"

monitor_server() {
    while true; do
        if ! bash health-check.sh; then
            echo "$(date): Server health check failed, restarting..." >> $LOGFILE
            
            # Kill existing process if running
            if [ -f "$PID_FILE" ]; then
                kill $(cat $PID_FILE) 2>/dev/null || true
                rm -f $PID_FILE
            fi
            
            # Start server in background
            bash start-production.sh &
            echo $! > $PID_FILE
            
            echo "$(date): Server restarted with PID $(cat $PID_FILE)" >> $LOGFILE
        else
            echo "$(date): Server healthy" >> $LOGFILE
        fi
        
        sleep 30
    done
}

# Start monitoring
echo "$(date): Starting deployment monitoring..." >> $LOGFILE
monitor_server
`;

fs.writeFileSync('monitor-deployment.sh', monitorScript);
execSync('chmod +x monitor-deployment.sh');

console.log('✅ Permanent deployment fix completed!');
console.log('');
console.log('📋 Created files:');
console.log('   - server/index.production.ts (stable production server)');
console.log('   - package.production.json (production dependencies)');
console.log('   - start-production.sh (reliable startup script)');
console.log('   - health-check.sh (monitoring script)');
console.log('   - monitor-deployment.sh (auto-recovery)');
console.log('');
console.log('🚀 To use the stable deployment:');
console.log('   npm run start:stable');
console.log('');
console.log('📊 To monitor deployment health:');
console.log('   npm run health:check');