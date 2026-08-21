// Do the agent's write tools reference columns that actually exist?
//
// Five did not, and none of it was visible: drizzle resolves a values()/set() key against
// the model and throws "Cannot read properties of undefined (reading 'name')" only when
// the statement runs — and these statements had never run, because a slice(0,20) upstream
// cut every write tool out of the list handed to the model. The code was wrong in a way
// no build, no type-check and no reviewer had reason to notice.
//
// This checks the tool SOURCE against the live database, so it catches the next one.
import fs from 'fs';
import pg from 'pg';

const line = fs.readFileSync('.env', 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
const pool = new pg.Pool({
  connectionString: (process.env.DATABASE_URL || line.slice(13).trim()).replace(/^["']|["']$/g, ''),
  max: 2, ssl: { rejectUnauthorized: false },
});

// drizzle model name -> real table
const TABLES = {
  crmMessages: 'crm_messages',
  crmInvoices: 'crm_invoices',
  crmInvoiceItems: 'crm_invoice_items',
  crmClients: 'crm_clients',
  crmLeads: 'crm_leads',
  photographySessions: 'photography_sessions',
};

const snake = (s) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());

const schema = {};
for (const [model, table] of Object.entries(TABLES)) {
  const { rows } = await pool.query(
    `SELECT column_name, is_nullable, column_default FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1`, [table]);
  schema[model] = {
    table,
    cols: new Set(rows.map((r) => r.column_name)),
    required: rows.filter((r) => r.is_nullable === 'NO' && !r.column_default).map((r) => r.column_name),
  };
}

const FILES = fs.readdirSync('agent/v2/tools').filter((f) => f.endsWith('.ts'));
let problems = 0;

for (const f of FILES) {
  const src = fs.readFileSync('agent/v2/tools/' + f, 'utf8');

  // Every `db.insert(model).values({ ... })` and `.update(model)...set({ ... })`.
  const ops = [
    ...src.matchAll(/db\s*\.\s*insert\(\s*(\w+)\s*\)\s*\.values\(\{([\s\S]*?)\}\)/g),
  ].map((m) => ({ kind: 'insert', model: m[1], body: m[2] }));
  for (const m of src.matchAll(/\.update\(\s*(\w+)\s*\)[\s\S]{0,200}?\.set\(\{([\s\S]*?)\}\)/g)) {
    ops.push({ kind: 'update', model: m[1], body: m[2] });
  }

  for (const op of ops) {
    const s = schema[op.model];
    if (!s) continue;                       // a model this check does not cover
    // Top-level keys, BOTH forms. Matching only `key:` missed ES6 shorthand
    // (`invoiceNumber,`) and reported three columns as never set when they were set on
    // the line above. A false alarm costs a reader exactly as much as a miss does.
    const keys = [
      ...[...op.body.matchAll(/^[ \t]*(\w+)[ \t]*:/gm)].map((m) => m[1]),
      ...[...op.body.matchAll(/^[ \t]*(\w+)[ \t]*,[ \t]*$/gm)].map((m) => m[1]),
    ];

    const unknown = keys.filter((k) => !s.cols.has(snake(k)));
    if (unknown.length) {
      problems++;
      console.log(`  FAIL  ${f}  ${op.kind} ${s.table}: no such column -> ${unknown.map(snake).join(', ')}`);
    }

    if (op.kind === 'insert') {
      const missing = s.required.filter((c) => !keys.map(snake).includes(c) && c !== 'id');
      if (missing.length) {
        problems++;
        console.log(`  FAIL  ${f}  insert ${s.table}: NOT NULL column never set -> ${missing.join(', ')}`);
      }
    }
    if (!unknown.length && (op.kind === 'update' || !s.required.filter((c) => !keys.map(snake).includes(c) && c !== 'id').length)) {
      console.log(`  ok    ${f}  ${op.kind} ${s.table}  (${keys.length} columns)`);
    }
  }
}

// Hardcoded currency in the money tools is the other silent wrongness.
console.log('');
for (const f of FILES.filter((x) => x.startsWith('invoices.'))) {
  const src = fs.readFileSync('agent/v2/tools/' + f, 'utf8');
  const euros = (src.match(/€/g) || []).length;
  if (euros) { problems++; console.log(`  FAIL  ${f}: ${euros} hardcoded euro sign(s)`); }
  else console.log(`  ok    ${f}: no hardcoded currency`);
}

await pool.end();
console.log(problems ? `\n  ${problems} PROBLEM(S)\n` : '\n  ALL WRITE TOOLS MATCH THE SCHEMA\n');
process.exit(problems ? 1 : 0);
