#!/usr/bin/env node

// Heroku Deployment Health Check Script
// This script helps diagnose deployment issues

console.log('🔍 Heroku Deployment Health Check');
console.log('=====================================');

console.log('\n📍 Environment Information:');
console.log('- Node Version:', process.version);
console.log('- NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('- PORT:', process.env.PORT || 'undefined');
console.log('- Working Directory:', process.cwd());

console.log('\n📁 File System Check:');
const fs = require('fs');
const path = require('path');

// Check if key files exist
const filesToCheck = [
  'server/index.ts',
  'dist/index.html',
  'package.json',
  'Procfile'
];

for (const file of filesToCheck) {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`- ${file}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
}

console.log('\n📦 Dependencies Check:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const key_deps = ['express', 'tsx', 'vite', '@neondatabase/serverless'];
  
  for (const dep of key_deps) {
    const inDeps = packageJson.dependencies && packageJson.dependencies[dep];
    const inDevDeps = packageJson.devDependencies && packageJson.devDependencies[dep];
    console.log(`- ${dep}: ${inDeps || inDevDeps || '❌ MISSING'}`);
  }
} catch (error) {
  console.log('❌ Failed to read package.json:', error.message);
}

console.log('\n🔗 Database Connection Check:');
if (process.env.DATABASE_URL) {
  console.log('- DATABASE_URL: ✅ CONFIGURED');
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log('- Database Host:', url.hostname);
    console.log('- Database Protocol:', url.protocol);
  } catch (e) {
    console.log('- DATABASE_URL: ❌ INVALID FORMAT');
  }
} else {
  console.log('- DATABASE_URL: ❌ NOT SET');
}

console.log('\n🎯 Attempting Server Start Test...');
try {
  // Try to import the server module
  import('./server/index.ts')
    .then(() => {
      console.log('✅ Server module imported successfully');
      setTimeout(() => {
        console.log('🏁 Health check completed - server should be starting');
        process.exit(0);
      }, 2000);
    })
    .catch((error) => {
      console.log('❌ Server import failed:', error.message);
      console.log('Stack:', error.stack);
      process.exit(1);
    });
} catch (error) {
  console.log('❌ Failed to start health check:', error.message);
  process.exit(1);
}
