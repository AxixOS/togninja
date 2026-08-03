import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

interface TestResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function addResult(category: string, test: string, status: 'PASS' | 'FAIL' | 'WARN', details?: string, error?: string) {
  results.push({ category, test, status, details, error });
}

async function testDatabaseConnection() {
  console.log('\n🗄️  DATABASE CONNECTION TEST');
  console.log('━'.repeat(80));
  
  try {
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    addResult('Database', 'Connection', 'PASS', `Connected to: ${result[0].pg_version}`);
    console.log('✅ Database connection successful');
    console.log(`   Version: ${result[0].pg_version}`);
    return true;
  } catch (error: any) {
    addResult('Database', 'Connection', 'FAIL', undefined, error.message);
    console.log('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testCoreTables() {
  console.log('\n📊 CORE TABLES TEST');
  console.log('━'.repeat(80));
  
  const requiredTables = [
    'users', 'clients', 'invoices', 'invoice_items', 'bookings',
    'galleries', 'gallery_images', 'price_lists', 'storage_files',
    'emails', 'email_tracking'
  ];
  
  try {
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    const existingTables = tablesResult.map((t: any) => t.table_name);
    
    let allFound = true;
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        console.log(`✅ ${table}`);
        addResult('Core Tables', table, 'PASS');
      } else {
        console.log(`❌ ${table} - MISSING`);
        addResult('Core Tables', table, 'FAIL', 'Table not found');
        allFound = false;
      }
    }
    
    console.log(`\n📋 Total tables in database: ${existingTables.length}`);
    return allFound;
  } catch (error: any) {
    addResult('Core Tables', 'Table Check', 'FAIL', undefined, error.message);
    console.log('❌ Table check failed:', error.message);
    return false;
  }
}

async function testAgentV2Tables() {
  console.log('\n🤖 AGENT V2 TABLES TEST');
  console.log('━'.repeat(80));
  
  const agentTables = [
    'agent_sessions', 'agent_messages', 'agent_tool_calls',
    'agent_authorizations', 'agent_learning', 'agent_analytics'
  ];
  
  try {
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'agent_%'
      ORDER BY table_name
    `;
    
    const existingTables = tablesResult.map((t: any) => t.table_name);
    
    let allFound = true;
    for (const table of agentTables) {
      if (existingTables.includes(table)) {
        console.log(`✅ ${table}`);
        addResult('Agent V2 Tables', table, 'PASS');
      } else {
        console.log(`❌ ${table} - MISSING`);
        addResult('Agent V2 Tables', table, 'FAIL', 'Table not found');
        allFound = false;
      }
    }
    
    return allFound;
  } catch (error: any) {
    addResult('Agent V2 Tables', 'Table Check', 'FAIL', undefined, error.message);
    console.log('❌ Agent tables check failed:', error.message);
    return false;
  }
}

async function testPriceWizardTables() {
  console.log('\n💰 PRICE WIZARD TABLES TEST');
  console.log('━'.repeat(80));
  
  const priceWizardTables = [
    'competitor_research', 'competitor_prices', 
    'price_list_suggestions', 'price_wizard_sessions'
  ];
  
  try {
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%competitor%' OR table_name LIKE '%price_wizard%')
      ORDER BY table_name
    `;
    
    const existingTables = tablesResult.map((t: any) => t.table_name);
    
    let allFound = true;
    for (const table of priceWizardTables) {
      if (existingTables.includes(table)) {
        console.log(`✅ ${table}`);
        addResult('Price Wizard Tables', table, 'PASS');
      } else {
        console.log(`❌ ${table} - MISSING`);
        addResult('Price Wizard Tables', table, 'FAIL', 'Table not found');
        allFound = false;
      }
    }
    
    return allFound;
  } catch (error: any) {
    addResult('Price Wizard Tables', 'Table Check', 'FAIL', undefined, error.message);
    console.log('❌ Price Wizard tables check failed:', error.message);
    return false;
  }
}

