// Landing Page Visibility Helpers — Phase 4
// Filters sections by visibility for public rendering

import type { LandingPageSectionKey, LandingPageSectionVisibilityMap, LandingPageSectionOrder } from '../types/landingPageEditor.types';
import { DEFAULT_SECTION_ORDER, DEFAULT_SECTION_VISIBILITY } from './landingPageSections';

/** Extract visibility map from content_json (handles raw DB shape) */
function extractVisibility(contentJson: Record<string, unknown>): LandingPageSectionVisibilityMap {
  const meta = contentJson?.meta as Record<string, unknown> | undefined;
  if (meta?.sectionVisibility) {
    return { ...DEFAULT_SECTION_VISIBILITY, ...(meta.sectionVisibility as Partial<LandingPageSectionVisibilityMap>) };
  }
  return { ...DEFAULT_SECTION_VISIBILITY };
}

/** Extract section order from content_json */
function extractSectionOrder(contentJson: Record<string, unknown>): LandingPageSectionOrder {
  const meta = contentJson?.meta as Record<string, unknown> | undefined;
  if (Array.isArray(meta?.sectionOrder) && meta!.sectionOrder.length > 0) {
    return meta!.sectionOrder as LandingPageSectionOrder;
  }
  return [...DEFAULT_SECTION_ORDER];
}

/** Get visible sections in their configured order (excluding 'seo') */
export function getVisibleLandingPageSections(contentJson: Record<string, unknown>): LandingPageSectionKey[] {
  const order = extractSectionOrder(contentJson);
  const visibility = extractVisibility(contentJson);
  return order.filter(key => key !== 'seo' && visibility[key] !== false);
}

/** Check if a specific section is visible */
export function isSectionVisible(contentJson: Record<string, unknown>, sectionKey: LandingPageSectionKey): boolean {
  const visibility = extractVisibility(contentJson);
  return visibility[sectionKey] !== false;
}

/** Return content_json with hidden sections stripped — safe for public rendering */
export function filterHiddenSectionsForPublicRender(contentJson: Record<string, unknown>): Record<string, unknown> {
  const visibility = extractVisibility(contentJson);
  const order = extractSectionOrder(contentJson);
  const filtered: Record<string, unknown> = {};

  for (const key of order) {
    if (key === 'seo') continue; // SEO is handled as metadata, not rendered
    if (visibility[key] !== false && contentJson[key]) {
      filtered[key] = contentJson[key];
    }
  }

  return filtered;
}
