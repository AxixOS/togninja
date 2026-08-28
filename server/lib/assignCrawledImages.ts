// Putting the studio's own photographs on the pages they belong to, without being asked.
//
// The crawl reads the studio's existing website and records every photograph on it — 40 on a
// real Squarespace site. Onboarding then offered SIX slots (a hero, two content blocks, one
// per service) and a studio filled three, because filling six by hand at the point you are
// still deciding whether you like the product is work. So they finished onboarding with a
// homepage that had pictures and service pages that were blocks of flat colour under headings
// like "Discover the Empowerment of Boudoir Photography".
//
// The photographs were already in the database. Nothing was missing except the decision about
// which went where, and that decision is one this can make well enough to be worth making:
// several of a photographer's files are named after the thing they show.
//
// TWO RULES.
//
// It only ever fills an EMPTY slot. Anything the studio chose themselves outranks anything
// chosen here, always, and re-running this can never overwrite their work.
//
// And it goes through storeSiteImage, exactly as the wizard's own picker does. That is what
// downloads the bytes into the studio's own bucket instead of hotlinking the site they are
// leaving, derives alt text from the picture rather than from the slot's name, and stamps the
// file with the studio's byline and copyright. An automatic path that skipped that would
// produce the worst images on the site — the ones nobody ever looks at again.

import { pool } from '../db';
import { storeSiteImage } from './siteImageStore';

const MAX_BYTES = 12 * 1024 * 1024;

/** Words that appear in nearly every pillar of a photography business and so separate nothing. */
const NOISE = new Set([
  'photography', 'photographer', 'photo', 'photos', 'photoshoot', 'shoot', 'shoots',
  'session', 'sessions', 'studio', 'the', 'and', 'for', 'with', 'your', 'our', 'nyc', 'img', 'dsc',
]);

/** Lower-cased word tokens, splitting camelCase and every separator a filename might use. */
function tokens(s: string): string[] {
  return String(s || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length > 2 && !NOISE.has(t) && !/^\d+$/.test(t));
}

/**
 * How well a photograph's name matches a service.
 *
 * Deliberately crude: shared distinctive words, nothing cleverer. A photographer's files are
 * named `BoudoirPhotographyNYC.jpg` or `DSC_4821.jpg`, and no amount of sophistication rescues
 * the second kind. Scoring high on the first and zero on the second is the whole job — the
 * zero-scorers are then distributed in crawl order, which is as good as anything.
 */
function score(imageLabel: string, pillarLabel: string, pillarHref: string): number {
  const want = new Set([...tokens(pillarLabel), ...tokens(pillarHref)]);
  if (!want.size) return 0;
  let hits = 0;
  for (const t of new Set(tokens(imageLabel))) if (want.has(t)) hits++;
  return hits;
}

async function download(url: string): Promise<{ buffer: Buffer; mime: string; name: string } | null> {
  try {
    const r = await fetch(url, { redirect: 'follow' });
    if (!r.ok) return null;
    const mime = String(r.headers.get('content-type') || '').split(';')[0].trim();
    // The extension is whatever the remote server felt like; the content type is what it
    // actually sent. Only the latter decides.
    if (!/^image\/(png|jpe?g|webp|avif)$/.test(mime)) return null;
    const buffer = Buffer.from(await r.arrayBuffer());
    // Checked AFTER the download, because content-length is whatever the remote claims.
    if (!buffer.length || buffer.length > MAX_BYTES) return null;
    let name = '';
    try {
      name = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || '');
    } catch { /* a name is optional — buildImageFilename has other inputs */ }
    return { buffer, mime, name: name || 'photograph.jpg' };
  } catch {
    return null;
  }
}

export interface AssignResult {
  filled: number;
  /** Slots that were already the studio's own choice and were left alone. */
  skipped: number;
}

/**
 * Fill whichever of the site's image slots are still empty from the crawl.
 *
 * `scope` exists because the two halves become possible at different moments: the homepage
 * slots the instant a draft exists, the service slots only once authority-scaffold has created
 * the pages — mirroring a hero onto a landing_pages row that does not exist yet silently does
 * nothing. The pipeline calls this twice for that reason, not because the logic differs.
 */