async function testWorkflowWizardTables() {
  console.log('\n⚙️  WORKFLOW WIZARD TABLES TEST');
  console.log('━'.repeat(80));
  
  const workflowTables = [
    'workflow_templates', 'workflow_instances', 'workflow_steps',
    'workflow_executions', 'workflow_step_executions',
    'workflow_email_templates', 'workflow_questionnaire_templates',
    'workflow_questionnaire_responses', 'workflow_analytics'
  ];
  
  try {
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'workflow%'
      ORDER BY table_name
    `;
    
    const existingTables = tablesResult.map((t: any) => t.table_name);
    
    let allFound = true;
    for (const table of workflowTables) {
      if (existingTables.includes(table)) {
        console.log(`✅ ${table}`);
        addResult('Workflow Wizard Tables', table, 'PASS');
      } else {
        console.log(`❌ ${table} - MISSING`);
        addResult('Workflow Wizard Tables', table, 'FAIL', 'Table not found');
        allFound = false;
      }
    }
    
    // Check for system templates
    if (allFound) {
      const templatesCount = await sql`SELECT COUNT(*) as count FROM workflow_templates WHERE is_system_template = true`;
      const emailTemplatesCount = await sql`SELECT COUNT(*) as count FROM workflow_email_templates WHERE is_system_template = true`;
      const questionnaireTemplatesCount = await sql`SELECT COUNT(*) as count FROM workflow_questionnaire_templates WHERE is_active = true`;
      
      console.log(`\n📝 System Templates:`);
      console.log(`   Workflow Templates: ${templatesCount[0].count}`);
      console.log(`   Email Templates: ${emailTemplatesCount[0].count}`);
      console.log(`   Questionnaire Templates: ${questionnaireTemplatesCount[0].count}`);
      
      addResult('Workflow Wizard', 'System Templates', 'PASS', 
        `${templatesCount[0].count} workflows, ${emailTemplatesCount[0].count} emails, ${questionnaireTemplatesCount[0].count} questionnaires`);
    }
    
    return allFound;
  } catch (error: any) {
    addResult('Workflow Wizard Tables', 'Table Check', 'FAIL', undefined, error.message);
    console.log('❌ Workflow Wizard tables check failed:', error.message);
    return false;
  }
}

async function testDataIntegrity() {
  console.log('\n🔍 DATA INTEGRITY TEST');
  console.log('━'.repeat(80));
  
  try {
    // Test clients
    const clients = await sql`SELECT COUNT(*) as count FROM clients`;
    console.log(`✅ Clients: ${clients[0].count} records`);
    addResult('Data Integrity', 'Clients', 'PASS', `${clients[0].count} records`);
    
    // Test invoices
    const invoices = await sql`SELECT COUNT(*) as count FROM invoices`;
    console.log(`✅ Invoices: ${invoices[0].count} records`);
    addResult('Data Integrity', 'Invoices', 'PASS', `${invoices[0].count} records`);
    
    // Test bookings
    const bookings = await sql`SELECT COUNT(*) as count FROM bookings`;
    console.log(`✅ Bookings: ${bookings[0].count} records`);
    addResult('Data Integrity', 'Bookings', 'PASS', `${bookings[0].count} records`);
    
    // Test galleries
    const galleries = await sql`SELECT COUNT(*) as count FROM galleries`;
    console.log(`✅ Galleries: ${galleries[0].count} records`);
    addResult('Data Integrity', 'Galleries', 'PASS', `${galleries[0].count} records`);
    
    // Test emails
    const emails = await sql`SELECT COUNT(*) as count FROM emails`;
    console.log(`✅ Emails: ${emails[0].count} records`);
    addResult('Data Integrity', 'Emails', 'PASS', `${emails[0].count} records`);
    
    // Test price lists
    const priceLists = await sql`SELECT COUNT(*) as count FROM price_lists`;
    console.log(`✅ Price Lists: ${priceLists[0].count} records`);
    addResult('Data Integrity', 'Price Lists', 'PASS', `${priceLists[0].count} records`);
    
    // Test agent sessions
    const agentSessions = await sql`SELECT COUNT(*) as count FROM agent_sessions`;
    console.log(`✅ Agent Sessions: ${agentSessions[0].count} records`);
    addResult('Data Integrity', 'Agent Sessions', 'PASS', `${agentSessions[0].count} records`);
    
    // Test agent tool calls
    const toolCalls = await sql`SELECT COUNT(*) as count FROM agent_tool_calls`;
    console.log(`✅ Agent Tool Calls: ${toolCalls[0].count} records`);
    addResult('Data Integrity', 'Agent Tool Calls', 'PASS', `${toolCalls[0].count} records`);
    
    return true;
  } catch (error: any) {
    addResult('Data Integrity', 'Record Count', 'FAIL', undefined, error.message);
    console.log('❌ Data integrity check failed:', error.message);
    return false;
  }
}

async function testIndexes() {
  console.log('\n📇 DATABASE INDEXES TEST');
  console.log('━'.repeat(80));
  
  try {
    const indexes = await sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `;
    
    const indexCount = indexes.length;
    console.log(`✅ Total indexes: ${indexCount}`);
    
    // Group by table
    const indexesByTable = indexes.reduce((acc: any, idx: any) => {
      if (!acc[idx.tablename]) acc[idx.tablename] = [];
      acc[idx.tablename].push(idx.indexname);
      return acc;
    }, {});
    
    const criticalTables = ['clients', 'invoices', 'bookings', 'galleries', 'emails'];
    for (const table of criticalTables) {
      const count = indexesByTable[table]?.length || 0;
      if (count > 0) {
        console.log(`✅ ${table}: ${count} indexes`);
        addResult('Indexes', table, 'PASS', `${count} indexes`);
      } else {
        console.log(`⚠️  ${table}: No indexes found`);
        addResult('Indexes', table, 'WARN', 'No indexes - may impact performance');
      }
    }
    
    return true;
  } catch (error: any) {
    addResult('Indexes', 'Index Check', 'FAIL', undefined, error.message);
    console.log('❌ Index check failed:', error.message);
    return false;
  }
}

