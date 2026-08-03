/**
 * Migration: Add billing/payment columns to voucher_sales and client_id link
 * Also ensures crm_clients has all necessary columns
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('🔧 Adding billing and payment columns to voucher_sales...\n');

    // Add billing address columns to voucher_sales
    const voucherSalesColumns = [
      { name: 'billing_address', type: 'TEXT' },
      { name: 'billing_city', type: 'TEXT' },
      { name: 'billing_zip', type: 'VARCHAR(20)' },
      { name: 'billing_country', type: 'VARCHAR(10)' },
      { name: 'card_brand', type: 'VARCHAR(50)' },
      { name: 'card_last4', type: 'VARCHAR(4)' },
      { name: 'client_id', type: 'UUID REFERENCES crm_clients(id)' },
    ];

    for (const col of voucherSalesColumns) {
      try {
        await pool.query(`ALTER TABLE voucher_sales ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`✓ voucher_sales.${col.name} added`);
      } catch (e) {
        if (e.message.includes('already exists')) {
          console.log(`  voucher_sales.${col.name} already exists`);
        } else {
          console.error(`✗ Error adding ${col.name}:`, e.message);
        }
      }
    }

    console.log('\n🔧 Ensuring crm_clients has all necessary columns...\n');

    // Ensure crm_clients has necessary columns
    const clientColumns = [
      { name: 'address2', type: 'TEXT' },
      { name: 'client_since', type: 'TIMESTAMP' },
      { name: 'last_session_date', type: 'TIMESTAMP' },
      { name: 'lifetime_value', type: 'NUMERIC(10, 2)' },
      { name: 'source', type: 'VARCHAR(100)' },
      { name: 'tags', type: 'TEXT[]' },
    ];

    for (const col of clientColumns) {
      try {
        await pool.query(`ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`✓ crm_clients.${col.name} added`);
      } catch (e) {
        if (e.message.includes('already exists')) {
          console.log(`  crm_clients.${col.name} already exists`);
        } else {
          console.error(`✗ Error adding ${col.name}:`, e.message);
        }
      }
    }

    // Verify columns
    console.log('\n📋 Verifying voucher_sales columns...');
    const vsResult = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'voucher_sales' 
      AND column_name IN ('billing_address', 'billing_city', 'billing_zip', 'billing_country', 'card_brand', 'card_last4', 'client_id')
    `);
    console.log('Found columns:', vsResult.rows.map(r => r.column_name).join(', '));

    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

migrate();
