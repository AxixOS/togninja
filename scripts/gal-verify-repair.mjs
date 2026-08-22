// Does the repair script fix the damaged rows — and leave the healthy ones alone?
//
// A repair that over-reaches is its own outage: privatising a studio's legitimate public
// portfolio gallery, or flipping a protection flag off to "fix" a warning, would both be
// worse than the bug. So this asserts the negatives as hard as the positives.
//
// It writes five synthetic galleries covering every classification, runs the real repair
// script as a child process, re-reads the rows, and deletes them again.
//
// Run: node scripts/gal-verify-repair.mjs
import 'dotenv/config';
import pg from 'pg';
import { execFileSync } from 'child_process';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
for (let i = 0; ; i++) {
  try { await db.connect(); break; }
  catch (e) { if (i >= 6) throw e; await new Promise((r) => setTimeout(r, 2500)); }
}

const ids = [];
let clientId = null;

const mk = async (slug, { pw = null, protectedFlag = false, isPublic = true, withClient = false }) => {
  const r = await db.query(
    `INSERT INTO galleries (title, slug, password, is_password_protected, is_public, client_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE') RETURNING id`,
    [slug, slug, pw, protectedFlag, isPublic, withClient ? clientId : null]);
  ids.push(r.rows[0].id);
  return r.rows[0].id;
};

const read = async (id) => (await db.query(
  `SELECT is_password_protected, is_public, password FROM galleries WHERE id = $1`, [id])).rows[0];

try {
  const c = await db.query(
    `INSERT INTO crm_clients (first_name, last_name, email)
     VALUES ('Repair', 'Probe', $1) RETURNING id`,
    [`repair-probe-${Date.now()}@example.invalid`]);
  clientId = c.rows[0].id;

  // 1. The exact damage the broken create route produced.
  const exposed = await mk('repair-exposed', { pw: 'hunter2', protectedFlag: false, isPublic: true });
  // 2. A client delivery gallery on the public list, no password.
  const published = await mk('repair-published', { pw: null, protectedFlag: false, isPublic: true, withClient: true });
  // 3. Fail-open state closed in v1.9.45 — must be REPORTED, never "fixed" by unflagging.
  const lockedOut = await mk('repair-lockedout', { pw: null, protectedFlag: true, isPublic: false });
  // 4. A correctly configured private gallery.
  const healthy = await mk('repair-healthy', { pw: 'hunter2', protectedFlag: true, isPublic: false });
  // 5. A legitimate PUBLIC portfolio gallery: no password, no client. Must stay public.
  const portfolio = await mk('repair-portfolio', { pw: null, protectedFlag: false, isPublic: true });

  console.log('\n=== dry run changes nothing ===');
  const dry = execFileSync('node', ['scripts/gal-repair-exposed.mjs'], { encoding: 'utf8' });
  check('the dry run names the exposed gallery', dry.includes('repair-exposed'));
  check('the dry run says it would change 2 rows', /2 gallery row\(s\) would be changed/.test(dry));
  check('exposed row untouched by the dry run', (await read(exposed)).is_password_protected === false);
  check('published row untouched by the dry run', (await read(published)).is_public === true);

  console.log('\n=== --apply repairs the damaged rows ===');
  const applied = execFileSync('node', ['scripts/gal-repair-exposed.mjs', '--apply'], { encoding: 'utf8' });
  check('it reports success', applied.includes('no gallery is left exposed'));

  const e = await read(exposed);
  check('exposed: protection flag now enforced', e.is_password_protected === true);
  check('exposed: password left exactly as it was', e.password === 'hunter2');
  check('exposed: also removed from the public list', e.is_public === false);

  check('published: removed from the public list', (await read(published)).is_public === false);

  console.log('\n=== and leaves everything else alone ===');
  const l = await read(lockedOut);
  check('locked-out: flag NOT silently turned off', l.is_password_protected === true,
    'turning it off would unlock the gallery, not fix it');
  check('locked-out: still reported to the studio', applied.includes('repair-lockedout'));

  const h = await read(healthy);
  check('healthy: protection untouched', h.is_password_protected === true);
  check('healthy: still private', h.is_public === false);

  const p = await read(portfolio);
  check('portfolio: a genuine public gallery stays PUBLIC', p.is_public === true,
    'no password, no client — privatising it would be an outage, not a fix');

  console.log('\n=== re-running is a no-op ===');
  const again = execFileSync('node', ['scripts/gal-repair-exposed.mjs'], { encoding: 'utf8' });
  check('second dry run finds nothing to repair', again.includes('Nothing to repair'));
} finally {
  for (const id of ids) await db.query('DELETE FROM galleries WHERE id = $1', [id]).catch(() => {});
  if (clientId) await db.query('DELETE FROM crm_clients WHERE id = $1', [clientId]).catch(() => {});
  await db.end().catch(() => {});
}

console.log(bad ? `\n  ${bad} CHECK(S) FAILED\n` : '\n  ALL CHECKS PASSED — repairs the damage, touches nothing else\n');
process.exit(bad ? 1 : 0);
