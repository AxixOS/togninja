import type { LandingPageGeneratedContent } from '../types/landingPageGeneration.types';
import type { LandingPageContentMeta, LandingPageSectionKey } from '../types/landingPageEditor.types';
import { DEFAULT_SECTION_ORDER, DEFAULT_SECTION_VISIBILITY } from './landingPageSections';

/**
 * Normalize raw content_json from the DB into a safe editor shape.
 * Ensures meta, section ordering, and visibility exist.
 */
export function normalizeLandingPageContent(raw: Record<string, unknown> | null): {
  content: LandingPageGeneratedContent;
  meta: LandingPageContentMeta;
} {
  const data = (raw ?? {}) as Record<string, unknown>;

  // Extract or create meta
  const rawMeta = (data.meta ?? {}) as Partial<LandingPageContentMeta>;
  const meta: LandingPageContentMeta = {
    sectionOrder: Array.isArray(rawMeta.sectionOrder) ? rawMeta.sectionOrder : [...DEFAULT_SECTION_ORDER],
    sectionVisibility: rawMeta.sectionVisibility
      ? { ...DEFAULT_SECTION_VISIBILITY, ...rawMeta.sectionVisibility }
      : { ...DEFAULT_SECTION_VISIBILITY },
    sectionAlignment: (rawMeta.sectionAlignment && typeof rawMeta.sectionAlignment === 'object')
      ? { ...rawMeta.sectionAlignment }
      : {},
  };

  // Normalize content blocks — ensure minimum safe shapes
  const content: LandingPageGeneratedContent = {
    hero: normalizeHero(data.hero),
    trustBar: data.trustBar ? normalizeTrustBar(data.trustBar) : undefined,
    problemSection: data.problemSection ? normalizeProblem(data.problemSection) : undefined,
    offerSection: data.offerSection ? normalizeOffer(data.offerSection) : undefined,
    benefits: data.benefits ? normalizeBenefits(data.benefits) : undefined,
    whyChooseUs: data.whyChooseUs ? normalizeWhyChooseUs(data.whyChooseUs) : undefined,
    inclusions: data.inclusions ? normalizeInclusions(data.inclusions) : undefined,
    testimonials: data.testimonials ? normalizeTestimonials(data.testimonials) : undefined,
    faq: data.faq ? normalizeFaq(data.faq) : undefined,
    finalCta: data.finalCta ? normalizeFinalCta(data.finalCta) : undefined,
    seo: normalizeSeo(data.seo),
  };

  return { content, meta };
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function normalizeHero(raw: unknown) {
  const h = (raw ?? {}) as Record<string, unknown>;
  return {
    eyebrow: str(h.eyebrow),
    headline: str(h.headline, 'Your Headline'),
    subheadline: str(h.subheadline),
    primaryCtaText: str(h.primaryCtaText || h.ctaText, 'Book Now'),
    secondaryCtaText: str(h.secondaryCtaText),
    badgeText: str(h.badgeText),
  };
}

function normalizeTrustBar(raw: unknown) {
  const t = (raw ?? {}) as Record<string, unknown>;
  return { items: arr(t.items).map(i => str(i)) };
}

function normalizeProblem(raw: unknown) {
  const p = (raw ?? {}) as Record<string, unknown>;
  return {
    title: str(p.title || p.headline),
    paragraphs: arr(p.paragraphs || p.painPoints).map(i => str(i)),
  };
}

function normalizeOffer(raw: unknown) {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    title: str(o.title || o.headline),
    intro: str(o.intro || o.description),
    bullets: arr(o.bullets || o.inclusions).map(i => str(i)),
    urgency: str(o.urgency),
    // Preserve the price the AI generated (was silently dropped, which stripped
    // the offer price from the public page after any edit).
    price: str(o.price),
  };
}

function normalizeBenefits(raw: unknown) {
  const b = (raw ?? {}) as Record<string, unknown>;
  const items = arr(b.items).map((item: any) => ({
    title: str(item?.title),
    description: str(item?.description),
  }));
  return { title: str(b.title), items };
}

