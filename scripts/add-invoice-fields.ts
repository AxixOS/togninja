import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

async function addInvoiceFields() {
  console.log('🔧 Adding new fields to crm_invoices table...');
  
  try {
    // Add currency column
    await pool.query(`
      ALTER TABLE crm_invoices 
      ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR'
    `);
    console.log('✅ Added currency column');
    
    // Add payment_terms column
    await pool.query(`
      ALTER TABLE crm_invoices 
      ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 30'
    `);
    console.log('✅ Added payment_terms column');
    
    // Add discount_amount column
    await pool.query(`
      ALTER TABLE crm_invoices 
      ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0
    `);
    console.log('✅ Added discount_amount column');
    
    // Update existing invoices to have default values
    await pool.query(`
      UPDATE crm_invoices 
      SET 
        currency = COALESCE(currency, 'EUR'),
        payment_terms = COALESCE(payment_terms, 'Net 30'),
        discount_amount = COALESCE(discount_amount, 0)
      WHERE currency IS NULL 
         OR payment_terms IS NULL 
         OR discount_amount IS NULL
    `);
    console.log('✅ Updated existing invoices with default values');
    
    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addInvoiceFields().catch(console.error);

