#!/usr/bin/env node

/**
 * Quick deployment fix for ES module configuration issues
 * Addresses the specific problems mentioned in the error
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function createESModuleCompatibleConfig() {
  console.log('🔧 Creating ES module compatible configuration...');
  
  // Create a deployment-specific vite config without async imports
  const deploymentViteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "client", "src"),
      "@shared": path.resolve(process.cwd(), "shared"),
      "@assets": path.resolve(process.cwd(), "attached_assets"),
    },
  },
  root: path.resolve(process.cwd(), "client"),
  build: {
    outDir: path.resolve(process.cwd(), "dist/public"),
    emptyOutDir: true,
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
  },
  esbuild: {
    target: 'es2020',
    format: 'esm',
  },
});`;

  fs.writeFileSync('vite.deployment.config.js', deploymentViteConfig);
  console.log('✅ Created deployment-specific Vite config');
}

async function buildServerWithFixes() {
  console.log('🔨 Building server with ES module fixes...');
  try {
    const { stdout, stderr } = await execAsync('node esbuild.config.js');
    console.log('✅ Server build completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Server build failed:', error.message);
    return false;
  }
}

async function createStartupScript() {
  const startupScript = `#!/usr/bin/env node

// ES Module startup script for deployment
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set deployment environment
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.DEMO_MODE = process.env.DEMO_MODE || 'true';

// Import and start the server
import('./dist/index.js')
  .then(() => {
    console.log('✅ Server started successfully');
  })
  .catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
`;

  fs.writeFileSync('start.mjs', startupScript);
  console.log('📝 Created ES module startup script');
}

async function validateESModuleSupport() {
  console.log('🔍 Validating ES module support...');
  
  const testScript = `
import { fileURLToPath } from 'url';
console.log('✅ import.meta.url support:', typeof import.meta.url);
console.log('✅ ES modules working correctly');
`;
  
  fs.writeFileSync('test-esm.mjs', testScript);
  
  try {
    await execAsync('node test-esm.mjs');
    fs.unlinkSync('test-esm.mjs');
    console.log('✅ ES module support validated');
    return true;
  } catch (error) {
    console.error('❌ ES module validation failed:', error.message);
    return false;
  }
}

async function fixDeployment() {
  console.log('🚀 Fixing deployment ES module configuration issues...');
  
  try {
    await createESModuleCompatibleConfig();
    
    const serverSuccess = await buildServerWithFixes();
    if (!serverSuccess) {
      throw new Error('Server build failed');
    }
    
    await createStartupScript();
    
    const esmValid = await validateESModuleSupport();
    if (!esmValid) {
      throw new Error('ES module validation failed');
    }
    
    console.log('🎉 Deployment fixes completed successfully!');
    console.log('📁 Created files:');
    console.log('  - vite.deployment.config.js (ES module compatible Vite config)');
    console.log('  - start.mjs (ES module startup script)');
    console.log('  - dist/index.js (ES module server bundle)');
    
    console.log('📋 Deployment instructions:');
    console.log('  1. Use "node start.mjs" to start the server');
    console.log('  2. Or use "node dist/index.js" directly');
    console.log('  3. Both support ES modules natively');
    
  } catch (error) {
    console.error('❌ Deployment fix failed:', error.message);
    process.exit(1);
  }
}

// Run fix if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixDeployment().catch((error) => {
    console.error('Deployment fix process failed:', error);
    process.exit(1);
  });
}

export { fixDeployment };