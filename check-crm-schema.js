require('dotenv').config();
const sql = require('./db');
(async () => {
  try {
    const r = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'crm_invoices' ORDER BY ordinal_position`;
    console.log('CRM Invoices schema:');
    r.forEach(col => console.log('  ' + col.column_name + ': ' + col.data_type));
    const inv = await sql`SELECT * FROM crm_invoices LIMIT 1`;
    console.log('Sample invoice data:');
    console.log(JSON.stringify(inv[0], null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
})();