async function testStorageConfiguration() {
  console.log('\n💾 STORAGE CONFIGURATION TEST');
  console.log('━'.repeat(80));
  
  try {
    // Check for Backblaze B2 configuration
    const hasB2KeyId = !!process.env.BACKBLAZE_KEY_ID;
    const hasB2AppKey = !!process.env.BACKBLAZE_APPLICATION_KEY;
    const hasB2Bucket = !!process.env.BACKBLAZE_BUCKET_NAME;
    const hasB2Endpoint = !!process.env.BACKBLAZE_ENDPOINT;
    
    if (hasB2KeyId && hasB2AppKey && hasB2Bucket && hasB2Endpoint) {
      console.log('✅ Backblaze B2 fully configured');
      console.log(`   Bucket: ${process.env.BACKBLAZE_BUCKET_NAME}`);
      console.log(`   Endpoint: ${process.env.BACKBLAZE_ENDPOINT}`);
      addResult('Storage', 'Backblaze B2', 'PASS', 'Fully configured');
    } else {
      console.log('⚠️  Backblaze B2 partially configured');
      console.log(`   Key ID: ${hasB2KeyId ? '✓' : '✗'}`);
      console.log(`   App Key: ${hasB2AppKey ? '✓' : '✗'}`);
      console.log(`   Bucket: ${hasB2Bucket ? '✓' : '✗'}`);
      console.log(`   Endpoint: ${hasB2Endpoint ? '✓' : '✗'}`);
      addResult('Storage', 'Backblaze B2', 'WARN', 'Incomplete configuration');
    }
    
    // Check storage files table
    const storageFiles = await sql`SELECT COUNT(*) as count FROM storage_files`;
    console.log(`✅ Storage Files: ${storageFiles[0].count} records`);
    addResult('Storage', 'Files Database', 'PASS', `${storageFiles[0].count} records`);
    
    return true;
  } catch (error: any) {
    addResult('Storage', 'Configuration', 'FAIL', undefined, error.message);
    console.log('❌ Storage configuration check failed:', error.message);
    return false;
  }
}

async function testEnvironmentVariables() {
  console.log('\n🔧 ENVIRONMENT VARIABLES TEST');
  console.log('━'.repeat(80));
  
  const criticalVars = [
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'JWT_SECRET',
    'RESEND_API_KEY'
  ];
  
  const optionalVars = [
    'BACKBLAZE_KEY_ID',
    'BACKBLAZE_APPLICATION_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
  ];
  
  let allCriticalPresent = true;
  
  console.log('Critical Variables:');
  for (const varName of criticalVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName}`);
      addResult('Environment', varName, 'PASS');
    } else {
      console.log(`❌ ${varName} - MISSING`);
      addResult('Environment', varName, 'FAIL', 'Required variable missing');
      allCriticalPresent = false;
    }
  }
  
  console.log('\nOptional Variables:');
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName}`);
      addResult('Environment', varName, 'PASS');
    } else {
      console.log(`⚠️  ${varName} - not set`);
      addResult('Environment', varName, 'WARN', 'Optional feature unavailable');
    }
  }
  
  return allCriticalPresent;
}

async function generateReport() {
  console.log('\n\n');
  console.log('═'.repeat(80));
  console.log('📊 COMPREHENSIVE TEST RESULTS SUMMARY');
  console.log('═'.repeat(80));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  const total = results.length;
  
  console.log(`\n✅ PASSED:   ${passed}/${total} (${Math.round(passed/total*100)}%)`);
  console.log(`❌ FAILED:   ${failed}/${total} (${Math.round(failed/total*100)}%)`);
  console.log(`⚠️  WARNINGS: ${warnings}/${total} (${Math.round(warnings/total*100)}%)`);
  
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   ${r.category} > ${r.test}: ${r.error || r.details}`);
    });
  }
  
  if (warnings > 0) {
    console.log('\n⚠️  WARNINGS:');
    results.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`   ${r.category} > ${r.test}: ${r.details}`);
    });
  }
  
  console.log('\n' + '═'.repeat(80));
  
  const healthScore = Math.round(((passed + warnings * 0.5) / total) * 100);
  console.log(`\n🏥 SYSTEM HEALTH SCORE: ${healthScore}%`);
  
  if (healthScore >= 90) {
    console.log('✅ System is in EXCELLENT condition - Production Ready');
  } else if (healthScore >= 75) {
    console.log('✅ System is in GOOD condition - Minor issues to address');
  } else if (healthScore >= 60) {
    console.log('⚠️  System is in FAIR condition - Several issues need attention');
  } else {
    console.log('❌ System has CRITICAL issues - Not production ready');
  }
  
  console.log('\n');
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive System Smoke Test...\n');
  
  await testEnvironmentVariables();
  await testDatabaseConnection();
  await testCoreTables();
  await testAgentV2Tables();
  await testPriceWizardTables();
  await testWorkflowWizardTables();
  await testDataIntegrity();
  await testIndexes();
  await testStorageConfiguration();
  
  await generateReport();
}

runAllTests();
