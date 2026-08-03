#!/usr/bin/env node

/**
 * Comprehensive deployment path fix script
 * Addresses all package.json location and file path issues for Replit deployment
 */

import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function copyPackageJsonToAllLocations() {
  console.log('📦 Copying package.json to all required deployment locations...');
  
  const sourcePackageJsonPath = 'package.json';
  const deploymentPackageJsonPath = 'dist/package.json';
  
  // Deployment target locations where the application might look for package.json
  const targetLocations = [
    '/home/runner/package.json',
    '/home/runner/workspace/package.json',
    './dist/package.json',
    './package.json'
  ];
  
  try {
    // Read the main package.json
    const mainPackageJson = JSON.parse(await fs.readFile(sourcePackageJsonPath, 'utf8'));
    
    // Read the deployment package.json 
    const deploymentPackageJson = JSON.parse(await fs.readFile(deploymentPackageJsonPath, 'utf8'));
    
    // Copy main package.json to workspace root locations
    for (const targetPath of ['/home/runner/package.json', '/home/runner/workspace/package.json']) {
      try {
        // Ensure directory exists
        const targetDir = path.dirname(targetPath);
        if (!existsSync(targetDir)) {
          mkdirSync(targetDir, { recursive: true });
        }
        
        await fs.writeFile(targetPath, JSON.stringify(mainPackageJson, null, 2));
        console.log(`✅ Copied main package.json to ${targetPath}`);
      } catch (error) {
        console.warn(`⚠️  Could not copy to ${targetPath}:`, error.message);
      }
    }
    
    // Ensure deployment package.json is in dist/ folder
    await fs.writeFile('dist/package.json', JSON.stringify(deploymentPackageJson, null, 2));
    console.log('✅ Deployment package.json confirmed in dist/ folder');
    
  } catch (error) {
    console.error('❌ Failed to copy package.json files:', error.message);
    throw error;
  }
}

async function updateStartScripts() {
  console.log('🔧 Creating optimized start scripts for deployment...');
  
  // Create start.mjs that can handle different working directories
  const startScript = `#!/usr/bin/env node

// ES Module startup script with flexible path resolution
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try different possible locations for the application
const possiblePaths = [
  resolve(__dirname, 'index.js'),
  resolve(__dirname, 'dist/index.js'),
  resolve(process.cwd(), 'index.js'),
  resolve(process.cwd(), 'dist/index.js'),
  resolve('/home/runner/workspace/dist/index.js'),
  resolve('/home/runner/workspace/index.js')
];

console.log('🎯 New Age Fotografie CRM - Starting Production Server');
console.log('Working directory:', process.cwd());
console.log('Script location:', __dirname);

let serverPath = null;
for (const path of possiblePaths) {
  if (existsSync(path)) {
    serverPath = path;
    console.log('✅ Found server at:', serverPath);
    break;
  }
}

if (!serverPath) {
  console.error('❌ Could not locate server file. Tried paths:');
  possiblePaths.forEach(path => console.error('  -', path));
  process.exit(1);
}

// Ensure proper environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || '5000';

// Start the server
try {
  await import(serverPath);
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  console.error(error.stack);
  process.exit(1);
}
`;
  
  await fs.writeFile('start.mjs', startScript);
  await fs.writeFile('dist/start.mjs', startScript);
  console.log('✅ Created flexible start.mjs scripts');
  
  // Create simple start.js for Node.js environments that prefer .js
  const startJs = `// CommonJS fallback start script
const { spawn } = require('child_process');
const path = require('path');

console.log('🎯 Starting via CommonJS fallback...');

const startMjs = path.resolve(__dirname, 'start.mjs');
const child = spawn('node', [startMjs], {
  stdio: 'inherit',
  env: { ...process.env }
});

child.on('exit', (code) => {
  process.exit(code);
});
`;
  
  await fs.writeFile('start.js', startJs);
  await fs.writeFile('dist/start.js', startJs);
  console.log('✅ Created CommonJS fallback start.js scripts');
}

