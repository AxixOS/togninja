// Create the missing service-page hero / OG / logo images from real, tagged
// studio photos so the broken /images/* references resolve to actual images.
// Files are normalised to proper JPEG (sharp), re-tagged with IPTC/geo, and
// written into client/public (served at the site root by Vite).
//   npx tsx -r dotenv/config make-heroes.ts
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { db, pool } from './server/db.js';
import { blogPosts } from './shared/schema.js';
import { inArray } from 'drizzle-orm';
import {
  writeIptc, STUDIO_GPS, STUDIO_CITY, STUDIO_SUBLOCATION, endExifTool,
} from './server/services/blogImageAnalysis.js';
import { fetchImageBuffer } from './server/services/b2Upload.js';

const PG = 'client/src/assets/photo-grid.jpg'; // local studio collage (already tagged)
const OUT_IMAGES = 'client/public/images';
const OUT_ROOT = 'client/public';

// source: blog slug (B2 cover) OR { local }
type Spec = { out: string; dir: string; source: string | { local: string }; caption: string; keywords: string[]; onLocation: boolean };

const SLUG = {
  family: 'familienfotos-im-studio-vs-outdoor-in-wien-was-passt-zu-euch',
  newborn: 'tipps-fuer-neugeborenenfotos-wien',
  business: 'businessportraits-in-wien-preise-kleidung-erfolgstipps-f-r-starke-auftritte',
  maternity: 'schwangerschaftsfotos-in-wien-ideen-kleidung-der-beste-zeitpunkt',
};

const SPECS: Spec[] = [
  { out: 'family-hero.jpg', dir: OUT_IMAGES, source: SLUG.family, caption: 'Familienfotos im Tageslichtstudio in Wien – New Age Fotografie', keywords: ['familienfotos', 'studio', 'wien', 'familie'], onLocation: false },
  { out: 'baby-hero.jpg', dir: OUT_IMAGES, source: SLUG.newborn, caption: 'Babyfotos im Studio in Wien', keywords: ['babyfotos', 'baby', 'studio', 'wien'], onLocation: false },
  { out: 'newborn-hero.jpg', dir: OUT_IMAGES, source: SLUG.newborn, caption: 'Neugeborenenfotos im Studio in Wien', keywords: ['neugeborenenfotos', 'baby', 'studio', 'wien'], onLocation: false },
  { out: 'business-hero.jpg', dir: OUT_IMAGES, source: SLUG.business, caption: 'Business-Portraits in Wien', keywords: ['businessfotos', 'portrait', 'wien'], onLocation: false },
  { out: 'bewerbung-hero.jpg', dir: OUT_IMAGES, source: SLUG.business, caption: 'Bewerbungsfotos in Wien', keywords: ['bewerbungsfotos', 'businessfotos', 'wien'], onLocation: false },
  { out: 'team-hero.jpg', dir: OUT_IMAGES, source: SLUG.business, caption: 'Teamfotos für Unternehmen in Wien', keywords: ['teamfotos', 'businessfotos', 'wien'], onLocation: false },
  { out: 'maternity-hero.jpg', dir: OUT_IMAGES, source: SLUG.maternity, caption: 'Schwangerschaftsfotos im Studio in Wien', keywords: ['schwangerschaftsfotos', 'babybauch', 'studio', 'wien'], onLocation: false },
  { out: 'wedding-hero.jpg', dir: OUT_IMAGES, source: { local: PG }, caption: 'Hochzeitsfotografie in Wien – New Age Fotografie', keywords: ['hochzeitsfotos', 'hochzeit', 'wien'], onLocation: true },
  { out: 'event-hero.jpg', dir: OUT_IMAGES, source: { local: PG }, caption: 'Eventfotografie in Wien', keywords: ['eventfotografie', 'event', 'wien'], onLocation: true },
  { out: 'product-hero.jpg', dir: OUT_IMAGES, source: { local: PG }, caption: 'Produktfotografie im Studio in Wien', keywords: ['produktfotografie', 'studio', 'wien'], onLocation: false },
  { out: 'og-default.jpg', dir: OUT_ROOT, source: { local: PG }, caption: 'New Age Fotografie – Fotostudio in Wien-Margareten', keywords: ['fotostudio', 'wien', 'new age fotografie'], onLocation: false },
];

async function main() {
  await mkdir(OUT_IMAGES, { recursive: true });

  // resolve B2 cover URLs
  const rows = await db.select({ slug: blogPosts.slug, imageUrl: blogPosts.imageUrl })
    .from(blogPosts).where(inArray(blogPosts.slug, Object.values(SLUG)));
  const urlBySlug = new Map(rows.map(r => [r.slug, r.imageUrl]));

  for (const s of SPECS) {
    try {
      let src: Buffer;
      if (typeof s.source === 'object') {
        src = await readFile(s.source.local);
      } else {
        const url = urlBySlug.get(s.source);
        if (!url) throw new Error(`no imageUrl for ${s.source}`);
        src = await fetchImageBuffer(url);
      }
      // Normalise to a proper, OG-friendly JPEG.
      const jpeg = await sharp(src).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
      const tagged = await writeIptc(jpeg, {
        caption: s.caption,
        keywords: Array.from(new Set([...s.keywords, 'new age fotografie'])).slice(0, 12),
        location: STUDIO_CITY,
        sublocation: s.onLocation ? undefined : STUDIO_SUBLOCATION,
        country: 'Österreich',
        gps: s.onLocation ? null : STUDIO_GPS,
        aiGenerated: false,
      });
      await writeFile(`${s.dir}/${s.out}`, tagged);
      console.log(`✅ ${s.dir}/${s.out}  (${(tagged.length / 1024).toFixed(0)} KB)`);
    } catch (e: any) {
      console.log(`❌ ${s.out}: ${e?.message || e}`);
    }
  }

  // logo.png from the existing front-end logo (no IPTC needed)
  try {
    const logo = await sharp(await readFile(`${OUT_ROOT}/frontend-logo.jpg`)).png().toBuffer();
    await writeFile(`${OUT_ROOT}/logo.png`, logo);
    console.log(`✅ ${OUT_ROOT}/logo.png`);
  } catch (e: any) { console.log(`❌ logo.png: ${e?.message || e}`); }

  await endExifTool();
  await pool.end();
  process.exit(0);
}
main().catch(async (e) => { console.error(e); try { await endExifTool(); } catch {} process.exit(1); });
