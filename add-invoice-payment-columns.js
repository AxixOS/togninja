/**
 * Migration: Add invoice payment columns
 * Adds footer_text, stripe_payment_intent_id, stripe_payment_url, paid_amount columns to crm_invoices
 */
const { Pool } = require('pg');

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  console.log('🔄 Running migration: add-invoice-payment-columns');

  try {
    // Add footer_text column
    await pool.query(`
      ALTER TABLE crm_invoices 
      ADD COLUMN IF NOT EXISTS footer_text TEXT
    `);
    console.log('✅ Added footer_text column');

    // Add stripe_payment_intent_id column
    await pool.query(`
      ALTER TABLE crm_invoices 
      ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT
    `);
    console.log('✅ Added stripe_payment_intent_id column');

    // Add stripe_payment_url column
    await pool.query(`
      ALTER TABLE crm_invoices 
      ADD COLUMN IF NOT EXISTS stripe_payment_url TEXT
    `);
    console.log('✅ Added stripe_payment_url column');

    // Add paid_amount column
    await pool.query(`
      ALTER TABLE crm_invoices 
      ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0
    `);
    console.log('✅ Added paid_amount column');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrate };
