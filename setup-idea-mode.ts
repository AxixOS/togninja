// Phase 1 of the idea-driven blog pipeline.
//  1. Adds the idea_data jsonb column (idempotent).
//  2. Archives the 36 pre-written AI articles: renames slug -> "<slug>--ai-v1",
//     status ARCHIVED, unpublished/unscheduled. Their bodies are preserved (also
//     in git) and the canonical slugs are freed.
//  3. Seeds 36 fresh IDEA entries on the canonical slugs: title + keyword tags +
//     planned schedule date, blank body, status IDEA — ready for the photo-first
//     workflow.
//
// Usage: npx tsx -r dotenv/config setup-idea-mode.ts
import { readFileSync, existsSync } from 'fs';
import { sql, eq, inArray } from 'drizzle-orm';
import { db, pool } from './server/db.js';
import { blogPosts } from './shared/schema.js';

// slug -> planned publish date (the 12-month calendar)
const CALENDAR: Record<string, string> = {
  'hochzeitsfotograf-wien-ablauf-kosten': '2026-06-08',
  'familienfotos-im-sommer-wien-studio': '2026-06-15',
  'fotoshooting-gutschein-wien-verschenken': '2026-06-22',
  'was-kostet-hochzeitsfotograf-wien': '2026-07-07',
  'babyfotos-wien-bester-zeitpunkt-ablauf': '2026-07-15',
  'bewerbungsfoto-wien-was-macht-gutes-foto': '2026-07-23',
  'linkedin-foto-wien-professionell': '2026-08-06',
  'geschwisterfotos-wien-studio-tipps': '2026-08-14',
  'studio-fotoshooting-wien-ablauf': '2026-08-22',
  'bewerbungsfotos-wien-jobstart-vorbereitung': '2026-09-04',
  'teamfotos-wien-unternehmen': '2026-09-14',
  'herbst-familienfotos-wien-outfits': '2026-09-24',
  'wandbild-oder-digitale-galerie-wien': '2026-10-06',
  'headshots-selbststaendige-wien': '2026-10-15',
  'mehrgenerationen-fotoshooting-wien': '2026-10-26',
  'weihnachtskarten-familienfotos-wien': '2026-11-05',
  'corporate-fotografie-wien-jahresende': '2026-11-13',
  'weihnachtsgutschein-fotoshooting-wien': '2026-11-24',
  'babys-erstes-jahr-fotos-wien': '2026-12-03',
  'standesamt-hochzeit-wien-fotograf': '2026-12-10',
  'last-minute-gutschein-fotoshooting-wien': '2026-12-16',
  'neugeborenenfotos-winter-wien': '2027-01-08',
  'bewerbungsfotos-neues-jahr-wien': '2027-01-15',
  'schwangerschaftsfotos-idealer-zeitpunkt-wien': '2027-01-23',
  'paarfotos-wien-valentinstag': '2027-02-04',
  'bewerbungsfoto-knigge-wien': '2027-02-13',
  'kinderfotografie-wien-natuerlich': '2027-02-23',
  'fruehling-familienfotos-wien': '2027-03-06',
  'hochzeitsfotograf-wien-2027-buchen': '2027-03-15',
  'teamfotos-wien-authentisch': '2027-03-24',
  'erstkommunion-fotos-wien': '2027-04-07',
  'maternity-shooting-outfits-wien': '2027-04-15',
  'produktfotografie-wien-kleine-marken': '2027-04-23',
  'muttertag-fotoshooting-wien': '2027-05-04',
  'hochzeitsreportage-wien-ablauf': '2027-05-14',
  'familienfotos-wien-haeufige-fragen': '2027-05-22',
};

function meta(slug: string): { title: string; tags: string[] } {
  const p = `content/articles/${slug}.json`;
  if (existsSync(p)) {
    try {
      const m = JSON.parse(readFileSync(p, 'utf8'));
      return { title: m.title || slug, tags: m.tags || [] };
    } catch { /* fall through */ }
  }
  return { title: slug, tags: [] };
}

async function main() {
  const slugs = Object.keys(CALENDAR);

  // 1. Add column (idempotent).
  await db.execute(sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS idea_data jsonb`);
  console.log('✅ idea_data column ensured.');

  // 2. Archive existing AI rows for these slugs.
  let archived = 0;
  const existing = await db.select({ id: blogPosts.id, slug: blogPosts.slug })
    .from(blogPosts).where(inArray(blogPosts.slug, slugs));
  for (const row of existing) {
    await db.update(blogPosts).set({
      slug: `${row.slug}--ai-v1`,
      status: 'ARCHIVED',
      published: false,
      scheduledFor: null,
      updatedAt: new Date(),
    }).where(eq(blogPosts.id, row.id));
    archived++;
  }
  console.log(`✅ Archived ${archived} AI articles (slug suffixed --ai-v1, status ARCHIVED).`);

  // 3. Seed fresh IDEA entries on the canonical slugs.
  let seeded = 0;
  for (const slug of slugs) {
    const { title, tags } = meta(slug);
    await db.insert(blogPosts).values({
      title,
      slug,
      content: '',
      contentHtml: '',
      excerpt: null,
      tags,
      status: 'IDEA',
      published: false,
      scheduledFor: new Date(CALENDAR[slug]),
      ideaData: { images: [], context: {}, consent: { given: false } },
      updatedAt: new Date(),
    });
    seeded++;
  }
  console.log(`✅ Seeded ${seeded} fresh IDEA entries on canonical slugs.`);

  await pool.end();
  process.exit(0);
}

main().catch((e) => { console.error('❌ setup failed:', e); process.exit(1); });
