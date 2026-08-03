require('dotenv').config();

(async () => {
  try {
    const { neon } = require('@neondatabase/serverless');
    if (!process.env.DATABASE_URL) {
      console.error('No DATABASE_URL in env');
      process.exit(2);
    }
    const sql = neon(process.env.DATABASE_URL);
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

    // Ensure table exists at least with id and created_at
    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id uuid primary key default gen_random_uuid(),
        created_at timestamptz default now()
      )`;

    const colsRows = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices'`;
    const cols = new Set(colsRows.map(r => r.column_name));

    const now = new Date();
    const iso = now.toISOString().slice(0,10);

    // Prepare column list & values based on available columns
    const fields = [];
    const values = [];

    const add = (name, val) => { if (cols.has(name)) { fields.push(name); values.push(val); } };

    add('invoice_no', `INV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-SEED`);
    add('invoice_number', `INV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-SEED`);
    add('client_name', 'Seed Client');
    add('client_email', 'seed@example.com');
    add('client_phone', '');
    add('issue_date', iso);
    add('due_date', iso);
    add('currency', 'EUR');
    add('subtotal', 100);
    add('subtotal_amount', 100);
    add('tax', 0);
    add('tax_amount', 0);
    add('total', 100);
    add('total_amount', 100);
    add('status', 'draft');
    add('public_id', Math.random().toString(36).slice(2, 10));
    add('notes', 'Seed invoice created by seed-invoice.js');
    add('meta', {});

    const columnList = fields.map(f => `"${f}"`).join(', ');
    const placeholders = values.map((_, i) => `$${i+1}`).join(', ');

    const insertSql = `INSERT INTO invoices (${columnList}) VALUES (${placeholders}) RETURNING id`;
    const result = await sql(insertSql, values);
    console.log('Inserted invoice id:', result?.[0]?.id);

    process.exit(0);
  } catch (e) {
    console.error('SEED_ERROR:', e.message || e);
    if (e && e.stack) console.error(e.stack);
    process.exit(1);
  }
})();
