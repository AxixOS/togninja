require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'crm_invoice_items' 
      ORDER BY ordinal_position
    `);
    console.log('Columns in crm_invoice_items:');
    result.rows.forEach(row => console.log('  -', row.column_name, '(' + row.data_type + ')'));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
}

checkSchema();
