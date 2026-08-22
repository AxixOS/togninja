// Find and repair galleries that were written by the broken create route.
//
// Until v1.9.46, the admin sent a mixed-convention body and Drizzle silently dropped every
// snake_case key, letting the column defaults through. A gallery the studio created with
// "password protect" ticked was stored as:
//
//   password              = the text they typed
//   is_password_protected = false   <- column default
//   is_public             = true    <- column default
//   client_id             = null
//
// Fixing the code does not retro-fit rows that were already written. This does.
//
//   node scripts/gal-repair-exposed.mjs           report only, changes nothing
//   node scripts/gal-repair-exposed.mjs --apply   perform the repair, in one transaction
//
// Safe to re-run: the second pass finds nothing.

import 'dotenv/config';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
for (let i = 0; ; i++) {
  // Supabase's pooler resolves intermittently from here.
  try { await db.connect(); break; }
  catch (e) { if (i >= 6) throw e; await new Promise((r) => setTimeout(r, 2500)); }
}

const rows = (await db.query(`
  SELECT id, title, slug, is_password_protected, is_public, client_id, deleted_at,
         (password IS NOT NULL AND btrim(password) <> '') AS has_password,
         (SELECT count(*)::int FROM gallery_images gi WHERE gi.gallery_id = g.id) AS images
    FROM galleries g
   ORDER BY created_at DESC
`)).rows;

// ── Classify ────────────────────────────────────────────────────────────────
//
// EXPOSED is the one that matters: a password was saved, so the studio believed the
// gallery was locked, and the flag that makes anyone check it is false. Anyone with the
// slug walks in with an email address.
const exposed = rows.filter((r) => r.has_password && r.is_password_protected === false);

// A gallery holding a password or attached to a client is a delivery gallery, and
// is_public puts it on the unauthenticated GET /api/galleries list — which is how an
// outsider learns the slug in the first place.
const published = rows.filter((r) => r.is_public === true && (r.has_password || r.client_id));

// The fail-open state closed in v1.9.45: marked protected, nothing to check. These now
// return 403 to clients, so they are not a leak — but the studio must set a password or
// the client cannot get in, and nothing in the admin says so.
const lockedOut = rows.filter((r) => r.is_password_protected === true && !r.has_password);

// Not repairable here: the client link was dropped on create and cannot be inferred.
const orphaned = rows.filter((r) => !r.client_id && !r.deleted_at);

const show = (list, cols) => {
  for (const r of list) {
    const tag = `${(r.title || '(untitled)').slice(0, 34).padEnd(34)} /${(r.slug || '').slice(0, 28).padEnd(28)}`;
    console.log(`    ${tag} ${cols(r)}`);
  }
};

console.log(`\n  ${rows.length} gallery row(s) in the database\n`);

console.log(`=== EXPOSED — a password was saved but never enforced (${exposed.length}) ===`);
if (!exposed.length) console.log('    none');
else {
  show(exposed, (r) => `${String(r.images).padStart(4)} images${r.is_public ? '  AND publicly listed' : ''}`);
  console.log('    -> set is_password_protected = true');
}

console.log(`\n=== PUBLISHED — a client gallery on the anonymous list (${published.length}) ===`);
if (!published.length) console.log('    none');
else {
  show(published, (r) => `${String(r.images).padStart(4)} images  client=${r.client_id ? 'yes' : 'no'}`);
  console.log('    -> set is_public = false');
}

console.log(`\n=== LOCKED OUT — marked protected with no password (${lockedOut.length}) ===`);
if (!lockedOut.length) console.log('    none');
else {
  show(lockedOut, (r) => `${String(r.images).padStart(4)} images`);
  console.log('    -> NOT changed. Clients get a 403 until the studio sets a password;');
  console.log('       flipping the flag off instead would silently unlock the gallery.');
}

console.log(`\n=== ORPHANED — no client attached (${orphaned.length}) ===`);
if (!orphaned.length) console.log('    none');
else {
  show(orphaned, (r) => `${String(r.images).padStart(4)} images`);
  console.log('    -> NOT repairable: the link was dropped on create and cannot be guessed.');
  console.log('       Re-attach from the gallery edit screen if the studio needs it.');
}

const toFix = new Set([...exposed, ...published].map((r) => r.id));

if (!toFix.size) {
  console.log('\n  Nothing to repair.\n');
  await db.end();
  process.exit(0);
}

if (!APPLY) {
  console.log(`\n  ${toFix.size} gallery row(s) would be changed. Re-run with --apply to do it.\n`);
  await db.end();
  process.exit(0);
}

// ── Repair ──────────────────────────────────────────────────────────────────
// One transaction: a half-applied security repair is worse than none, because it looks
// finished.
try {
  await db.query('BEGIN');

  const a = await db.query(`
    UPDATE galleries SET is_password_protected = true, updated_at = NOW()
     WHERE id = ANY($1::uuid[])
    RETURNING id`, [exposed.map((r) => r.id)]);

  const b = await db.query(`
    UPDATE galleries SET is_public = false, updated_at = NOW()
     WHERE id = ANY($1::uuid[])
    RETURNING id`, [published.map((r) => r.id)]);

  await db.query('COMMIT');
  console.log(`\n  REPAIRED  ${a.rowCount} gallery/galleries now enforce their password`);
  console.log(`  REPAIRED  ${b.rowCount} gallery/galleries removed from the public list`);
} catch (e) {
  await db.query('ROLLBACK').catch(() => {});
  console.error('\n  FAILED, rolled back:', e.message);
  await db.end();
  process.exit(1);
}

// ── Confirm ─────────────────────────────────────────────────────────────────
// Re-read rather than trusting the UPDATE's own row count.
const after = (await db.query(`
  SELECT count(*)::int AS n FROM galleries
   WHERE (password IS NOT NULL AND btrim(password) <> '' AND is_password_protected = false)
      OR (is_public = true AND (client_id IS NOT NULL OR (password IS NOT NULL AND btrim(password) <> '')))
`)).rows[0].n;

console.log(after === 0
  ? '\n  Verified: no gallery is left exposed.\n'
  : `\n  STILL EXPOSED: ${after} row(s) — investigate before onboarding.\n`);

await db.end();
process.exit(after === 0 ? 0 : 1);
