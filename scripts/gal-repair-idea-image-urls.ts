// Repair blog Idea Mode photos whose stored URL points at an S3 API endpoint.
//
// WHAT WENT WRONG. server/services/b2Upload.ts built its own public URL from process.env,
// ignoring the storage provider recorded in studio_integrations. Where AWS_S3_ENDPOINT still
// held an old Supabase endpoint, the URL builder produced:
//
//   https://<project>.storage.supabase.co/storage/v1/s3/<bucket>/<key>
//
// That is the S3 API path. It needs a SigV4 signature and answers 403 to an <img> tag, so the
// studio saw a blank thumbnail in the Idea Mode panel and then "Analyze images" failing —
// because the Vision call fetches the same URL and gets the same 403. Two symptoms, one dead
// URL.
//
// THE BYTES ARE FINE. Only the address was wrong. Supabase serves the same object publicly
// from …/storage/v1/object/public/<bucket>/<key>, which is what buildPublicUrl() has always
// produced for a Supabase endpoint — this one code path just never called it. So this is a
// URL rewrite, not a re-upload, and nothing is fetched or stored again.
//
// SAFETY. Dry run by default: it prints what it would change and touches nothing. Every
// rewritten URL is HEAD-checked for a 200 BEFORE it is written, so a repair can only ever
// replace a broken URL with a proven-good one — never a broken one with a differently broken
// one. A row whose new URL does not resolve is left exactly as it was and reported.
//
//   npx tsx scripts/gal-repair-idea-image-urls.ts          (dry run)
//   npx tsx scripts/gal-repair-idea-image-urls.ts --apply  (write)
import 'dotenv/config';
import { pool } from '../server/db';

const APPLY = process.argv.includes('--apply');

/** …/storage/v1/s3/<bucket>/<key>  ->  …/storage/v1/object/public/<bucket>/<key> */
function publicFormFor(url: string): string | null {
  if (typeof url !== 'string' || !url.includes('/storage/v1/s3/')) return null;
  return url.replace('/storage/v1/s3/', '/storage/v1/object/public/');
}

async function resolves(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.status;
  } catch {
    return 0;
  }
}

async function main() {
  const posts = await pool.query(
    `SELECT id, slug, title, idea_data FROM blog_posts WHERE idea_data IS NOT NULL`,
  );
  console.log(`\n${posts.rows.length} post(s) carry idea_data.\n`);

  let scanned = 0;
  let repairable = 0;
  let repaired = 0;
  const stuck: string[] = [];

  for (const row of posts.rows as any[]) {
    const idea = row.idea_data;
    if (!idea || typeof idea !== 'object' || !Array.isArray(idea.images)) continue;

    let changedAny = false;
    for (const img of idea.images) {
      if (!img || typeof img.url !== 'string') continue;
      scanned++;
      const next = publicFormFor(img.url);
      if (!next) continue;
      repairable++;

      // Prove the replacement before trusting it. A repair that swaps one dead URL for
      // another is worse than none, because it looks like the problem was addressed.
      const status = await resolves(next);
      if (status !== 200) {
        stuck.push(`${row.slug}: new URL answered ${status || 'no response'} — left unchanged`);
        continue;
      }

      console.log(`  ${row.slug}`);
      console.log(`    was: ${img.url}`);
      console.log(`    now: ${next}  (HTTP 200)`);
      img.url = next;
      changedAny = true;
      repaired++;
    }

    if (changedAny && APPLY) {
      await pool.query('UPDATE blog_posts SET idea_data = $2::jsonb WHERE id = $1', [row.id, JSON.stringify(idea)]);
    }
  }

  console.log(`\n  ${scanned} image(s) scanned, ${repairable} on an S3 API URL, ${repaired} verified good.`);
  if (stuck.length) {
    console.log(`\n  ${stuck.length} left alone:`);
    for (const s of stuck) console.log('    ' + s);
  }
  console.log(APPLY
    ? '\n  WRITTEN.\n'
    : '\n  Dry run — nothing was changed. Re-run with --apply to write.\n');
  process.exit(0);
}

main().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
