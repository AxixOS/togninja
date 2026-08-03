import { db, pool } from './server/db.js';
import { blogPosts } from './shared/schema.js';
import { AUTHORITY_CALENDAR } from './scripts/blogAuthorityCalendar.js';
import { eq, inArray } from 'drizzle-orm';

const shouldWrite = process.argv.includes('--write');

type Drift = {
  slug: string;
  status: string;
  dbDate: string;
  calendarDate: string;
};

function isoDate(value: unknown): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

async function main() {
  const calendarBySlug = new Map(AUTHORITY_CALENDAR.map((entry) => [entry.slug, entry]));
  const slugs = AUTHORITY_CALENDAR.map((entry) => entry.slug);

  const rows = await db
    .select({
      id: blogPosts.id,
      slug: blogPosts.slug,
      status: blogPosts.status,
      scheduledFor: blogPosts.scheduledFor,
      ideaData: blogPosts.ideaData,
    })
    .from(blogPosts)
    .where(inArray(blogPosts.slug, slugs));

  const ideaRows = rows.filter((row) => String(row.status ?? '') === 'IDEA');
  const drift: Drift[] = [];

  for (const row of ideaRows) {
    const calendar = calendarBySlug.get(row.slug);
    if (!calendar) continue;
    const dbDate = isoDate(row.scheduledFor);
    if (dbDate !== calendar.publishAt) {
      drift.push({ slug: row.slug, status: String(row.status ?? ''), dbDate, calendarDate: calendar.publishAt });
    }
  }

  console.log(`${shouldWrite ? 'APPLY' : 'DRY RUN'} authority IDEA date sync`);
  console.log(`Authority rows found: ${rows.length}`);
  console.log(`IDEA rows checked: ${ideaRows.length}`);
  console.log(`Rows needing date sync: ${drift.length}`);

  if (drift.length) {
    console.log('Date drift (first 20):');
    for (const row of drift.slice(0, 20)) {
      console.log(`  ${row.slug}: ${row.dbDate || 'unset'} -> ${row.calendarDate}`);
    }
  }

  if (!shouldWrite) {
    await pool.end();
    return;
  }

  let updated = 0;
  for (const row of ideaRows) {
    const calendar = calendarBySlug.get(row.slug);
    if (!calendar) continue;

    const nextIdeaData = {
      ...(row.ideaData && typeof row.ideaData === 'object' ? row.ideaData as Record<string, unknown> : {}),
      context: {
        ...(
          row.ideaData &&
          typeof row.ideaData === 'object' &&
          (row.ideaData as Record<string, unknown>).context &&
          typeof (row.ideaData as Record<string, unknown>).context === 'object'
            ? (row.ideaData as Record<string, unknown>).context as Record<string, unknown>
            : {}
        ),
        plannedPublishAt: calendar.publishAt,
      },
    };

    await db
      .update(blogPosts)
      .set({
        scheduledFor: new Date(`${calendar.publishAt}T09:00:00.000Z`),
        ideaData: nextIdeaData,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, row.id));
    updated++;
  }

  console.log(`✅ Synced planned dates for ${updated} IDEA posts.`);
  await pool.end();
}

main().catch(async (error) => {
  console.error('❌ Authority IDEA date sync failed:', error);
  await pool.end();
  process.exit(1);
});