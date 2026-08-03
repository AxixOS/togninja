import { existsSync, readFileSync, writeFileSync } from 'fs';
import { AUTHORITY_CALENDAR, AUTHORITY_CALENDAR_COUNTS } from './scripts/blogAuthorityCalendar.js';

const shouldWrite = process.argv.includes('--write');

type MissingEntry = {
  slug: string;
  publishAt: string;
  pillar: string;
};

type ExistingEntry = {
  slug: string;
  publishAt: string;
  previousStatus: string;
  previousPublishAt: string;
};

const missing: MissingEntry[] = [];
const existing: ExistingEntry[] = [];

for (const entry of AUTHORITY_CALENDAR) {
  const path = `content/articles/${entry.slug}.json`;
  if (!existsSync(path)) {
    missing.push({ slug: entry.slug, publishAt: entry.publishAt, pillar: entry.pillar });
    continue;
  }

  const meta = JSON.parse(readFileSync(path, 'utf8'));
  existing.push({
    slug: entry.slug,
    publishAt: entry.publishAt,
    previousStatus: String(meta.status ?? ''),
    previousPublishAt: String(meta.publishAt ?? ''),
  });

  if (!shouldWrite) continue;

  meta.status = 'SCHEDULED';
  meta.publishAt = entry.publishAt;
  writeFileSync(path, JSON.stringify(meta, null, 2) + '\n', 'utf8');
}

console.log(`${shouldWrite ? 'APPLY' : 'DRY RUN'} authority calendar`);
console.log(`Calendar span: ${AUTHORITY_CALENDAR[0].publishAt} -> ${AUTHORITY_CALENDAR[AUTHORITY_CALENDAR.length - 1].publishAt}`);
console.log(`Total slots: ${AUTHORITY_CALENDAR.length}`);
console.log(`Pillar mix: family=${AUTHORITY_CALENDAR_COUNTS.family}, business=${AUTHORITY_CALENDAR_COUNTS.business}, wedding=${AUTHORITY_CALENDAR_COUNTS.wedding}, studio=${AUTHORITY_CALENDAR_COUNTS.studio}`);
console.log(`JSON sidecars found: ${existing.length}`);
console.log(`JSON sidecars missing: ${missing.length}`);

if (existing.length) {
  console.log('Existing sidecars covered (first 12):');
  for (const item of existing.slice(0, 12)) {
    const prior = item.previousPublishAt ? `${item.previousStatus || 'unset'} @ ${item.previousPublishAt}` : (item.previousStatus || 'unset');
    console.log(`  ${item.publishAt}  ${item.slug}  (was ${prior})`);
  }
}

if (missing.length) {
  console.log('Missing sidecars to create or seed (first 20):');
  for (const item of missing.slice(0, 20)) {
    console.log(`  ${item.publishAt}  ${item.slug}  [${item.pillar}]`);
  }
}

if (!shouldWrite) {
  console.log('Use --write to stamp publishAt/status into existing JSON sidecars only.');
}