/**
 * Single Source of Truth for Database Schema
 * This file defines the canonical schema for all tables.
 * Run migrations on every server start to ensure consistency.
 */

const { neon } = require('@neondatabase/serverless');

// Schema version - increment this when you make schema changes
const SCHEMA_VERSION = 1;

/**
 * Apply all schema migrations
 * Safe to run multiple times (uses IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, etc.)
 */
async function applySchemaV1(sql) {
  console.log('📋 Applying schema v1...');
  
  // Enable UUID extension
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  
  // CRM Clients - Single source of truth
  await sql`
    CREATE TABLE IF NOT EXISTS crm_clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id TEXT UNIQUE,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      zip VARCHAR(20),
      country VARCHAR(100),
      total_sales DECIMAL(10,2) DEFAULT 0,
      outstanding_balance DECIMAL(10,2) DEFAULT 0,
      last_invoice_payment_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  
  // Add any missing columns to existing table
  await sql`ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS last_invoice_payment_url TEXT`;
  await sql`ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS lead_source TEXT`;
  
  // Lead Sources table
  await sql`
    CREATE TABLE IF NOT EXISTS lead_sources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  
  // Leads - Single source of truth
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      form_type VARCHAR(50),
      full_name VARCHAR(255),
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      name VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      preferred_date DATE,
      message TEXT,
      notes TEXT,
      consent BOOLEAN DEFAULT FALSE,
      source VARCHAR(100),
      source_path TEXT,
      user_agent TEXT,
      ip INET,
      ip_text TEXT,
      meta JSONB,
      status VARCHAR(50) DEFAULT 'new',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  
  // Add missing columns to leads
  const leadsColumns = ['form_type', 'full_name', 'preferred_date', 'consent', 'source_path', 'user_agent', 'ip', 'ip_text', 'meta', 'name', 'notes'];
  for (const col of leadsColumns) {
    const type = col === 'ip' ? 'INET' : 
                 col === 'meta' ? 'JSONB' : 
                 col === 'consent' ? 'BOOLEAN DEFAULT FALSE' :
                 col === 'preferred_date' ? 'DATE' :
                 'TEXT';
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${sql(col)} ${sql(type)}`.catch(() => {});
  }
  
  // Invoices - Unified schema (CRM invoices is the primary table)
  await sql`
    CREATE TABLE IF NOT EXISTS crm_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_number TEXT UNIQUE NOT NULL,
      client_id UUID,
      issue_date DATE DEFAULT CURRENT_DATE,
      due_date DATE,
      subtotal NUMERIC(12,2) DEFAULT 0,
      tax_amount NUMERIC(12,2) DEFAULT 0,
      total NUMERIC(12,2) DEFAULT 0,
      discount_amount NUMERIC(12,2) DEFAULT 0,
      currency VARCHAR(3) DEFAULT 'EUR',
      status TEXT DEFAULT 'draft',
      paid_date TIMESTAMPTZ,
      sent_date TIMESTAMPTZ,
      payment_terms VARCHAR(100) DEFAULT '30 days',
      notes TEXT,
      terms_and_conditions TEXT,
      pdf_url TEXT,
      template_id TEXT,
      public_id TEXT UNIQUE,
      stripe_session_id TEXT,
      checkout_url TEXT,
      payment_status TEXT,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  
  // Add missing columns to invoices
  await sql`ALTER TABLE crm_invoices ADD COLUMN IF NOT EXISTS public_id TEXT`;
  await sql`ALTER TABLE crm_invoices ADD COLUMN IF NOT EXISTS stripe_session_id TEXT`;
  await sql`ALTER TABLE crm_invoices ADD COLUMN IF NOT EXISTS checkout_url TEXT`;
  await sql`ALTER TABLE crm_invoices ADD COLUMN IF NOT EXISTS payment_status TEXT`;
  await sql`ALTER TABLE crm_invoices ADD COLUMN IF NOT EXISTS paid_date TIMESTAMPTZ`;
  await sql`ALTER TABLE crm_invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR'`;
  await sql`ALTER TABLE crm_invoices ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE`;
  
  // Invoice Items
  await sql`
    CREATE TABLE IF NOT EXISTS crm_invoice_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID REFERENCES crm_invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity NUMERIC(10,2) DEFAULT 1,
      unit_price NUMERIC(12,2) DEFAULT 0,
      tax_rate NUMERIC(5,2) DEFAULT 19.00,
      tax_amount NUMERIC(12,2) DEFAULT 0,
      line_total NUMERIC(12,2) DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  
  // Invoice Payments
  await sql`
    CREATE TABLE IF NOT EXISTS crm_invoice_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID REFERENCES crm_invoices(id) ON DELETE CASCADE,
      amount NUMERIC(12,2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'bank_transfer',
      payment_reference TEXT,
      payment_date TIMESTAMPTZ DEFAULT NOW(),
      notes TEXT,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  
  // Questionnaire Responses
  await sql`
    CREATE TABLE IF NOT EXISTS questionnaire_responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID,
      token TEXT UNIQUE,
      template_slug TEXT,
      answers JSONB,
      submitted_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  
  // Admin Notifications State
  await sql`
    CREATE TABLE IF NOT EXISTS admin_notifications_state (
      id TEXT PRIMARY KEY,
      read BOOLEAN DEFAULT FALSE,
      dismissed BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  
  // Email Settings
  await sql`
    CREATE TABLE IF NOT EXISTS email_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      smtp_host TEXT,
      smtp_port INTEGER,
      smtp_secure BOOLEAN DEFAULT FALSE,
      smtp_user TEXT,
      smtp_pass TEXT,
      from_email TEXT,
      from_name TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  
  // Discount Coupons
  await sql`
    CREATE TABLE IF NOT EXISTS discount_coupons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT UNIQUE NOT NULL,
      discount_type TEXT NOT NULL,
      discount_value NUMERIC(10,2) NOT NULL,
      min_purchase NUMERIC(10,2) DEFAULT 0,
      max_uses INTEGER,
      current_uses INTEGER DEFAULT 0,
      valid_from TIMESTAMPTZ,
      valid_until TIMESTAMPTZ,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  
  // Indexes for performance
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_invoices_client_id ON crm_invoices(client_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_invoices_status ON crm_invoices(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_invoices_created_at ON crm_invoices(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email)`;
  
  console.log('✅ Schema v1 applied successfully');
}

/**
 * Schema version tracking
 */
async function ensureSchemaVersion(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_version (
      id INTEGER PRIMARY KEY DEFAULT 1,
      version INTEGER NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  
  const result = await sql`SELECT version FROM schema_version WHERE id = 1`;
  const currentVersion = result.length > 0 ? result[0].version : 0;
  
  if (currentVersion < SCHEMA_VERSION) {
    console.log(`📦 Migrating schema from v${currentVersion} to v${SCHEMA_VERSION}...`);
    
    // Apply migrations
    if (currentVersion < 1) {
      await applySchemaV1(sql);
    }
    
    // Update version
    await sql`
      INSERT INTO schema_version (id, version, applied_at)
      VALUES (1, ${SCHEMA_VERSION}, NOW())
      ON CONFLICT (id) DO UPDATE SET version = ${SCHEMA_VERSION}, applied_at = NOW()
    `;
    
    console.log(`✅ Schema migrated to v${SCHEMA_VERSION}`);
  } else {
    console.log(`✅ Schema is up to date (v${SCHEMA_VERSION})`);
  }
}

/**
 * Main entry point - call this on server startup
 */
async function initializeDatabase(databaseUrl) {
  console.log('🔧 Initializing database schema...');
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  
  const sql = neon(databaseUrl);
  
  try {
    // Apply schema migrations
    await ensureSchemaVersion(sql);
    
    console.log('✅ Database initialization complete');
    return { sql, success: true };
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Validation: Check if database has all required tables
 */
async function validateSchema(sql) {
  const requiredTables = [
    'crm_clients',
    'leads',
    'crm_invoices',
    'crm_invoice_items',
    'schema_version'
  ];
  
  const result = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = ANY(${requiredTables})
  `;
  
  const existingTables = result.map(r => r.table_name);
  const missingTables = requiredTables.filter(t => !existingTables.includes(t));
  
  if (missingTables.length > 0) {
    throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
  }
  
  console.log('✅ Schema validation passed');
  return true;
}

module.exports = {
  initializeDatabase,
  validateSchema,
  SCHEMA_VERSION
};
