// Land onboarding's generated copy in the pages the studio actually edits.
//
// The homepage pipeline crawls the studio's existing site, distils it and writes
// optimised copy — then persisted it ONLY as a landing page. Nothing reached
// `manual_page_content`, which is what Website Studio edits and what the built-in
// pages render, so a studio finished onboarding and found every field still on the
// neutral defaults. This maps the generated content onto those keys instead.
import { pool } from '../db';

/** The studio this deployment belongs to (one DB = one studio). */
async function resolveStudioId(): Promise<string> {
  try {
    const { rows } = await pool.query(`SELECT id FROM studio_configs LIMIT 1`);
    if (rows[0]?.id) return rows[0].id;
  } catch { /* fall through */ }
  return process.env.STUDIO_ID || '550e8400-e29b-41d4-a716-446655440000';
}

const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/**
 * Generated content -> { manualPageKey: value } for the built-in Homepage.
 *
 * Only fields with a genuine 1:1 counterpart are mapped. Anything speculative is
 * left alone so the studio sees its own copy rather than something invented to
 * fill a box.
 */
export function mapGeneratedToHomeKeys(content: any): Record<string, string> {
  const out: Record<string, string> = {};
  const hero = content?.hero || {};
  const seo = content?.seo || {};
  const offer = content?.offerSection || {};
  const problem = content?.problemSection || {};

  const put = (key: string, value: unknown) => {
    const v = clean(value);
    if (v) out[key] = v;
  };

  put('home.heroTitle', hero.headline);
  put('home.heroSubtitle', hero.subheadline);
  put('home.heroDescription', hero.subheadline || problem.description);
  put('home.bookShootingButton', hero.ctaText);
  put('home.description', seo.metaDescription || offer.description);

  // The two MOST prominent things in the hero — the H1 and the four rotating lines above
  // it — were never mapped, so they kept their defaults: "Professional Photography –
  // Studio & Outdoor" and family-portrait lines like "even camera-shy little ones shine".
  // On a boudoir studio that is the first thing a visitor reads and it describes someone
  // else's business. The trust bar is four short claims, which is exactly what the
  // rotator needs; the offer headline is the strongest single statement for the H1.
  put('home.heroHeading', offer.headline || hero.headline);

  // The services block's own heading and subheading. The subheading read "From family
  // shoots to business portraits" on every studio — a promise about someone else's
  // services sitting directly above the studio's real ones.
  put('home.servicesSubtitle', offer.description || problem.description);
  const trust: string[] = Array.isArray(content?.trustBar?.items) ? content.trustBar.items : [];
  const benefits: any[] = Array.isArray(content?.benefits) ? content.benefits : [];
  const rotatorPool = [...trust, ...benefits.map((b: any) => b?.title)]
    .map((v) => clean(v))
    .filter(Boolean);
  // Cycle the pool rather than leave a slot unset. A slot left unset keeps its default,
  // and the defaults are family-portrait lines — "even camera-shy little ones shine" —
  // which on a boudoir studio reads as that studio's own promise about its own work.
  // Repeating one of the studio's real claims is always better than stating someone
  // else's. With an empty pool nothing is written and the defaults stand, as before.
  if (rotatorPool.length) {
    for (let i = 0; i < 4; i++) put(`home.heroRotator${i + 1}`, rotatorPool[i % rotatorPool.length]);
  }

  // Service Highlights. The key names are historical ("pregnancyAndFamily") but the
  // block is simply "core offerings below the hero" — left unmapped it showed
  // "Pregnancy Shoot & Family Portraits" to a boudoir studio.
  const why = content?.whyChooseUs || {};
  const reasons: any[] = Array.isArray(why?.reasons) ? why.reasons : [];
  put('home.pregnancyAndFamilyTitle', why.headline || offer.headline);
  put('home.pregnancyDescription1', reasons[0]?.description);
  put('home.pregnancyDescription2', reasons[1]?.description);
  put('home.pregnancyDescription3', reasons[2]?.description);

  // FAQ maps cleanly: the manifest exposes six question/answer pairs, and the
  // generator is now asked for six. Slots it cannot fill keep a generic default,
  // which is why the count matters — three left slots 4-6 describing family shoots.
  const faq = Array.isArray(content?.faq) ? content.faq : [];
  faq.slice(0, 6).forEach((entry: any, i: number) => {
    put(`home.faqQuestion${i + 1}`, entry?.question);
    put(`home.faq${i + 1}Text`, entry?.answer);
  });

  // The "Common Worries" grid is a SECOND six-card FAQ block on the same page. Fed
  // from the same source so it cannot drift back to another studio's services.
  faq.slice(0, 6).forEach((entry: any, i: number) => {
    put(`faq.worry${i + 1}.q`, entry?.question);
    put(`faq.worry${i + 1}.full`, entry?.answer);
  });

  // DELIBERATELY NOT MAPPED — `testimonials`. The generator is instructed to
  // "generate believable but compelling testimonials if none are provided", i.e.
  // they may be invented. Publishing invented reviews as a studio's own social
  // proof is the exact problem we removed from the image; a studio adds its real
  // ones in Website Studio -> Customer Reviews, or they come from its Google
  // profile. Also not mapped: the milestone counters, which are factual claims.

  return out;
}

