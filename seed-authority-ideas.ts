import { db, pool } from './server/db.js';
import { blogPosts } from './shared/schema.js';
import { AUTHORITY_CALENDAR, type AuthorityCalendarEntry } from './scripts/blogAuthorityCalendar.js';
import { inArray } from 'drizzle-orm';

const shouldWrite = process.argv.includes('--write');

function buildTags(entry: AuthorityCalendarEntry): string[] {
  const tags = new Set<string>(['wien', entry.pillar, entry.intent]);
  for (const piece of entry.cluster.toLowerCase().split(/[^a-z0-9]+/i)) {
    if (piece.length >= 4) tags.add(piece);
  }
  for (const piece of entry.slug.split('-')) {
    if (piece.length >= 5) tags.add(piece);
  }
  return Array.from(tags).slice(0, 6);
}

async function main() {
  const slugs = AUTHORITY_CALENDAR.map((entry) => entry.slug);
  const existing = await db
    .select({ slug: blogPosts.slug })
    .from(blogPosts)
    .where(inArray(blogPosts.slug, slugs));

  const existingSlugs = new Set(existing.map((row) => row.slug));
  const missingEntries = AUTHORITY_CALENDAR.filter((entry) => !existingSlugs.has(entry.slug));

  console.log(`${shouldWrite ? 'APPLY' : 'DRY RUN'} authority IDEA seed`);
  console.log(`Authority slots: ${AUTHORITY_CALENDAR.length}`);
  console.log(`Already present in DB: ${existingSlugs.size}`);
  console.log(`Missing in DB: ${missingEntries.length}`);

  if (missingEntries.length) {
    console.log('Missing authority slugs (first 20):');
    for (const entry of missingEntries.slice(0, 20)) {
      console.log(`  ${entry.publishAt}  ${entry.slug}  [${entry.pillar}/${entry.intent}]`);
    }
  }

  if (!shouldWrite || missingEntries.length === 0) {
    await pool.end();
    return;
  }

  let seeded = 0;
  for (const entry of missingEntries) {
    await db.insert(blogPosts).values({
      title: entry.title,
      slug: entry.slug,
      content: '',
      contentHtml: '',
      tags: buildTags(entry),
      status: 'IDEA',
      published: false,
      ideaData: {
        images: [],
        context: {
          cluster: entry.cluster,
          intent: entry.intent,
          angle: entry.angle,
          plannedPublishAt: entry.publishAt,
        },
        consent: { given: false },
      },
      updatedAt: new Date(),
    });
    seeded++;
  }

  console.log(`✅ Seeded ${seeded} authority IDEA posts.`);
  await pool.end();
}

main().catch(async (error) => {
  console.error('❌ Authority IDEA seed failed:', error);
  await pool.end();
  process.exit(1);
});