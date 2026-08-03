// Landing Page Editor Types — Phase 3

import type { LandingPageRecord } from './landingPage.types';
import type {
  LandingPageGeneratedContent,
  LandingPageHeroBlock,
  LandingPageTrustBarBlock,
  LandingPageProblemBlock,
  LandingPageOfferBlock,
  LandingPageBenefitsBlock,
  LandingPageWhyChooseUsBlock,
  LandingPageInclusionsBlock,
  LandingPageTestimonialsBlock,
  LandingPageFaqBlock,
  LandingPageFinalCtaBlock,
  LandingPageSeoBlock,
} from './landingPageGeneration.types';

// ── Section Keys ─────────────────────────────────────────────────

export type LandingPageSectionKey =
  | 'hero'
  | 'trustBar'
  | 'problemSection'
  | 'offerSection'
  | 'benefits'
  | 'whyChooseUs'
  | 'inclusions'
  | 'testimonials'
  | 'faq'
  | 'finalCta'
  | 'seo';

// ── Section Definition ───────────────────────────────────────────

export interface LandingPageSectionDefinition {
  key: LandingPageSectionKey;
  label: string;
  description: string;
  required: boolean;
  supportsRegeneration: boolean;
  supportsVisibilityToggle: boolean;
  supportsDuplicate: boolean;
  supportsRemove: boolean;
  criticalForPublish: boolean;
}

// ── Section Visibility / Order ───────────────────────────────────

export type LandingPageSectionVisibilityMap = Record<LandingPageSectionKey, boolean>;

export type LandingPageSectionOrder = LandingPageSectionKey[];

// ── Section Alignment ────────────────────────────────────────────
// Per-section text/content alignment, overriding the default centred layout.

export type LandingPageSectionAlignment = 'left' | 'center' | 'right';

export type LandingPageSectionAlignmentMap = Partial<Record<LandingPageSectionKey, LandingPageSectionAlignment>>;

// ── Content Meta ─────────────────────────────────────────────────

export interface LandingPageContentMeta {
  sectionOrder: LandingPageSectionOrder;
  sectionVisibility: LandingPageSectionVisibilityMap;
  sectionAlignment: LandingPageSectionAlignmentMap;
}

// ── Editor State ─────────────────────────────────────────────────

export interface LandingPageEditorState {
  page: LandingPageRecord;
  content: LandingPageGeneratedContent;
  meta: LandingPageContentMeta;
  seo: LandingPageSeoState;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  activeSection: LandingPageSectionKey | null;
}

// ── SEO State ────────────────────────────────────────────────────

export interface LandingPageSeoState {
  seoTitle: string;
  metaDescription: string;
  keyphrase: string;
  slug: string;
}

// ── Slug Validation ──────────────────────────────────────────────

export interface LandingPageSlugValidationResult {
  valid: boolean;
  available: boolean | null;
  error: string | null;
  checking: boolean;
}

// ── Publish Readiness ────────────────────────────────────────────

export interface LandingPagePublishReadinessResult {
  isReady: boolean;
  errors: string[];
  warnings: string[];
  completedChecks: string[];
  missingCriticalSections: string[];
}

// ── Editor Actions ───────────────────────────────────────────────

export type LandingPageEditorAction =
  | { type: 'SET_CONTENT'; payload: LandingPageGeneratedContent }
  | { type: 'UPDATE_SECTION'; key: LandingPageSectionKey; payload: unknown }
  | { type: 'TOGGLE_VISIBILITY'; key: LandingPageSectionKey }
  | { type: 'REORDER_SECTIONS'; order: LandingPageSectionOrder }
  | { type: 'MOVE_SECTION_UP'; key: LandingPageSectionKey }
  | { type: 'MOVE_SECTION_DOWN'; key: LandingPageSectionKey }
  | { type: 'REMOVE_SECTION'; key: LandingPageSectionKey }
  | { type: 'UPDATE_SEO'; payload: Partial<LandingPageSeoState> }
  | { type: 'UPDATE_PAGE_FIELD'; field: string; value: unknown }
  | { type: 'SET_ACTIVE_SECTION'; key: LandingPageSectionKey | null }
  | { type: 'MARK_SAVED'; timestamp: string }
  | { type: 'SET_DIRTY' };
