const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const tables = ['crm_clients', 'crm_invoices', 'crm_leads', 'crm_messages', 'photography_sessions', 'crm_invoice_items', 'crm_invoice_payments'];
  for (const table of tables) {
    const r = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`, [table]);
    console.log(`\n${table}:`);
    r.rows.forEach(row => console.log('  ' + row.column_name));
  }
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
