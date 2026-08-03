import { existsSync, readFileSync } from 'fs';
import { db, pool } from './server/db.js';
import { blogPosts } from './shared/schema.js';
import { AUTHORITY_CALENDAR } from './scripts/blogAuthorityCalendar.js';
import { inArray } from 'drizzle-orm';

type LocalSourceState = {
  hasJson: boolean;
  hasHtml: boolean;
  localStatus: string;
  localPublishAt: string;
};

function readLocalSourceState(slug: string): LocalSourceState {
  const jsonPath = `content/articles/${slug}.json`;
  const htmlPath = `content/articles/${slug}.html`;
  const hasJson = existsSync(jsonPath);
  const hasHtml = existsSync(htmlPath);
  let localStatus = '';
  let localPublishAt = '';

  if (hasJson) {
    const meta = JSON.parse(readFileSync(jsonPath, 'utf8'));
    localStatus = String(meta.status ?? '');
    localPublishAt = String(meta.publishAt ?? '');
  }

  return { hasJson, hasHtml, localStatus, localPublishAt };
}

function isoDate(value: unknown): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

async function main() {
  const slugs = AUTHORITY_CALENDAR.map((entry) => entry.slug);
  const rows = await db
    .select({
      slug: blogPosts.slug,
      status: blogPosts.status,
      published: blogPosts.published,
      publishedAt: blogPosts.publishedAt,
      scheduledFor: blogPosts.scheduledFor,
      updatedAt: blogPosts.updatedAt,
    })
    .from(blogPosts)
    .where(inArray(blogPosts.slug, slugs));

  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const statusCounts = new Map<string, number>();
  const noDb: string[] = [];
  const noJson: string[] = [];
  const noHtml: string[] = [];
  const localVsDbMismatches: string[] = [];

  for (const entry of AUTHORITY_CALENDAR) {
    const dbRow = bySlug.get(entry.slug);
    const local = readLocalSourceState(entry.slug);

    if (!dbRow) {
      noDb.push(entry.slug);
    } else {
      const key = String(dbRow.status ?? 'UNKNOWN');
      statusCounts.set(key, (statusCounts.get(key) ?? 0) + 1);

      const dbDate = isoDate(dbRow.scheduledFor) || isoDate(dbRow.publishedAt);
      if (local.localPublishAt && dbDate && local.localPublishAt !== dbDate) {
        localVsDbMismatches.push(`${entry.slug}: local ${local.localPublishAt} vs db ${dbDate} (${dbRow.status})`);
      }
    }

    if (!local.hasJson) noJson.push(entry.slug);
    if (!local.hasHtml) noHtml.push(entry.slug);
  }

  console.log('Authority calendar reconciliation');
  console.log(`Calendar slots: ${AUTHORITY_CALENDAR.length}`);
  console.log(`DB rows present: ${rows.length}`);
  console.log(`Local JSON sidecars: ${AUTHORITY_CALENDAR.length - noJson.length}`);
  console.log(`Local HTML sources: ${AUTHORITY_CALENDAR.length - noHtml.length}`);
  console.log('DB status mix:');
  for (const [status, count] of Array.from(statusCounts.entries()).sort()) {
    console.log(`  ${status}: ${count}`);
  }

  if (localVsDbMismatches.length) {
    console.log('Local vs DB date mismatches (first 20):');
    for (const line of localVsDbMismatches.slice(0, 20)) {
      console.log(`  ${line}`);
    }
  }

  if (noDb.length) {
    console.log('Missing from DB (first 20):');
    for (const slug of noDb.slice(0, 20)) {
      console.log(`  ${slug}`);
    }
  }

  if (noJson.length) {
    console.log('Missing local JSON (first 20):');
    for (const slug of noJson.slice(0, 20)) {
      console.log(`  ${slug}`);
    }
  }

  if (noHtml.length) {
    console.log('Missing local HTML (first 20):');
    for (const slug of noHtml.slice(0, 20)) {
      console.log(`  ${slug}`);
    }
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error('❌ Authority audit failed:', error);
  await pool.end();
  process.exit(1);
});