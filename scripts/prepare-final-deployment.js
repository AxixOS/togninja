#!/usr/bin/env node

/**
 * Final deployment preparation script
 * Creates production-ready configuration for Replit deployment
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';

async function createDeploymentReadyConfiguration() {
  console.log('🎯 Preparing final deployment configuration...');
  
  // Create optimized replit.nix configuration
  const replitNix = `{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.npm
  ];
  env = {
    NODE_ENV = "production";
    PORT = "5000";
  };
}`;
  
  await fs.writeFile('.replit.nix', replitNix);
  console.log('✅ Created .replit.nix for Node.js 18');
  
  // Create .replit configuration
  const replitConfig = `modules = ["nodejs-18"]

[nix]
channel = "stable-24_05"

[deployment]
run = ["sh", "-c", "node start.mjs"]
deploymentTarget = "cloudrun"

[[ports]]
localPort = 5000
externalPort = 80

[env]
NODE_ENV = "production"
PORT = "5000"`;
  
  await fs.writeFile('.replit', replitConfig);
  console.log('✅ Created .replit configuration');
  
  // Create production environment file
  const prodEnv = `# Production Environment Variables
NODE_ENV=production
PORT=5000
DEMO_MODE=false

# Database Configuration
# DATABASE_URL will be provided by Replit

# Supabase Configuration (if needed)
# VITE_SUPABASE_URL=your-supabase-url
# VITE_SUPABASE_ANON_KEY=your-supabase-anon-key`;
  
  await fs.writeFile('.env.production', prodEnv);
  console.log('✅ Created .env.production');
  
  // Verify all deployment files
  const requiredFiles = [
    'start.mjs',
    'dist/index.js',
    'dist/package.json',
    'dist/public/index.html',
    '.replit',
    '.replit.nix'
  ];
  
  console.log('\n📋 Deployment readiness check:');
  let allGood = true;
  
  for (const file of requiredFiles) {
    if (existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - MISSING`);
      allGood = false;
    }
  }
  
  if (allGood) {
    console.log('\n🎉 Deployment configuration completed successfully!');
    console.log('==========================================');
    console.log('✅ All required files are present');
    console.log('✅ Package.json files in correct locations');
    console.log('✅ Flexible start scripts configured');
    console.log('✅ Replit deployment configuration ready');
    console.log('✅ ES module server bundle built');
    console.log('');
    console.log('🚀 Ready for deployment!');
    console.log('Click the Deploy button in Replit to deploy your application.');
  } else {
    console.log('\n❌ Deployment preparation incomplete. Missing files detected.');
  }
}

// Run if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createDeploymentReadyConfiguration().catch(console.error);
}