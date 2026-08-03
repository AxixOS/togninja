import type { LandingPageGeneratedContent, LandingPageSeoBlock } from '../types/landingPageGeneration.types';
import type { LandingPageContentMeta } from '../types/landingPageEditor.types';
import { DEFAULT_SECTION_ORDER, DEFAULT_SECTION_VISIBILITY } from './landingPageSections';

export const DEFAULT_HERO = {
  eyebrow: '',
  headline: 'Your Headline',
  subheadline: '',
  primaryCtaText: 'Book Now',
  secondaryCtaText: '',
  badgeText: '',
};

export const DEFAULT_SEO: LandingPageSeoBlock = {
  seoTitle: '',
  metaDescription: '',
  keyphrase: '',
  suggestedSlug: '',
  suggestedInternalLinks: [],
  imageAltSuggestions: [],
  schemaSuggestions: [],
};

export const DEFAULT_CONTENT_META: LandingPageContentMeta = {
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  sectionVisibility: { ...DEFAULT_SECTION_VISIBILITY },
  sectionAlignment: {},
};

export const EMPTY_EDITOR_CONTENT: LandingPageGeneratedContent = {
  hero: { ...DEFAULT_HERO },
  seo: { ...DEFAULT_SEO },
};
