#!/usr/bin/env node
/**
 * Database Health Check
 * Quick validation of schema and data integrity
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const { InvoiceQueries, LeadQueries } = require('./db-queries');

async function quickCheck() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('🏥 Quick Health Check\n');
  
  try {
    // Version
    const v = await sql`SELECT version FROM schema_version WHERE id = 1`;
    console.log(`✅ Schema: v${v[0].version}`);
    
    // Counts
    const ic = await sql`SELECT COUNT(*)::int AS c FROM crm_invoices`;
    const lc = await sql`SELECT COUNT(*)::int AS c FROM leads`;
    const cc = await sql`SELECT COUNT(*)::int AS c FROM crm_clients`;
    console.log(`✅ Invoices: ${ic[0].c}`);
    console.log(`✅ Leads: ${lc[0].c}`);
    console.log(`✅ Clients: ${cc[0].c}`);
    
    // Simple queries to verify tables work
    await sql`SELECT * FROM crm_invoices LIMIT 1`;
    await sql`SELECT * FROM leads LIMIT 1`;
    console.log('✅ Tables: Accessible\n');
    
    console.log('✨ All systems healthy!');
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

quickCheck();
