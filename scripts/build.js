#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import { buildServer } from '../esbuild.config.js';

const execAsync = promisify(exec);

async function buildClient() {
  console.log('🔨 Building client application...');
  try {
    const { stdout, stderr } = await execAsync('vite build');
    if (stderr && !stderr.includes('warning')) {
      throw new Error(stderr);
    }
    console.log('✅ Client build completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Client build failed:', error.message);
    return false;
  }
}

async function build() {
  console.log('🚀 Starting full application build...');
  
  const clientSuccess = await buildClient();
  if (!clientSuccess) {
    console.error('❌ Build failed at client stage');
    process.exit(1);
  }
  
  try {
    await buildServer();
    console.log('🎉 Full build completed successfully!');
    console.log('📁 Output:');
    console.log('  - Client: dist/public/');
    console.log('  - Server: dist/index.js');
  } catch (error) {
    console.error('❌ Build failed at server stage:', error.message);
    process.exit(1);
  }
}

// Run build if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  build().catch((error) => {
    console.error('Build process failed:', error);
    process.exit(1);
  });
}

export { build, buildClient, buildServer };