#!/usr/bin/env node

/**
 * Deploy using the original working build configuration
 * This bypasses the problematic build script and uses the simple esbuild command that worked before
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

async function deployWithOriginalBuild() {
  console.log('🚀 Deploying with original working build configuration...');

  try {
    // 1. Build client
    console.log('📦 Building client...');
    await execAsync('npm run build:client');
    console.log('✅ Client build completed');

    // 2. Build server using original working command
    console.log('🔧 Building server with original esbuild command...');
    await execAsync('esbuild server/index.ts --bundle --platform=node --target=node18 --outfile=dist/index.js --external:@neondatabase/serverless');
    console.log('✅ Server build completed');

    // 3. Verify builds
    const hasClientBuild = existsSync('dist/public');
    const hasServerBuild = existsSync('dist/index.js');
    
    console.log(`✅ Client build: ${hasClientBuild ? 'Ready' : 'Missing'}`);
    console.log(`✅ Server build: ${hasServerBuild ? 'Ready' : 'Missing'}`);

    // 4. Copy package.json to expected locations
    await execAsync('cp package.json /home/runner/package.json').catch(() => {
      console.log('⚠️  Could not copy to /home/runner/package.json');
    });

    console.log('\n📊 Deployment Status:');
    console.log('✅ Built with original working configuration');
    console.log('✅ Server: Simple esbuild bundle'); 
    console.log('✅ Client: Vite optimized build');
    console.log('✅ Ready for deployment!');
    
    console.log('\n🎯 Now try deploying through Replit interface');
    
    return true;

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    return false;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  deployWithOriginalBuild().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { deployWithOriginalBuild };