// Blog posts whose cover image was erased by opening them in the editor.
//
// The admin form loaded `post.cover_image` while the API returns `imageUrl`, so opening a
// published post to change anything at all loaded the cover as '' — and the save posts
// `imageUrl: formData.cover_image || ''`, writing an empty string over it. The two extra
// image slots survived on the same post, because those lines already carried the
// camelCase fallback the cover did not.
//
// So a post with no cover but a populated slot 2 or 3 is the fingerprint of the bug. This
// promotes the first surviving image to the cover; the studio can change it afterwards.
//
//   node scripts/gal-repair-blog-covers.mjs           report only
//   node scripts/gal-repair-blog-covers.mjs --apply   restore the covers
import 'dotenv/config';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
for (let i = 0; ; i++) {
  try { await db.connect(); break; }
  catch (e) { if (i >= 6) throw e; await new Promise((r) => setTimeout(r, 2500)); }
}

const { rows } = await db.query(`
  SELECT id, title, image_url, image_url_2, image_url_3
    FROM blog_posts
   WHERE coalesce(trim(image_url), '') = ''
     AND (coalesce(trim(image_url_2), '') <> '' OR coalesce(trim(image_url_3), '') <> '')
   ORDER BY created_at DESC`);

if (!rows.length) {
  const total = (await db.query(`SELECT count(*)::int n FROM blog_posts WHERE coalesce(trim(image_url),'') = ''`)).rows[0].n;
  console.log(`\n  No post has a recoverable cover.${total ? ` (${total} post(s) have no cover and no other image — those need a fresh upload.)` : ''}\n`);
  await db.end();
  process.exit(0);
}

console.log(`\n  ${rows.length} post(s) lost a cover but still hold another image:\n`);
const live = async (u) => { try { return (await fetch(u, { method: 'HEAD' })).ok; } catch { return false; } };

const plan = [];
for (const p of rows) {
  const candidates = [p.image_url_2, p.image_url_3].map((v) => (v || '').trim()).filter(Boolean);
  let chosen = null;
  for (const c of candidates) { if (await live(c)) { chosen = c; break; } }
  console.log(`  ${p.title}`);
  if (!chosen) { console.log('    none of its images resolve — needs a fresh upload\n'); continue; }
  console.log(`    -> ${chosen.slice(0, 96)}\n`);
  plan.push({ id: p.id, url: chosen });
}

if (!plan.length) { console.log('  Nothing recoverable.\n'); await db.end(); process.exit(0); }
if (!APPLY) { console.log(`  Re-run with --apply to restore ${plan.length} cover(s).\n`); await db.end(); process.exit(0); }

for (const p of plan) {
  await db.query(`UPDATE blog_posts SET image_url = $1, updated_at = now() WHERE id = $2`, [p.url, p.id]);
}
console.log(`  ${plan.length} cover(s) restored.\n`);
await db.end();
