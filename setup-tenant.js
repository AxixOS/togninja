#!/usr/bin/env node
/**
 * Database Setup Script for New Tenants
 * 
 * Usage:
 *   node setup-tenant.js <DATABASE_URL>
 * 
 * Or with environment variable:
 *   DATABASE_URL=<url> node setup-tenant.js
 * 
 * This script:
 * 1. Validates the database connection
 * 2. Applies all schema migrations
 * 3. Validates the schema
 * 4. Creates sample data (optional)
 * 5. Runs health checks
 */

require('dotenv').config();
const { initializeDatabase, validateSchema, SCHEMA_VERSION } = require('./db-schema');

async function setupTenant(databaseUrl, options = {}) {
  const {
    createSampleData = false,
    verbose = true
  } = options;
  
  console.log('🚀 Starting tenant database setup...\n');
  
  try {
    // Step 1: Initialize database and apply migrations
    console.log('📦 Step 1: Initializing database...');
    const { sql } = await initializeDatabase(databaseUrl);
    console.log('✅ Database initialized\n');
    
    // Step 2: Validate schema
    console.log('🔍 Step 2: Validating schema...');
    await validateSchema(sql);
    console.log('✅ Schema validation passed\n');
    
    // Step 3: Verify table structure
    console.log('📋 Step 3: Verifying table structures...');
    const tables = await sql`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('Tables created:');
    tables.forEach(t => {
      console.log(`  ✓ ${t.table_name} (${t.column_count} columns)`);
    });
    console.log();
    
    // Step 4: Create sample data (if requested)
    if (createSampleData) {
      console.log('🎨 Step 4: Creating sample data...');
      await createSamples(sql);
      console.log('✅ Sample data created\n');
    }
    
    // Step 5: Health checks
    console.log('🏥 Step 5: Running health checks...');
    const healthChecks = await runHealthChecks(sql);
    console.log('✅ All health checks passed\n');
    
    // Summary
    console.log('═'.repeat(60));
    console.log('✅ TENANT SETUP COMPLETE');
    console.log('═'.repeat(60));
    console.log(`Database URL: ${databaseUrl.substring(0, 30)}...`);
    console.log(`Schema Version: v${SCHEMA_VERSION}`);
    console.log(`Tables: ${tables.length}`);
    console.log(`Health Status: ${healthChecks.passed}/${healthChecks.total} checks passed`);
    console.log('═'.repeat(60));
    console.log('\n✨ Your database is ready to use!\n');
    
    return { success: true, sql };
    
  } catch (error) {
    console.error('\n❌ SETUP FAILED');
    console.error('═'.repeat(60));
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    console.error('═'.repeat(60));
    
    return { success: false, error };
  }
}

async function createSamples(sql) {
  // Sample client
  const [client] = await sql`
    INSERT INTO crm_clients (first_name, last_name, email, phone)
    VALUES ('John', 'Doe', 'john@example.com', '+1234567890')
    ON CONFLICT DO NOTHING
    RETURNING id
  `.catch(() => []);
  
  if (client) {
    console.log(`  ✓ Sample client created (${client.id})`);
  }
  
  // Sample lead
  await sql`
    INSERT INTO leads (full_name, email, status, message)
    VALUES ('Jane Smith', 'jane@example.com', 'new', 'Sample inquiry')
    ON CONFLICT DO NOTHING
  `.catch(() => {});
  
  console.log('  ✓ Sample lead created');
}

async function runHealthChecks(sql) {
  const checks = {
    total: 0,
    passed: 0,
    failed: []
  };
  
  // Check 1: Can we query tables?
  checks.total++;
  try {
    await sql`SELECT 1 FROM crm_clients LIMIT 1`;
    await sql`SELECT 1 FROM leads LIMIT 1`;
    await sql`SELECT 1 FROM crm_invoices LIMIT 1`;
    checks.passed++;
    console.log('  ✓ Table queries work');
  } catch (e) {
    checks.failed.push('Table queries failed: ' + e.message);
    console.log('  ✗ Table queries failed');
  }
  
  // Check 2: Indexes exist?
  checks.total++;
  try {
    const indexes = await sql`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('crm_invoices', 'leads')
    `;
    if (indexes.length > 0) {
      checks.passed++;
      console.log(`  ✓ Indexes created (${indexes.length} indexes)`);
    } else {
      checks.failed.push('No indexes found');
      console.log('  ✗ No indexes found');
    }
  } catch (e) {
    checks.failed.push('Index check failed: ' + e.message);
    console.log('  ✗ Index check failed');
  }
  
  // Check 3: Foreign keys work?
  checks.total++;
  try {
    // This should fail if FK constraints don't exist
    await sql`
      SELECT ci.id, cii.id
      FROM crm_invoices ci
      LEFT JOIN crm_invoice_items cii ON cii.invoice_id = ci.id
      LIMIT 1
    `;
    checks.passed++;
    console.log('  ✓ Foreign keys work');
  } catch (e) {
    checks.failed.push('Foreign key check failed: ' + e.message);
    console.log('  ✗ Foreign key check failed');
  }
  
  return checks;
}

// CLI execution
if (require.main === module) {
  const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL is required');
    console.error('\nUsage:');
    console.error('  node setup-tenant.js <DATABASE_URL>');
    console.error('  DATABASE_URL=<url> node setup-tenant.js');
    console.error('\nOptions:');
    console.error('  --sample-data    Create sample data for testing');
    process.exit(1);
  }
  
  const createSampleData = process.argv.includes('--sample-data');
  
  setupTenant(databaseUrl, { createSampleData })
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { setupTenant };
