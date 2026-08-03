// Landing Page Generation Types — Phase 2

// ── Wizard Step Keys ──────────────────────────────────────────────

export type LandingPageWizardStepKey =
  | 'basics'
  | 'offer'
  | 'audience'
  | 'trust'
  | 'cta'
  | 'seo'
  | 'assets';

// ── Template / Page Purpose ───────────────────────────────────────

export type LandingPagePagePurpose = 'leads' | 'voucher-sales' | 'bookings' | 'waitlist' | 'awareness';

export type LandingPageTone = 'warm' | 'professional' | 'playful' | 'luxurious' | 'casual' | 'urgent';

export type LandingPageGenerationStatus = 'idle' | 'generating' | 'generated' | 'failed';

// ── Wizard Form Values ────────────────────────────────────────────

export interface LandingPageWizardFormValues {
  // Basics
  pagePurpose: LandingPagePagePurpose;
  pageType: string;
  serviceType: string;
  city: string;
  title: string;
  tone: LandingPageTone;

  // Offer
  mainOffer: string;
  discountOrBonus: string;
  urgency: string;
  voucherValidity: string;
  weekendAvailability: boolean;
  numberOfPeopleAllowed: string;
  petsAllowed: boolean;
  personalisedVoucher: boolean;
  packageInclusions: string;

  // Audience
  targetAudience: string;
  painPoints: string[];
  desiredOutcomes: string[];
  seasonalAngle: string;

  // Trust
  yearsInBusiness: string;
  studioLocation: string;
  trustPoints: string[];
  reviewSnippets: string[];
  whyChooseYou: string;
  uniqueStyle: string;

  // CTA
  primaryCta: string;
  secondaryCta: string;
  conversionGoal: string;
  preferredAction: string;

  // SEO
  primaryKeyphrase: string;
  secondaryKeyphrases: string;
  internalLinkUrl: string;
  externalAuthorityRef: string;
  faqTopics: string[];

  // Assets
  heroImageUrl: string;
  aiImagePrompt: string;
  visualNotes: string;
  brandColorNotes: string;
  promoBadgeText: string;
}

// ── Generation Request / Response ─────────────────────────────────

export interface GenerateLandingPageRequest {
  formValues: LandingPageWizardFormValues;
  businessProfile?: Record<string, unknown>;
  templateMetadata?: Record<string, unknown>;
}

/** Top-level AI generation response */
export interface GenerateLandingPageResponse {
  title: string;
  pageType: string;
  slugSuggestion: string;
  summary: string;
  content: LandingPageGeneratedContent;
}

// ── Structured Content Blocks ─────────────────────────────────────

export interface LandingPageHeroBlock {
  eyebrow?: string;
  headline: string;
  subheadline: string;
  primaryCtaText: string;
  secondaryCtaText?: string;
  badgeText?: string;
}

export interface LandingPageTrustBarBlock {
  items: string[];
}

export interface LandingPageProblemBlock {
  title: string;
  paragraphs: string[];
}

export interface LandingPageOfferBlock {
  title: string;
  intro?: string;
  bullets: string[];
  urgency?: string;
  price?: string;
}

export interface LandingPageBenefitsBlock {
  title: string;
  items: Array<{
    title: string;
    description: string;
  }>;
}

export interface LandingPageWhyChooseUsBlock {
  title: string;
  points: string[];
}

export interface LandingPageInclusionsBlock {
  title: string;
  items: string[];
}

export interface LandingPageTestimonialsBlock {
  title: string;
  testimonials: Array<{
    quote: string;
    author?: string;
    source?: string;
  }>;
}

export interface LandingPageFaqBlock {
  title: string;
  items: Array<{
    question: string;
    answer: string;
  }>;
}

export interface LandingPageFinalCtaBlock {
  title: string;
  body: string;
  primaryCtaText: string;
  secondaryCtaText?: string;
}

export interface LandingPageSeoBlock {
  seoTitle: string;
  metaDescription: string;
  keyphrase?: string;
  suggestedSlug: string;
  suggestedInternalLinks?: string[];
  imageAltSuggestions?: string[];
  schemaSuggestions?: string[];
}

export interface LandingPageImagePrompts {
  heroImagePrompt?: string;
  voucherImagePrompt?: string;
  socialPromoPrompt?: string;
}

export interface LandingPageGeneratedContent {
  hero: LandingPageHeroBlock;
  trustBar?: LandingPageTrustBarBlock;
  problemSection?: LandingPageProblemBlock;
  offerSection?: LandingPageOfferBlock;
  benefits?: LandingPageBenefitsBlock;
  whyChooseUs?: LandingPageWhyChooseUsBlock;
  inclusions?: LandingPageInclusionsBlock;
  testimonials?: LandingPageTestimonialsBlock;
  faq?: LandingPageFaqBlock;
  finalCta?: LandingPageFinalCtaBlock;
  seo: LandingPageSeoBlock;
  imagePrompts?: LandingPageImagePrompts;
}

// ── Prompt Mapping Types ──────────────────────────────────────────

export interface LandingPagePromptPayload {
  systemPrompt: string;
  developerInstructions: string;
  userContextSummary: string;
  structuredInput: Record<string, unknown>;
  outputContractDescription: string;
}
