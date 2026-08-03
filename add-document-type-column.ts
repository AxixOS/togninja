import { pool } from './server/db';

async function addDocumentTypeColumn() {
  try {
    // Add document_type column to crm_invoices with default 'invoice'
    await pool.query(`
      ALTER TABLE crm_invoices 
      ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'invoice'
    `);
    console.log('✅ Added document_type column to crm_invoices');
    
    // Backfill existing rows
    await pool.query(`
      UPDATE crm_invoices SET document_type = 'invoice' WHERE document_type IS NULL
    `);
    console.log('✅ Backfilled existing invoices with document_type = invoice');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addDocumentTypeColumn();
