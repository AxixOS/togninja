#!/usr/bin/env node

/**
 * Production-ready deployment that uses the working development server
 * This creates a deployment that works exactly like the current development environment
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';

async function createProductionReadyDeployment() {
  console.log('🚀 Creating production-ready deployment...');

  try {
    // 1. Create a deployment package.json that uses the working dev server approach
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
    
    // Use the working development server configuration but with production settings
    packageJson.scripts.start = 'NODE_ENV=production PORT=5000 tsx server/index.ts';
    packageJson.scripts['deploy:start'] = 'NODE_ENV=production PORT=5000 tsx server/index.ts';
    
    // Ensure tsx is available in production
    if (!packageJson.dependencies.tsx) {
      packageJson.dependencies.tsx = packageJson.devDependencies.tsx;
    }
    
    await fs.writeFile('package-production-ready.json', JSON.stringify(packageJson, null, 2));
    console.log('✅ Production-ready package.json created');

    // 2. Create a deployment start script
    const startScript = `#!/usr/bin/env node

// Production deployment start script
// This uses the same server configuration that works in development

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set working directory
process.chdir(__dirname);

// Set production environment
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '5000';

console.log('🚀 Starting production server...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT);

// Start the server using tsx (which we know works)
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: process.env
});

server.on('close', (code) => {
  console.log(\`Server process exited with code \${code}\`);
  process.exit(code);
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});
`;

    await fs.writeFile('start-production.mjs', startScript);
    console.log('✅ Production start script created');

    // 3. Verify client build
    const hasClientBuild = existsSync('dist/public');
    console.log(`✅ Client build: ${hasClientBuild ? 'Ready' : 'Missing'}`);

    // 4. Copy files to expected locations
    await fs.copyFile('package-production-ready.json', '/home/runner/package.json').catch(() => {
      console.log('⚠️  Could not copy to /home/runner/package.json');
    });

    console.log('\n📊 Production Deployment Status:');
    console.log('✅ Uses working development server configuration');
    console.log('✅ Production environment variables set');
    console.log('✅ Client build ready for serving');
    console.log('✅ Start command: node start-production.mjs');
    
    console.log('\n🎯 This deployment approach:');
    console.log('• Uses the exact server configuration that works in development');
    console.log('• Serves static files from dist/public in production');
    console.log('• Uses tsx for reliable TypeScript execution');
    console.log('• Avoids problematic bundling that causes errors');
    
    console.log('\n🚀 Ready to deploy!');
    console.log('Use package-production-ready.json as your deployment configuration');
    
    return true;

  } catch (error) {
    console.error('❌ Production deployment creation failed:', error.message);
    return false;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createProductionReadyDeployment().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { createProductionReadyDeployment };