import type { LandingPageSectionKey, LandingPageContentMeta } from '../types/landingPageEditor.types';
import type { LandingPageGeneratedContent } from '../types/landingPageGeneration.types';

/**
 * Apply a regenerated section patch into existing content_json.
 * Preserves meta and all other sections.
 */
export function applySectionPatch(
  content: LandingPageGeneratedContent,
  meta: LandingPageContentMeta,
  sectionKey: LandingPageSectionKey,
  patchData: unknown
): { content: LandingPageGeneratedContent; meta: LandingPageContentMeta } {
  // Ensure the section is visible after regeneration
  const updatedVisibility = { ...meta.sectionVisibility, [sectionKey]: true };

  // Add section to order if not already present
  let updatedOrder = [...meta.sectionOrder];
  if (!updatedOrder.includes(sectionKey)) {
    updatedOrder.push(sectionKey);
  }

  const updatedContent = { ...content, [sectionKey]: patchData };
  const updatedMeta: LandingPageContentMeta = {
    sectionOrder: updatedOrder,
    sectionVisibility: updatedVisibility,
    sectionAlignment: { ...(meta.sectionAlignment || {}) },
  };

  return { content: updatedContent as LandingPageGeneratedContent, meta: updatedMeta };
}
