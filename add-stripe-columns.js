require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addColumns() {
  try {
    console.log('Adding columns to voucher_sales table...');
    
    await pool.query(`
      ALTER TABLE voucher_sales 
      ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);
    `);
    console.log('✓ Added stripe_session_id column');
    
    await pool.query(`
      ALTER TABLE voucher_sales 
      ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
    `);
    console.log('✓ Added stripe_payment_intent_id column');
    
    // Verify columns exist
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'voucher_sales' 
      AND column_name IN ('stripe_session_id', 'stripe_payment_intent_id');
    `);
    
    console.log('\nVerification - columns in table:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

addColumns();
