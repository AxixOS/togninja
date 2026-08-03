require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    console.log('🔍 Checking database tables...\n');
    
    // Check invoices
    const inv = await sql`SELECT COUNT(*) as count FROM invoices`;
    console.log('📄 invoices table:', inv[0].count, 'rows');
    
    // Check crm_invoices
    const crm = await sql`SELECT COUNT(*) as count FROM crm_invoices`;
    console.log('📄 crm_invoices table:', crm[0].count, 'rows');
    
    // Check leads
    const leads = await sql`SELECT COUNT(*) as count FROM leads`;
    console.log('📄 leads table:', leads[0].count, 'rows');
    
    // Check inbox/notifications
    try {
      const inbox = await sql`SELECT COUNT(*) as count FROM inbox_messages`;
      console.log('📬 inbox_messages table:', inbox[0].count, 'rows');
    } catch (e) {
      console.log('📬 inbox_messages table: does not exist');
    }
    
    // Sample recent data
    console.log('\n--- Recent Invoices (invoices table) ---');
    try {
      const recentInv = await sql`SELECT * FROM invoices ORDER BY created_at DESC LIMIT 3`;
      console.table(recentInv);
    } catch (e) {
      console.log('No data or schema mismatch:', e.message);
    }
    
    console.log('\n--- Recent CRM Invoices (crm_invoices table) ---');
    const recentCrm = await sql`SELECT id, invoice_number, client_id, subtotal, tax_amount, total, status, created_at FROM crm_invoices ORDER BY created_at DESC LIMIT 5`;
    console.table(recentCrm);
    
    console.log('\n--- Recent Leads ---');
    const recentLeads = await sql`SELECT id, first_name, last_name, email, status, source, created_at FROM leads ORDER BY created_at DESC LIMIT 3`;
    console.table(recentLeads);
    
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
})();