async function updateDeploymentConfiguration() {
  console.log('⚙️  Updating deployment configuration files...');
  
  // Update deployment package.json with flexible start options
  const deploymentPackageJson = {
    "name": "newage-fotografie-crm",
    "version": "1.0.0",
    "description": "New Age Fotografie - Professional Photography Studio CRM System",
    "type": "module",
    "main": "index.js",
    "engines": {
      "node": ">=18.0.0"
    },
    "scripts": {
      "start": "node start.mjs",
      "start:fallback": "node start.js",
      "start:direct": "NODE_ENV=production node index.js",
      "dev": "NODE_ENV=development node index.js"
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
      "zod": "^3.22.4"
    }
  };
  
  await fs.writeFile('dist/package.json', JSON.stringify(deploymentPackageJson, null, 2));
  console.log('✅ Updated deployment package.json with flexible start scripts');
  
  // Create deployment-specific Dockerfile that handles path resolution
  const dockerfile = `# Production Dockerfile with flexible path resolution
FROM node:18-alpine

# Create app directory with proper permissions
WORKDIR /app

# Copy package.json files to multiple locations for flexibility
COPY dist/package.json ./package.json
COPY dist/package.json /home/node/package.json

# Copy built application files
COPY dist/ ./

# Install production dependencies
RUN npm ci --only=production --silent && \\
    npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nextjs -u 1001 -G nodejs

# Set ownership and permissions
RUN chown -R nextjs:nodejs /app /home/node
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \\
  CMD node -e "import('http').then(h => h.get('http://localhost:5000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1)))"

# Expose port
EXPOSE 5000

# Multiple start command options
ENV NODE_ENV=production
ENV PORT=5000

# Use the flexible start script
CMD ["node", "start.mjs"]
`;
  
  await fs.writeFile('Dockerfile', dockerfile);
  console.log('✅ Created deployment-optimized Dockerfile');
}

async function validateDeploymentStructure() {
  console.log('🔍 Validating deployment file structure...');
  
  const requiredFiles = [
    'dist/index.js',
    'dist/package.json',
    'dist/start.mjs',
    'dist/public/index.html',
    'package.json',
    'start.mjs'
  ];
  
  const missingFiles = [];
  for (const file of requiredFiles) {
    if (!existsSync(file)) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required deployment files:');
    missingFiles.forEach(file => console.error(`  - ${file}`));
    return false;
  }
  
  console.log('✅ All required deployment files are present');
  
  // Test that the server bundle is valid ES module
  try {
    const { stdout } = await execAsync('node -e "import(\'./dist/index.js\').then(() => console.log(\'✅ Server bundle is valid\'), () => console.log(\'❌ Server bundle invalid\'))"');
    console.log('Server validation:', stdout.trim());
  } catch (error) {
    console.warn('⚠️  Could not validate server bundle:', error.message);
  }
  
  return true;
}

async function fixDeploymentPaths() {
  console.log('🚀 Starting comprehensive deployment path fix...');
  console.log('==========================================');
  
  try {
    // Step 1: Copy package.json to all required locations
    await copyPackageJsonToAllLocations();
    
    // Step 2: Create optimized start scripts
    await updateStartScripts();
    
    // Step 3: Update deployment configuration
    await updateDeploymentConfiguration();
    
    // Step 4: Validate the deployment structure
    const isValid = await validateDeploymentStructure();
    
    if (isValid) {
      console.log('');
      console.log('🎉 Deployment path fix completed successfully!');
      console.log('==========================================');
      console.log('✅ package.json copied to all required locations');
      console.log('✅ Flexible start scripts created');
      console.log('✅ Deployment configuration updated');
      console.log('✅ File structure validated');
      console.log('');
      console.log('Deployment ready! You can now:');
      console.log('• Use "npm start" to run with flexible path resolution');
      console.log('• Deploy to any Node.js v18+ environment');
      console.log('• Use Docker with the updated Dockerfile');
    } else {
      console.error('❌ Deployment validation failed. Please check missing files.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Deployment path fix failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the fix if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixDeploymentPaths().catch(console.error);
}

export { fixDeploymentPaths };