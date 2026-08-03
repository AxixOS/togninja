import { readFileSync } from 'fs';
import { db, pool } from './server/db.js';
import { blogPosts } from './shared/schema.js';
import { eq } from 'drizzle-orm';

const slug = 'familienfotos-locations-wien';
const html = readFileSync('content/articles/familienfotos-locations-wien.html', 'utf8');

async function main() {
  const before = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
  if (before.length === 0) {
    console.error(`❌ No post found with slug "${slug}". Nothing updated.`);
    process.exit(1);
  }
  console.log(`Found post: ${before[0].title}`);
  console.log(`  before content_html length: ${before[0].contentHtml?.length ?? 0}`);
  console.log(`  before content length:      ${before[0].content?.length ?? 0}`);
  console.log(`  new clean HTML length:      ${html.length}`);

  const res = await db
    .update(blogPosts)
    .set({ content: html, contentHtml: html })
    .where(eq(blogPosts.slug, slug))
    .returning({ id: blogPosts.id, slug: blogPosts.slug });

  console.log('✅ Updated:', res);
  await pool.end();
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Update failed:', e);
  process.exit(1);
});
