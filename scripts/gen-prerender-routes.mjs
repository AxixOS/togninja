// Build-time helper: query the live Neon DB for every PUBLISHED blog post
// (published_at <= now) and write their /blog/<slug> routes to
// prerender-blog-routes.json at the repo root. vite.config.ts reads that file
// synchronously and merges the routes into the prerender list — so posts that
// went live since the last code change are prerendered on the next build,
// without hand-editing vite.config.ts.
//
// Runs in heroku-postbuild before `vite build`. Tolerant by design: with no
// DATABASE_URL or on any query error it writes an empty list, and the build
// falls back to the static publicRoutes in vite.config.ts.
import { writeFileSync } from 'fs';

const OUT = 'prerender-blog-routes.json';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    writeFileSync(OUT, '[]\n');
    console.log('[prerender-routes] No DATABASE_URL — wrote empty list.');
    return;
  }
  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    const rows = await sql`
      SELECT slug FROM blog_posts
      WHERE published = true AND published_at <= NOW() AND slug IS NOT NULL
      ORDER BY slug
    `;
    const routes = rows.map((r) => `/blog/${r.slug}`);
    writeFileSync(OUT, JSON.stringify(routes, null, 2) + '\n');
    console.log(`[prerender-routes] Wrote ${routes.length} published blog routes.`);
  } catch (err) {
    writeFileSync(OUT, '[]\n');
    console.warn('[prerender-routes] Query failed — wrote empty list:', err?.message || err);
  }
}

main();