function normalizeWhyChooseUs(raw: unknown) {
  const w = (raw ?? {}) as Record<string, unknown>;
  // Handle both "points" array and "reasons" object array
  let points: string[] = [];
  if (Array.isArray(w.points)) {
    points = w.points.map(i => str(i));
  } else if (Array.isArray(w.reasons)) {
    points = (w.reasons as any[]).map(r => typeof r === 'string' ? r : str(r?.title));
  }
  return { title: str(w.title || w.headline), points };
}

function normalizeInclusions(raw: unknown) {
  const inc = (raw ?? {}) as Record<string, unknown>;
  return { title: str(inc.title), items: arr(inc.items).map(i => str(i)) };
}

function normalizeTestimonials(raw: unknown) {
  const t = (raw ?? {}) as Record<string, unknown>;
  const testimonials = arr(t.testimonials).map((item: any) => ({
    quote: str(item?.quote),
    author: str(item?.author),
    source: str(item?.source || item?.role),
  }));
  return { title: str(t.title), testimonials };
}

function normalizeFaq(raw: unknown) {
  const f = (raw ?? {}) as Record<string, unknown>;
  const items = arr(f.items).map((item: any) => ({
    question: str(item?.question),
    answer: str(item?.answer),
  }));
  return { title: str(f.title), items };
}

function normalizeFinalCta(raw: unknown) {
  const c = (raw ?? {}) as Record<string, unknown>;
  return {
    title: str(c.title || c.headline),
    body: str(c.body || c.description),
    primaryCtaText: str(c.primaryCtaText || c.ctaText, 'Book Now'),
    secondaryCtaText: str(c.secondaryCtaText),
  };
}

function normalizeSeo(raw: unknown) {
  const s = (raw ?? {}) as Record<string, unknown>;
  return {
    seoTitle: str(s.seoTitle || s.title),
    metaDescription: str(s.metaDescription),
    keyphrase: str(s.keyphrase),
    suggestedSlug: str(s.suggestedSlug || s.slug),
    suggestedInternalLinks: arr(s.suggestedInternalLinks).map(i => str(i)),
    imageAltSuggestions: arr(s.imageAltSuggestions).map(i => str(i)),
    schemaSuggestions: arr(s.schemaSuggestions).map(i => str(i)),
  };
}

/**
 * Serialize the normalized content + meta back to a content_json shape for DB storage.
 */
export function serializeEditorContent(
  content: LandingPageGeneratedContent,
  meta: LandingPageContentMeta
): Record<string, unknown> {
  // The editor works in one field vocabulary (title/intro/bullets/primaryCtaText)
  // while the PUBLIC renderer reads another (headline/description/inclusions/
  // ctaText/price). Write BOTH so an editor save can never blank the public page
  // or drop the offer price. normalize* reads either on the way back in.
  const h: any = content.hero || {};
  const o: any = content.offerSection;
  const pr: any = content.problemSection;
  const w: any = content.whyChooseUs;
  const fc: any = content.finalCta;

  return {
    meta,
    hero: { ...h, ctaText: h.primaryCtaText ?? h.ctaText },
    trustBar: content.trustBar,
    problemSection: pr ? { ...pr, headline: pr.title, painPoints: pr.paragraphs } : undefined,
    offerSection: o ? {
      ...o,
      headline: o.title,
      description: o.intro,
      inclusions: o.bullets,
      price: o.price ?? '',
    } : undefined,
    benefits: content.benefits,
    whyChooseUs: w ? {
      ...w,
      headline: w.title,
      // Public card reads {title, description} objects — plain strings render as empty cards.
      reasons: (w.points ?? []).map((p: any) => (typeof p === 'string' ? { title: p, description: '' } : p)),
    } : undefined,
    inclusions: content.inclusions,
    testimonials: content.testimonials,
    faq: content.faq,
    finalCta: fc ? { ...fc, headline: fc.title, description: fc.body, ctaText: fc.primaryCtaText } : undefined,
    seo: content.seo,
  };
}
