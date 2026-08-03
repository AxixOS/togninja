// Landing Page Publishing Types — Phase 4

import type { LandingPageRecord, LandingPageStatus } from './landingPage.types';

// ── Publish / Unpublish ──────────────────────────────────────

export interface PublishLandingPageRequest {
  landingPageId: string;
}

export interface PublishLandingPageResponse {
  success: true;
  page: LandingPageRecord;
  publishedUrl: string;
}

export interface PublishLandingPageValidationError {
  success: false;
  error: {
    message: string;
    validation: {
      errors: string[];
      warnings: string[];
    };
  };
}

export type PublishLandingPageResult = PublishLandingPageResponse | PublishLandingPageValidationError;

export interface UnpublishLandingPageResponse {
  success: true;
  page: LandingPageRecord;
}

// ── Preview Link ─────────────────────────────────────────────

export interface LandingPagePreviewLinkResponse {
  previewUrl: string;
  expiresAt: string;
}

// ── Publish Validation ───────────────────────────────────────

export interface LandingPagePublishValidationResult {
  isPublishable: boolean;
  errors: string[];
  warnings: string[];
}

// ── Indexability ─────────────────────────────────────────────

export interface LandingPageIndexabilityState {
  indexable: boolean;
  noindex: boolean;
  canonicalUrl: string | null;
  reason: 'published' | 'draft' | 'preview' | 'archived' | 'noindex_set';
}