/**
 * The other four public pages. Same principle: map only where the generated content
 * has a real counterpart. Form field labels and placeholders ("Email", "Your
 * message") are deliberately NOT mapped — they are interface text, not marketing
 * copy, and an AI rewrite of them makes a form worse, not better. Studio contact
 * details are likewise left alone; those are facts, not copy.
 */
export function mapGeneratedToOtherPages(content: any): Record<string, Record<string, string>> {
  const hero = content?.hero || {};
  const offer = content?.offerSection || {};
  const problem = content?.problemSection || {};
  const why = content?.whyChooseUs || {};
  const finalCta = content?.finalCta || {};
  const reasons: any[] = Array.isArray(why?.reasons) ? why.reasons : [];

  const page = (pairs: Array<[string, unknown]>): Record<string, string> => {
    const o: Record<string, string> = {};
    for (const [k, v] of pairs) {
      const s = clean(v);
      if (s) o[k] = s;
    }
    return o;
  };

  return {
    // Sessions overview: the offer, then the three "why choose us" reasons, which
    // line up 1:1 with the page's three feature blocks.
    photoshoots: page([
      ['photoshoots.title', offer.headline || hero.headline],
      ['photoshoots.subtitle', offer.description || hero.subheadline],
      ['photoshoots.professionalEquipment', reasons[0]?.title],
      ['photoshoots.professionalDescription', reasons[0]?.description],
      ['photoshoots.flexibleAppointments', reasons[1]?.title],
      ['photoshoots.flexibleDescription', reasons[1]?.description],
      ['photoshoots.wholeFamily', reasons[2]?.title],
      ['photoshoots.wholeFamilyDescription', reasons[2]?.description],
    ]),

    // Contact: the closing pitch belongs on the page where people act on it.
    contact: page([
      ['contact.title', finalCta.headline],
      ['contact.subtitle', finalCta.description],
    ]),

    // Voucher landing: the offer sells the gift.
    'gift-cards': page([
      ['giftCards.heroTitle', offer.headline],
      ['giftCards.heroSubtitle', offer.description],
      ['giftCards.sectionIntro', offer.urgency],
      ['giftCards.buttonLabel', finalCta.ctaText || hero.ctaText],
    ]),

    // Waitlist: scarcity is the reason someone joins one.
    waitlist: page([
      ['waitlist.title', finalCta.headline],
      ['waitlist.subtitle', offer.urgency || problem.description],
    ]),
  };
}

/**
 * Write the mapped copy into manual_page_content as BOTH draft and published, so
 * the studio finishes onboarding with the pages pre-filled AND live. Never
 * overwrites a value the studio has already set — an onboarding re-run must not
 * clobber their edits.
 */
export async function seedManualPagesFromGenerated(
  content: any,
  language = 'en',
  opts: { overwrite?: boolean } = {},
): Promise<{ pageId: string; written: number; skipped: number } | null> {
  const studioId = await resolveStudioId();

  // All five public pages, not just the homepage.
  const byPage: Record<string, Record<string, string>> = {
    home: mapGeneratedToHomeKeys(content),
    ...mapGeneratedToOtherPages(content),
  };

  let totalWritten = 0;
  let totalSkipped = 0;
  for (const [pid, pageKeys] of Object.entries(byPage)) {
    if (!Object.keys(pageKeys).length) continue;
    const r = await writePage(studioId, pid, language, pageKeys, opts);
    totalWritten += r.written;
    totalSkipped += r.skipped;
  }
  if (!totalWritten && !totalSkipped) return null;
  return { pageId: Object.keys(byPage).join(','), written: totalWritten, skipped: totalSkipped };
}

/** Write one page's keys, preserving anything the studio already set. */
async function writePage(
  studioId: string,
  pageId: string,
  language: string,
  keys: Record<string, string>,
  opts: { overwrite?: boolean },
): Promise<{ written: number; skipped: number }> {
  const existing = await pool.query(
    `SELECT draft_content, published_content FROM manual_page_content
      WHERE studio_id = $1 AND page_id = $2 AND language = $3 LIMIT 1`,
    [studioId, pageId, language],
  );

  const prevDraft = existing.rows[0]?.draft_content || {};
  const prevPublished = existing.rows[0]?.published_content || {};

  let written = 0;
  let skipped = 0;
  const draft: Record<string, string> = { ...prevDraft };
  for (const [k, v] of Object.entries(keys)) {
    // Anything the studio already has stays put — EXCEPT on a forced re-run.
    // Without that exception a studio onboarded before this existed can never be
    // fixed: its fields already hold auto-published copies of the old defaults, so
    // "don't overwrite" would skip every one of them and regeneration would be a
    // silent no-op.
    if (!opts.overwrite && (clean(prevDraft[k]) || clean(prevPublished[k]))) { skipped++; continue; }
    draft[k] = v;
    written++;
  }
  if (!written) return { written: 0, skipped };

  const published = { ...prevPublished, ...Object.fromEntries(Object.entries(draft).filter(([k]) => keys[k])) };

  await pool.query(
    `INSERT INTO manual_page_content (studio_id, page_id, language, draft_content, published_content, status, published_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, 'published', NOW(), NOW(), NOW())
     ON CONFLICT (studio_id, page_id, language)
     DO UPDATE SET draft_content = $4::jsonb, published_content = $5::jsonb,
                   status = 'published', published_at = NOW(), updated_at = NOW()`,
    [studioId, pageId, language, JSON.stringify(draft), JSON.stringify(published)],
  );

  return { written, skipped };
}