export async function assignCrawledSiteImages(
  scope: 'site' | 'pillars',
  opts: { heroPageId?: string | null } = {},
): Promise<AssignResult> {
  const out: AssignResult = { filled: 0, skipped: 0 };
  try {
    const { crawledImages } = await import('./crawledImages');
    const found = await crawledImages(40);
    if (!found.length) return out;

    // What is already spoken for — both the studio's own uploads and anything a previous run
    // of this put there.
    const { rows: taken } = await pool.query(
      `SELECT section, url FROM homepage_images WHERE is_active = true`,
    );
    const filledSections = new Set((taken as any[]).map((r) => r.section));
    const usedUrls = new Set((taken as any[]).map((r) => String(r.url)));

    // Never hand two pages the same photograph. A site where three services show one picture
    // reads as broken in a way three empty blocks do not.
    const claimed = new Set<string>();

    // The studio's services, needed by BOTH scopes: the pillar scope matches against them,
    // and the homepage scope needs to know which photographs to leave alone.
    const { rows: mapRows } = await pool.query(`SELECT authority_map FROM studio_configs LIMIT 1`);
    const allPillars = (((mapRows as any[])[0]?.authority_map?.pillars || []) as any[])
      .filter((p) => p?.href && p?.label);

    /**
     * How strongly a photograph belongs to some ONE service.
     *
     * The homepage has no label to match on, so it used to take the first unclaimed pictures
     * in crawl order — and on a real studio those were BodyPositiveBoudoir and
     * BoudoirPhotographyNYC, the two best matches for the Boudoir page. The homepage cannot
     * tell they were special; the Boudoir page then fell back to a photograph named Samanee.
     *
     * So the homepage now prefers pictures that belong to NO service in particular, leaving
     * the named ones for the pages that can actually use the name. Crawl order still decides
     * between equals, which on most sites is the order they lead with.
     */
    const pillarAffinity = (label: string): number =>
      allPillars.reduce((max, p) => Math.max(max, score(label, String(p.label), String(p.href))), 0);

    let wanted: Array<{ section: string; label: string; href: string }> = [];
    if (scope === 'site') {
      wanted = [
        { section: 'hero', label: '', href: '' },
        { section: 'content-1', label: '', href: '' },
        { section: 'content-2', label: '', href: '' },
      ];
    } else {
      const { slugify: landingSlugify } = await import('./landing-mapping');
      wanted = [];
      for (const p of allPillars) {
        const label = String(p.label);
        const href = String(p.href);
        // The hero, keyed the way the wizard's slots and HomePage's service cards are.
        wanted.push({
          section: 'services-' + href.replace(/^\/+|\/+$/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          label,
          href,
        });
        // And the page's own two content photographs.
        //
        // A service page on a photographer's website carried one picture and then several
        // hundred words of type. The sections that take these already existed and already
        // drew them; there was simply nothing stored for any page but the homepage, because
        // when that was written the whole system held exactly two content photographs and
        // sharing them across every service would have looked deliberate. With forty of the
        // studio's own to draw on, each page gets its own pair and none is ever reused.
        //
        // Keyed by the LANDING PAGE slug, which is what the renderer knows about itself and
        // is NOT the services- key: landing-mapping's slugify trims dashes and caps at 60.
        const pageSlug = landingSlugify(href.replace(/^\/+|\/+$/g, '') || label);
        wanted.push({ section: `page-${pageSlug}-1`, label, href });
        wanted.push({ section: `page-${pageSlug}-2`, label, href });
      }
    }

    const empty = wanted.filter((w) => {
      if (filledSections.has(w.section)) { out.skipped++; return false; }
      return true;
    });
    if (!empty.length) return out;

    // Best match first, across ALL slots, rather than each slot taking its own favourite in
    // turn: a photograph that is a strong match for one service and a weak one for another
    // should go to the service it actually shows, whichever is considered first.
    const pairs: Array<{ slot: typeof empty[number]; img: any; s: number }> = [];
    for (const slot of empty) {
      for (const img of found) {
        if (usedUrls.has(String(img.url))) continue;
        pairs.push({ slot, img, s: slot.label ? score(img.label || '', slot.label, slot.href) : 0 });
      }
    }
    pairs.sort((a, b) => b.s - a.s);

    const assignment = new Map<string, any>();
    for (const { slot, img, s } of pairs) {
      if (s <= 0) continue;                       // matched-by-name only, in this pass
      if (assignment.has(slot.section)) continue;
      if (claimed.has(String(img.url))) continue;
      assignment.set(slot.section, img);
      claimed.add(String(img.url));
    }
    // Everything still unassigned takes the next unclaimed photograph, in crawl order —
    // roughly the order they appear on the studio's own site, so the earliest are usually the
    // ones they lead with.
    //
    // On the homepage that order is adjusted to take the LEAST service-specific picture first,
    // so a photograph whose name says "boudoir" is still there when the Boudoir page asks.
    const fallbackOrder = scope === 'site'
      ? [...found].sort((a: any, b: any) =>
          pillarAffinity(String(a.label || '')) - pillarAffinity(String(b.label || '')))
      : found;

    for (const slot of empty) {
      if (assignment.has(slot.section)) continue;
      const img = fallbackOrder.find((i: any) => !claimed.has(String(i.url)) && !usedUrls.has(String(i.url)));
      if (!img) break;
      assignment.set(slot.section, img);
      claimed.add(String(img.url));
    }

    for (const slot of empty) {
      const img = assignment.get(slot.section);
      if (!img) continue;
      const dl = await download(String(img.url));
      if (!dl) {
        console.warn(`[auto-images] could not fetch ${String(img.url).slice(0, 80)} for ${slot.section}`);
        continue;
      }
      try {
        await storeSiteImage({
          section: slot.section,
          buffer: dl.buffer,
          mime: dl.mime,
          originalName: dl.name,
          // A slot label describes the slot, not the picture. Passed only as the floor —
          // storeSiteImage replaces it with a real description when vision is available.
          alt: img.label || slot.label || null,
          // Only the hero uses it, and only the pipeline knows it this early.
          heroPageId: opts.heroPageId ?? null,
        });
        out.filled++;
      } catch (e: any) {
        // One slot failing must not cost the others. Storage being unconfigured fails every
        // one of them, which is correct and is already reported by the wizard's own check.
        console.warn(`[auto-images] ${slot.section} failed:`, e?.message || e);
      }
    }
  } catch (e: any) {
    console.warn('[auto-images] assignment skipped:', e?.message || e);
  }
  return out;
}
