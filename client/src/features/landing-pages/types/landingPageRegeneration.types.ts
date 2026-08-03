// Landing Page Regeneration Types — Phase 3

import type { LandingPageSectionKey } from './landingPageEditor.types';

export type LandingPageSectionRegenerationMode =
  | 'improve'
  | 'rewrite'
  | 'shorten'
  | 'make-more-direct'
  | 'make-more-emotional'
  | 'localize'
  | 'seo-refresh'
  | 'custom-instruction';

export interface RegenerateLandingPageSectionRequest {
  sectionKey: LandingPageSectionKey;
  mode: LandingPageSectionRegenerationMode;
  customInstruction?: string;
}

export interface RegenerateLandingPageSectionResponse {
  section: LandingPageSectionKey;
  content: unknown;
  updatedPage?: Record<string, unknown>;
}

export interface LandingPageSectionPatch {
  sectionKey: LandingPageSectionKey;
  data: unknown;
}
