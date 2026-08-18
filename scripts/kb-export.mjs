// Export knowledge_base to JSON before a reset wipes it. Full rows, so it can be
// restored as-is. The reset has to empty this table — its seeder only runs when the
// table is empty, so rows left behind mean it can never seed for the next studio —
// and these nine articles are real written content, not test data.
//
//   node scripts/export-knowledge-base.mjs            # export
//   node scripts/export-knowledge-base.mjs --restore <file>   # put them back
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const line = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
const pool = new pg.Pool({
  connectionString: line.slice(13).trim().replace(/^["']|["']$/g, ''),
  max: 2, ssl: { rejectUnauthorized: false },
});
const q = async (s, a = []) => (await pool.query(s, a)).rows;

const restoreIdx = process.argv.indexOf('--restore');

if (restoreIdx === -1) {
  const rows = await q('SELECT * FROM knowledge_base ORDER BY id');
  const stamp = new Date().toISOString().slice(0, 10);
  const dir = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\//, ''), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `knowledge-base-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(rows, null, 2), 'utf8');

  console.log(`\nExported ${rows.length} rows -> ${file}`);
  console.log(`Columns: ${Object.keys(rows[0] || {}).join(', ')}\n`);
  let chars = 0;
  for (const r of rows) {
    const body = String(r.content || r.answer || r.body || '');
    chars += body.length;
    console.log(`  ${String(r.title || '(untitled)').padEnd(50)} ${body.length} chars`);
  }
  console.log(`\n${chars} characters of content total.`);
  console.log('Restore with: node scripts/export-knowledge-base.mjs --restore ' + file);
} else {
  const file = process.argv[restoreIdx + 1];
  if (!file) { console.error('--restore needs a file path'); process.exit(1); }
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  const cols = Object.keys(rows[0] || {});
  let n = 0;
  for (const r of rows) {
    const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
    await pool.query(
      `INSERT INTO knowledge_base (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${ph}) ON CONFLICT DO NOTHING`,
      cols.map((c) => r[c]),
    );
    n++;
  }
  console.log(`Restored ${n} rows from ${file}`);
}

await pool.end();
