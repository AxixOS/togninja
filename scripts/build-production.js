#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import { buildServer } from '../esbuild.config.js';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function ensureDirectories() {
  const dirs = ['dist', 'dist/public'];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }
}

async function buildClient() {
  console.log('🔨 Building client application...');
  try {
    const { stdout, stderr } = await execAsync('vite build --config vite.production.config.ts');
    if (stderr && !stderr.includes('warning') && !stderr.includes('Browserslist')) {
      throw new Error(stderr);
    }
    console.log('✅ Client build completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Client build failed:', error.message);
    return false;
  }
}

async function buildServerWithESM() {
  console.log('🔨 Building server with ES module configuration...');
  try {
    await buildServer();
    console.log('✅ Server build completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Server build failed:', error.message);
    return false;
  }
}

async function createStartScript() {
  const startScript = `#!/usr/bin/env node
import('dist/index.js').catch(console.error);
`;
  
  fs.writeFileSync('start.mjs', startScript);
  console.log('📝 Created ES module start script');
}

async function validateBuild() {
  const requiredFiles = [
    'dist/index.js',
    'dist/public/index.html'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing required file: ${file}`);
    }
  }
  
  console.log('✅ Build validation successful');
}

async function buildProduction() {
  console.log('🚀 Starting production build with ES module support...');
  
  try {
    await ensureDirectories();
    
    const clientSuccess = await buildClient();
    if (!clientSuccess) {
      console.error('❌ Build failed at client stage');
      process.exit(1);
    }
    
    const serverSuccess = await buildServerWithESM();
    if (!serverSuccess) {
      console.error('❌ Build failed at server stage');
      process.exit(1);
    }
    
    await createStartScript();
    await validateBuild();
    
    console.log('🎉 Production build completed successfully!');
    console.log('📁 Output:');
    console.log('  - Client: dist/public/');
    console.log('  - Server: dist/index.js');
    console.log('  - Start: start.mjs (ES module compatible)');
    
  } catch (error) {
    console.error('❌ Production build failed:', error.message);
    process.exit(1);
  }
}

// Run build if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildProduction().catch((error) => {
    console.error('Production build process failed:', error);
    process.exit(1);
  });
}

export { buildProduction };