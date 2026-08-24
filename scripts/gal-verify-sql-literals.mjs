// A JavaScript comment inside a SQL template literal is sent to Postgres verbatim.
//
// This is not hypothetical: a patch that meant to explain a status value placed the
// comment INSIDE the INSERT, so every Price Wizard research run failed with
//   syntax error at or near "."
// — the full stop after 'completed' in an English sentence Postgres was asked to execute.
// It shipped, and it stayed broken until the studio hit it.
//
// Run: node scripts/gal-verify-sql-literals.mjs
import fs from 'fs';
import path from 'path';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); }
    else if (/\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}

// Every way this repo sends SQL.
const CALLS = /(?:pool\.query|client\.query|runSql|db\.execute)\(\s*`([\s\S]*?)`/g;

const offenders = [];
let scanned = 0;
for (const f of walk('server')) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  CALLS.lastIndex = 0;
  while ((m = CALLS.exec(src))) {
    scanned++;
    const sql = m[1];
    // A line whose first non-space characters are // — Postgres has no such comment form.
    // (-- IS valid SQL, and is deliberately not flagged.)
    const hit = sql.split('\n').find((l) => l.trim().startsWith('//'));
    if (hit) {
      const line = src.slice(0, m.index).split('\n').length;
      offenders.push(`${f.split(path.sep).join('/')}:${line} — ${hit.trim().slice(0, 60)}`);
    }
  }
}

console.log(`\n=== no SQL statement carries a JavaScript comment ===`);
console.log(`  scanned ${scanned} SQL template literal(s) across server/\n`);
check('no // comment inside a SQL literal', offenders.length === 0, `${offenders.length} found`);
for (const o of offenders) console.log(`        ${o}`);

// The specific statement that broke, asserted by shape rather than by memory.
const pw = fs.readFileSync('server/routes/price-wizard.ts', 'utf8');
const insert = (pw.match(/INSERT INTO price_wizard_sessions[\s\S]*?RETURNING id, created_at/) || [''])[0];
check('the quick-start INSERT is clean SQL', insert.length > 0 && !insert.includes('//'));
check('and it still records the manual status', /'discovering' : 'manual'/.test(pw));

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED — Postgres would be asked to execute English\n`
  : '\n  ALL CHECKS PASSED — every statement is SQL all the way down\n');
process.exit(bad ? 1 : 0);
