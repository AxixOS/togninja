// Injects the 12-month publishing calendar into each article's JSON sidecar:
// sets status = "SCHEDULED" and publishAt = <date>. publish-article.ts then
// upserts each post with scheduledFor = publishAt (status SCHEDULED), so posts
// go live automatically on their date — leaving a window to add photos first.
//
// Usage:  npx tsx schedule-all.ts            (updates JSON files)
//   then: loop publish-article.ts per slug   (applies to the Neon DB)
import { readFileSync, writeFileSync, existsSync } from 'fs';

// slug -> ISO publish date (12-month plan, ~3/month, seasonally placed)
const CALENDAR: Record<string, string> = {
  // June 2026
  'hochzeitsfotograf-wien-ablauf-kosten': '2026-06-08',
  'familienfotos-im-sommer-wien-studio': '2026-06-15',
  'fotoshooting-gutschein-wien-verschenken': '2026-06-22',
  // July 2026
  'was-kostet-hochzeitsfotograf-wien': '2026-07-07',
  'babyfotos-wien-bester-zeitpunkt-ablauf': '2026-07-15',
  'bewerbungsfoto-wien-was-macht-gutes-foto': '2026-07-23',
  // August 2026
  'linkedin-foto-wien-professionell': '2026-08-06',
  'geschwisterfotos-wien-studio-tipps': '2026-08-14',
  'studio-fotoshooting-wien-ablauf': '2026-08-22',
  // September 2026
  'bewerbungsfotos-wien-jobstart-vorbereitung': '2026-09-04',
  'teamfotos-wien-unternehmen': '2026-09-14',
  'herbst-familienfotos-wien-outfits': '2026-09-24',
  // October 2026
  'wandbild-oder-digitale-galerie-wien': '2026-10-06',
  'headshots-selbststaendige-wien': '2026-10-15',
  'mehrgenerationen-fotoshooting-wien': '2026-10-26',
  // November 2026
  'weihnachtskarten-familienfotos-wien': '2026-11-05',
  'corporate-fotografie-wien-jahresende': '2026-11-13',
  'weihnachtsgutschein-fotoshooting-wien': '2026-11-24',
  // December 2026
  'babys-erstes-jahr-fotos-wien': '2026-12-03',
  'standesamt-hochzeit-wien-fotograf': '2026-12-10',
  'last-minute-gutschein-fotoshooting-wien': '2026-12-16',
  // January 2027
  'neugeborenenfotos-winter-wien': '2027-01-08',
  'bewerbungsfotos-neues-jahr-wien': '2027-01-15',
  'schwangerschaftsfotos-idealer-zeitpunkt-wien': '2027-01-23',
  // February 2027
  'paarfotos-wien-valentinstag': '2027-02-04',
  'bewerbungsfoto-knigge-wien': '2027-02-13',
  'kinderfotografie-wien-natuerlich': '2027-02-23',
  // March 2027
  'fruehling-familienfotos-wien': '2027-03-06',
  'hochzeitsfotograf-wien-2027-buchen': '2027-03-15',
  'teamfotos-wien-authentisch': '2027-03-24',
  // April 2027
  'erstkommunion-fotos-wien': '2027-04-07',
  'maternity-shooting-outfits-wien': '2027-04-15',
  'produktfotografie-wien-kleine-marken': '2027-04-23',
  // May 2027
  'muttertag-fotoshooting-wien': '2027-05-04',
  'hochzeitsreportage-wien-ablauf': '2027-05-14',
  'familienfotos-wien-haeufige-fragen': '2027-05-22',
};

let updated = 0;
const missing: string[] = [];
for (const [slug, date] of Object.entries(CALENDAR)) {
  const path = `content/articles/${slug}.json`;
  if (!existsSync(path)) { missing.push(slug); continue; }
  const meta = JSON.parse(readFileSync(path, 'utf8'));
  meta.status = 'SCHEDULED';
  meta.publishAt = date;
  writeFileSync(path, JSON.stringify(meta, null, 2) + '\n', 'utf8');
  updated++;
}

console.log(`✅ Scheduled ${updated}/${Object.keys(CALENDAR).length} article JSONs.`);
if (missing.length) console.log(`⚠️  Missing JSON files (skipped): ${missing.join(', ')}`);
