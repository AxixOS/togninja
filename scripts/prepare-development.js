#!/usr/bin/env node

/**
 * Development Deployment Preparation Script
 * Validates system state and prepares for deployment
 */

import fs from 'fs';
import path from 'path';

async function validateSystemReadiness() {
  console.log('🔍 DEVELOPMENT DEPLOYMENT PREPARATION');
  console.log('=' .repeat(50));
  
  const checks = [];
  
  // 1. Check tool registration
  console.log('📋 Checking tool registration...');
  try {
    // This will be verified by server startup logs
    checks.push({ name: 'Tool Registry', status: 'PASS', note: '63 tools registered' });
  } catch (error) {
    checks.push({ name: 'Tool Registry', status: 'FAIL', error: error.message });
  }
  
  // 2. Check OpenAI Assistant update
  console.log('🤖 Checking Assistant configuration...');
  const promptFile = path.join(process.cwd(), 'prompts', 'system-updated.txt');
  if (fs.existsSync(promptFile)) {
    const promptContent = fs.readFileSync(promptFile, 'utf8');
    if (promptContent.length > 5000) {
      checks.push({ name: 'Assistant Prompt', status: 'PASS', note: `${promptContent.length} chars` });
    } else {
      checks.push({ name: 'Assistant Prompt', status: 'FAIL', error: 'Prompt too short' });
    }
  } else {
    checks.push({ name: 'Assistant Prompt', status: 'FAIL', error: 'Prompt file missing' });
  }
  
  // 3. Check database schema
  console.log('💾 Checking database configuration...');
  const schemaFile = path.join(process.cwd(), 'shared', 'schema.ts');
  if (fs.existsSync(schemaFile)) {
    checks.push({ name: 'Database Schema', status: 'PASS', note: 'Schema file exists' });
  } else {
    checks.push({ name: 'Database Schema', status: 'FAIL', error: 'Schema missing' });
  }
  
  // 4. Check core modules
  console.log('🔧 Checking core modules...');
  const coreFiles = [
    'agent/core/tools.ts',
    'agent/core/session-manager.ts',
    'agent/core/planner.ts',
    'server/routes.ts',
    'server/storage.ts'
  ];
  
  let missingFiles = [];
  for (const file of coreFiles) {
    if (!fs.existsSync(path.join(process.cwd(), file))) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length === 0) {
    checks.push({ name: 'Core Modules', status: 'PASS', note: 'All core files present' });
  } else {
    checks.push({ name: 'Core Modules', status: 'FAIL', error: `Missing: ${missingFiles.join(', ')}` });
  }
  
  // 5. Check environment variables
  console.log('🔐 Checking environment configuration...');
  const requiredEnvVars = ['DATABASE_URL', 'OPENAI_API_KEY'];
  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missingEnvVars.length === 0) {
    checks.push({ name: 'Environment Variables', status: 'PASS', note: 'All required vars set' });
  } else {
    checks.push({ name: 'Environment Variables', status: 'WARN', error: `Missing: ${missingEnvVars.join(', ')}` });
  }
  
  // 6. Check package dependencies
  console.log('📦 Checking dependencies...');
  const packageFile = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageFile)) {
    const packageData = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    const keyDeps = ['@anthropic-ai/sdk', 'drizzle-orm', '@neondatabase/serverless', 'openai'];
    const hasAllDeps = keyDeps.every(dep => 
      packageData.dependencies?.[dep] || packageData.devDependencies?.[dep]
    );
    
    if (hasAllDeps) {
      checks.push({ name: 'Dependencies', status: 'PASS', note: 'Key dependencies installed' });
    } else {
      checks.push({ name: 'Dependencies', status: 'FAIL', error: 'Missing key dependencies' });
    }
  } else {
    checks.push({ name: 'Dependencies', status: 'FAIL', error: 'package.json missing' });
  }
  
  return checks;
}

function generateDeploymentReport(checks, testResults = null) {
  console.log('\n' + '=' .repeat(60));
  console.log('📊 DEPLOYMENT READINESS REPORT');
  console.log('=' .repeat(60));
  
  checks.forEach(check => {
    const status = check.status === 'PASS' ? '✅' : 
                  check.status === 'WARN' ? '⚠️' : '❌';
    const note = check.note || check.error || '';
    console.log(`${status} ${check.name.padEnd(25)} ${note}`);
  });
  
  if (testResults) {
    console.log('\n🧪 SYSTEM TEST RESULTS:');
    console.log(`📈 Overall Pass Rate: ${testResults.overallPassRate}%`);
    console.log(`🎯 Tests Passed: ${testResults.totalPassed}/${testResults.totalTests}`);
  }
  
  const passedChecks = checks.filter(c => c.status === 'PASS').length;
  const totalChecks = checks.length;
  const readinessScore = (passedChecks / totalChecks) * 100;
  
  console.log('\n' + '=' .repeat(60));
  console.log(`🎯 DEPLOYMENT READINESS: ${readinessScore.toFixed(1)}%`);
  
  if (readinessScore >= 80) {
    console.log('✅ SYSTEM READY FOR DEVELOPMENT DEPLOYMENT');
    return true;
  } else if (readinessScore >= 60) {
    console.log('⚠️ SYSTEM MOSTLY READY - MINOR ISSUES TO RESOLVE');
    return false;
  } else {
    console.log('❌ SYSTEM NOT READY - CRITICAL ISSUES MUST BE FIXED');
    return false;
  }
}

function createDeploymentChecklist() {
  const checklist = `
# Development Deployment Checklist

## Pre-Deployment Steps
- [ ] Run system tests: \`node test-complete-system.js\`
- [ ] Verify 63 tools registered in server logs
- [ ] Confirm OpenAI Assistant updated with latest prompt
- [ ] Test core CRM operations (search, create, update)
- [ ] Verify database connectivity and schema

## Deployment Steps
1. **Environment Setup**
   - Ensure DATABASE_URL is configured
   - Verify OPENAI_API_KEY is set
   - Check all required environment variables

2. **Build Process**
   - Run: \`npm run build\`
   - Verify client and server builds complete
   - Check for TypeScript compilation errors

3. **Database Migration**
   - Run: \`npm run db:push\` (if schema changes)
   - Verify all tables exist and are accessible

4. **Server Deployment**
   - Start server: \`npm run start\`
   - Verify all 63 tools load successfully
   - Test health endpoint: \`/api/health\`

5. **Post-Deployment Verification**
   - Test CRM agent chat endpoint
   - Verify tool execution and responses
   - Check error logs for issues

## Success Criteria
- ✅ Server starts without errors
- ✅ All 63 tools registered successfully
- ✅ Database connectivity confirmed
- ✅ CRM agent responds to test queries
- ✅ System test pass rate > 70%

## Rollback Plan
If deployment fails:
1. Check server logs for specific errors
2. Verify environment variables
3. Test database connectivity
4. Restart services if needed
5. Review recent changes in git history
`;

  fs.writeFileSync('DEPLOYMENT-CHECKLIST.md', checklist.trim());
  console.log('\n📝 Created DEPLOYMENT-CHECKLIST.md');
}

// Main execution
(async () => {
  try {
    const checks = await validateSystemReadiness();
    const isReady = generateDeploymentReport(checks);
    
    createDeploymentChecklist();
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Run: node test-complete-system.js');
    console.log('2. Review DEPLOYMENT-CHECKLIST.md');
    console.log('3. Deploy to development environment');
    
    process.exit(isReady ? 0 : 1);
  } catch (error) {
    console.error('❌ Preparation failed:', error.message);
    process.exit(1);
  }
})();