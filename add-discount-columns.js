/**
 * Migration: Add discount_type and discount_value columns to crm_invoices table
 * This supports percentage-based discounts in addition to fixed amount discounts.
 * 
 * Run with: node add-discount-columns.js
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function migrate() {
  console.log('🚀 Starting discount columns migration...\n');

  try {
    // Add discount_type column (default 'fixed')
    console.log('Adding discount_type column...');
    await sql`
      ALTER TABLE crm_invoices 
      ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'fixed'
    `;
    console.log('✅ discount_type column added\n');

    // Add discount_value column (stores the input value - either percentage or fixed amount)
    console.log('Adding discount_value column...');
    await sql`
      ALTER TABLE crm_invoices 
      ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2) DEFAULT 0
    `;
    console.log('✅ discount_value column added\n');

    // Ensure discount_amount column exists (stores the calculated discount)
    console.log('Ensuring discount_amount column exists...');
    await sql`
      ALTER TABLE crm_invoices 
      ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0
    `;
    console.log('✅ discount_amount column confirmed\n');

    // Ensure footer_text column exists
    console.log('Ensuring footer_text column exists...');
    await sql`
      ALTER TABLE crm_invoices 
      ADD COLUMN IF NOT EXISTS footer_text TEXT
    `;
    console.log('✅ footer_text column confirmed\n');

    // Ensure public_id column exists
    console.log('Ensuring public_id column exists...');
    await sql`
      ALTER TABLE crm_invoices 
      ADD COLUMN IF NOT EXISTS public_id TEXT
    `;
    console.log('✅ public_id column confirmed\n');

    // Verify the schema
    console.log('📊 Verifying crm_invoices schema...');
    const columns = await sql`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'crm_invoices'
      ORDER BY ordinal_position
    `;
    
    console.log('\nCurrent crm_invoices columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.column_default ? ` (default: ${col.column_default})` : ''}`);
    });

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
