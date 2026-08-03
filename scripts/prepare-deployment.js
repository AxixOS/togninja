#!/usr/bin/env node

/**
 * Deployment Preparation Script
 * Ensures all required files are in dist/ for successful deployment
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

console.log('🚀 Preparing deployment package...');

// 1. Run the build process
console.log('📦 Building application...');
execSync('npm run build', { stdio: 'inherit' });

// 2. Ensure dist directory exists
if (!existsSync('dist')) {
  mkdirSync('dist', { recursive: true });
}

// 3. Create production package.json
console.log('📄 Creating production package.json...');
const productionPackage = {
  "name": "photography-crm-production",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.37.0",
    "@extractus/article-extractor": "^8.0.19",
    "@neondatabase/serverless": "^0.9.0",
    "@sendgrid/mail": "^8.1.5",
    "bcrypt": "^6.0.0",
    "cheerio": "^1.1.0",
    "connect-pg-simple": "^9.0.1",
    "csv-parse": "^6.1.0",
    "date-fns": "^3.2.0",
    "dotenv": "^17.2.0",
    "drizzle-orm": "^0.29.3",
    "drizzle-zod": "^0.5.1",
    "express": "^4.18.2",
    "express-session": "^1.18.2",
    "form-data": "^4.0.4",
    "html-pdf-node": "^1.0.8",
    "html2canvas": "^1.4.1",
    "imap": "^0.8.19",
    "jspdf": "^3.0.1",
    "keyword-extractor": "^0.0.28",
    "lighthouse": "^12.8.0",
    "lodash": "^4.17.21",
    "mailparser": "^3.7.4",
    "memoizee": "^0.4.17",
    "multer": "^2.0.1",
    "node-cron": "^4.2.1",
    "node-fetch": "^3.3.2",
    "nodemailer": "^7.0.5",
    "normalize-url": "^8.0.2",
    "openai": "^5.10.1",
    "p-queue": "^8.1.0",
    "papaparse": "^5.4.1",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "pg": "^8.16.3",
    "sharp": "^0.34.3",
    "stripe": "^18.3.0",
    "uuid": "^9.0.1",
    "validator": "^13.15.15",
    "xlsx": "^0.18.5",
    "zod": "^3.22.4",
    "zod-to-json-schema": "^3.24.6"
  }
};

writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));

// 4. Create start.mjs entry point
console.log('🎯 Creating start.mjs entry point...');
const startMjs = `#!/usr/bin/env node

/**
 * Production entry point for New Age Fotografie CRM
 * Supports both Docker and Vercel deployments
 */

import './index.js';`;

writeFileSync('dist/start.mjs', startMjs);
execSync('chmod +x dist/start.mjs');

// 5. Copy shared directory
console.log('📁 Copying shared directory...');
execSync('cp -r shared dist/', { stdio: 'inherit' });

// 6. Verify deployment readiness
console.log('✅ Verifying deployment package...');
const requiredFiles = ['dist/index.js', 'dist/package.json', 'dist/start.mjs', 'dist/shared'];
const missingFiles = requiredFiles.filter(file => !existsSync(file));

if (missingFiles.length > 0) {
  console.error('❌ Missing required files:', missingFiles);
  process.exit(1);
}

console.log('🎉 Deployment package ready!');
console.log('📊 Contains:');
console.log('  ✓ Built server (index.js)');
console.log('  ✓ Production dependencies (package.json)');
console.log('  ✓ Entry point (start.mjs)');
console.log('  ✓ Shared schemas and types');
console.log('  ✓ Frontend assets (public/)');
console.log('');
console.log('🚀 Ready for Vercel deployment!');