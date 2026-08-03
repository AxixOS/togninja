#!/usr/bin/env node

/**
 * Create a completely clean production server build 
 * that bypasses all Vite dependencies
 */

import fs from 'fs/promises';
import { execSync } from 'child_process';

async function createProductionServer() {
  console.log('🏗️ Creating clean production server...');
  
  // Build with the production entry point
  try {
    execSync('node esbuild.config.js', { stdio: 'inherit' });
    console.log('✅ Production server built successfully');
  } catch (error) {
    console.error('❌ Failed to build production server:', error.message);
    throw error;
  }
}

async function testProductionServer() {
  console.log('🧪 Testing production server...');
  
  // Test that the server can start without errors
  const testScript = `
    import './dist/index.js';
    setTimeout(() => {
      console.log('✅ Production server test passed');
      process.exit(0);
    }, 2000);
  `;
  
  await fs.writeFile('test-production.mjs', testScript);
  
  try {
    execSync('timeout 5 node test-production.mjs', { stdio: 'inherit' });
    await fs.unlink('test-production.mjs');
    return true;
  } catch (error) {
    await fs.unlink('test-production.mjs').catch(() => {});
    return false;
  }
}

async function main() {
  try {
    await createProductionServer();
    
    const testPassed = await testProductionServer();
    if (testPassed) {
      console.log('🎉 Production server is ready for deployment!');
    } else {
      console.log('⚠️ Production server built but may have runtime issues');
    }
  } catch (error) {
    console.error('❌ Failed to create production server:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createProductionServer };