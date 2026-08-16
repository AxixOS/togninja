// Map generated landing-page content -> the neonDb.createLandingPage payload.
//
// IMPORTANT: this maps the ACTUAL shape returned by generateLandingContent
// (hero.headline / hero.subheadline / hero.ctaText / seo.title / seo.metaDescription
// / seo.slug). The client util mapGenerationResponseToLandingPage.ts targets a
// DIFFERENT, older shape (primaryCtaText / seoTitle / suggestedSlug) and must NOT be
// reused server-side — it would produce empty CTA/SEO and fail publish validation.

import type { LandingContext } from './landing-generator';

export function slugify(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'home';
}

export function mapGeneratedToLandingPage(
  content: any,
  context: LandingContext,
  opts: { userId?: string | null } = {},
): Record<string, any> {
  const hero = content?.hero || {};
  const seo = content?.seo || {};
  const title = seo.title || hero.headline || 'Home';
  const slug = slugify(seo.slug || hero.headline || title);

  return {
    user_id: opts.userId ?? null,
    title,
    slug,
    status: 'draft',
    page_type: context?.pageType || 'homepage',
    primary_service: context?.primaryService || null,
    target_audience: context?.targetAudience || null,
    offer_summary: context?.offerSummary || null,
    city: context?.city || null,
    tone: context?.tone || 'warm',
    seo_title: seo.title || null,
    meta_description: seo.metaDescription || null,
    hero_headline: hero.headline || null,
    hero_subheadline: hero.subheadline || null,
    cta_text: hero.ctaText || context?.ctaText || 'Book Now',
    cta_action: context?.ctaAction || 'book_now',
    // Strip generated proof before it is stored. A prompt asking the model not to invent
    // reviews is guidance; this is the guarantee.
    //
    // content_json passed the whole object through, so pillar and landing pages published
    // model-written testimonials — server-rendered into crawlable HTML (server/vite.ts:748)
    // and shown under a five-star badge reading "Echte Google-Bewertungen". Quotes
    // attributed to invented people, presented to search engines and to the studio's own
    // visitors as verified Google reviews, on the studio's money pages.
    //
    // The homepage path has refused these since generated-to-manual-pages.ts:123 — this is
    // the same rule, applied at the other boundary, so the two cannot disagree. Real proof
    // comes from the studio's Google Places feed or its own testimonials, never from here.
    content_json: stripGeneratedProof(content),
    generation_context_json: context,
  };
}

/** Remove anything the model may have fabricated as social proof. */
function stripGeneratedProof(content: any): any {
  if (!content || typeof content !== 'object') return content;
  const { testimonials, reviews, aggregateRating, milestones, stats, ...rest } = content as any;
  return rest;
}
