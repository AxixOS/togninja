// Landing Page Public Types — Phase 4

import type { LandingPageSectionKey, LandingPageSectionVisibilityMap, LandingPageSectionOrder } from './landingPageEditor.types';

// ── Public View Model ────────────────────────────────────────

/** Sanitized record exposed to public renderer — no dashboard-only fields */
export interface PublicLandingPageViewModel {
  id: string;
  title: string;
  slug: string;
  seoTitle: string;
  metaDescription: string;
  canonicalUrl: string | null;
  noindex: boolean;
  schemaType: string | null;
  ctaAction: string;
  ctaText: string;
  city: string | null;
  primaryService: string | null;
  publishedAt: string | null;
  sectionOrder: LandingPageSectionKey[];
  sectionVisibility: LandingPageSectionVisibilityMap;
  content: PublicLandingPageContent;
  isPreview: boolean;
}

/** Content blocks filtered for rendering */
export interface PublicLandingPageContent {
  hero?: PublicHeroBlock;
  trustBar?: { items: string[] };
  problemSection?: { title: string; paragraphs: string[] };
  offerSection?: { title: string; intro: string; bullets: string[]; urgency?: string };
  benefits?: { title: string; items: { title: string; description: string }[] };
  whyChooseUs?: { title: string; points: string[] };
  inclusions?: { title: string; items: string[] };
  testimonials?: { title: string; testimonials: { quote: string; author: string; source?: string }[] };
  faq?: { title: string; items: { question: string; answer: string }[] };
  finalCta?: { title: string; body: string; primaryCtaText: string; secondaryCtaText?: string };
}

export interface PublicHeroBlock {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  primaryCtaText: string;
  secondaryCtaText?: string;
  badgeText?: string;
}

// ── Metadata Input ───────────────────────────────────────────

export interface PublicLandingPageMetadataInput {
  seoTitle: string;
  metaDescription: string;
  canonicalUrl: string | null;
  noindex: boolean;
  slug: string;
  city: string | null;
  primaryService: string | null;
  isPreview: boolean;
}

// ── Schema Input ─────────────────────────────────────────────

export interface PublicLandingPageSchemaInput {
  title: string;
  description: string;
  canonicalUrl: string;
  city: string | null;
  primaryService: string | null;
  faqItems?: { question: string; answer: string }[];
  offerName?: string;
  offerDescription?: string;
}

// ── Section Props ────────────────────────────────────────────

export interface PublicLandingPageSectionProps<T = unknown> {
  data: T;
  ctaHref: string;
  ctaText?: string;
  pageSlug: string;
  isPreview: boolean;
}

// ── Preview Context ──────────────────────────────────────────

export interface LandingPagePreviewContext {
  isPreview: boolean;
  previewToken: string | null;
  expiresAt: string | null;
}
