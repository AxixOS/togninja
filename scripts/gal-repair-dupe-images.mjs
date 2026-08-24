// One section, one image.
//
// "Replace Image" used to INSERT a new row and then fire a separate DELETE for the old one
// without checking the response. When that delete failed, the section kept both — and the
// homepage renders whichever the API returns first. A studio replaced their hero, the
// upload succeeded, and they carried on seeing the old picture.
//
// The upload now replaces atomically. This clears what the old flow already left behind,
// keeping the NEWEST image for each section, which is the one the studio last chose.
//
//   node scripts/gal-repair-dupe-images.mjs           report only
//   node scripts/gal-repair-dupe-images.mjs --apply   remove the superseded rows
import 'dotenv/config';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
for (let i = 0; ; i++) {
  try { await db.connect(); break; }
  catch (e) { if (i >= 6) throw e; await new Promise((r) => setTimeout(r, 2500)); }
}

const dupes = (await db.query(`
  SELECT section, count(*)::int AS n FROM homepage_images
   GROUP BY section HAVING count(*) > 1 ORDER BY section`)).rows;

if (!dupes.length) {
  console.log('\n  Every section has exactly one image.\n');
  await db.end();
  process.exit(0);
}

console.log(`\n  ${dupes.length} section(s) hold more than one image:\n`);
for (const d of dupes) {
  const rows = (await db.query(
    `SELECT id, left(url, 60) AS url, created_at FROM homepage_images
      WHERE section = $1 ORDER BY created_at DESC`, [d.section])).rows;
  console.log(`  ${d.section}  (${d.n})`);
  rows.forEach((r, i) => console.log(`    ${i === 0 ? 'KEEP  ' : 'remove'} ${r.created_at.toISOString().slice(0, 16)}  …${r.url.slice(-40)}`));
}

if (!APPLY) {
  console.log('\n  Re-run with --apply to remove the superseded rows.\n');
  await db.end();
  process.exit(0);
}

// Keep the newest per section — the one the studio last uploaded.
const removed = await db.query(`
  DELETE FROM homepage_images h
   WHERE EXISTS (
     SELECT 1 FROM homepage_images n
      WHERE n.section = h.section AND n.created_at > h.created_at
   )
  RETURNING id, section`);

console.log(`\n  Removed ${removed.rowCount} superseded image(s).`);

const left = (await db.query(`
  SELECT count(*)::int AS n FROM (
    SELECT section FROM homepage_images GROUP BY section HAVING count(*) > 1
  ) x`)).rows[0].n;
console.log(left === 0
  ? '  Verified: every section now holds exactly one image.\n'
  : `  STILL DUPLICATED: ${left} section(s).\n`);

await db.end();
process.exit(left === 0 ? 0 : 1);
