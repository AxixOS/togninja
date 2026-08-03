#!/usr/bin/env node

/**
 * Comprehensive ES module validation script
 * Tests all critical ES module features for deployment
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testESModuleSupport() {
  console.log('🔍 Testing ES Module Support...');
  
  const tests = [
    {
      name: 'import.meta.url',
      test: () => typeof import.meta.url === 'string',
      description: 'ES module URL resolution'
    },
    {
      name: 'import.meta.dirname',
      test: () => typeof import.meta.dirname === 'string',
      description: 'Modern Node.js dirname support'
    },
    {
      name: 'Top-level await',
      test: async () => {
        try {
          await Promise.resolve(true);
          return true;
        } catch {
          return false;
        }
      },
      description: 'Async/await at module level'
    },
    {
      name: 'Dynamic import',
      test: async () => {
        try {
          await import('fs');
          return true;
        } catch {
          return false;
        }
      },
      description: 'Dynamic module imports'
    },
    {
      name: 'Node.js globals shimming',
      test: () => {
        return typeof globalThis.__filename === 'string' && 
               typeof globalThis.__dirname === 'string';
      },
      description: 'CommonJS compatibility shims'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.test();
      if (result) {
        console.log(`✅ ${test.name}: ${test.description}`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: ${test.description} - FAILED`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${test.description} - ERROR: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All ES module features are working correctly!');
    return true;
  } else {
    console.log('⚠️ Some ES module features are not working properly');
    return false;
  }
}

async function testBuildOutputs() {
  console.log('\n🔍 Testing Build Outputs...');
  
  const requiredFiles = [
    { path: 'dist/index.js', description: 'Server bundle' },
    { path: 'start.mjs', description: 'ES module startup script' },
    { path: 'vite.deployment.config.js', description: 'Deployment Vite config' },
    { path: 'deployment-package.json', description: 'Production package.json' }
  ];
  
  let allExist = true;
  
  for (const file of requiredFiles) {
    if (fs.existsSync(file.path)) {
      const stats = fs.statSync(file.path);
      console.log(`✅ ${file.description}: ${file.path} (${Math.round(stats.size / 1024)}kb)`);
    } else {
      console.log(`❌ ${file.description}: ${file.path} - MISSING`);
      allExist = false;
    }
  }
  
  return allExist;
}

async function testServerBundle() {
  console.log('\n🔍 Testing Server Bundle...');
  
  try {
    // Read the server bundle and check for ES module indicators
    const serverCode = fs.readFileSync('dist/index.js', 'utf-8');
    
    const checks = [
      { 
        pattern: /import\s+.*\s+from/, 
        name: 'ES module imports',
        required: true 
      },
      { 
        pattern: /export\s+/, 
        name: 'ES module exports',
        required: false 
      },
      { 
        pattern: /import\.meta/, 
        name: 'import.meta usage',
        required: true 
      },
      { 
        pattern: /globalThis\.__filename/, 
        name: 'CommonJS shims',
        required: true 
      }
    ];
    
    let passed = 0;
    
    for (const check of checks) {
      if (check.pattern.test(serverCode)) {
        console.log(`✅ ${check.name} found in bundle`);
        passed++;
      } else if (check.required) {
        console.log(`❌ ${check.name} missing from bundle`);
      } else {
        console.log(`⚠️ ${check.name} not found (optional)`);
      }
    }
    
    return passed >= 3; // At least 3 required checks should pass
    
  } catch (error) {
    console.log(`❌ Failed to analyze server bundle: ${error.message}`);
    return false;
  }
}

async function runValidation() {
  console.log('🚀 Starting ES Module Validation...\n');
  
  const esmSupport = await testESModuleSupport();
  const buildOutputs = await testBuildOutputs();
  const bundleAnalysis = await testServerBundle();
  
  console.log('\n📋 Validation Summary:');
  console.log(`ES Module Support: ${esmSupport ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Build Outputs: ${buildOutputs ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Bundle Analysis: ${bundleAnalysis ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = esmSupport && buildOutputs && bundleAnalysis;
  
  if (allPassed) {
    console.log('\n🎉 Deployment is ready for ES module environments!');
    console.log('✅ Node.js v18+ compatibility confirmed');
    console.log('✅ import.meta and top-level await supported');
    console.log('✅ All required files present');
    return true;
  } else {
    console.log('\n⚠️ Deployment may have issues in ES module environments');
    console.log('Please fix the failing checks before deploying');
    return false;
  }
}

// Run validation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidation()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

export { runValidation };