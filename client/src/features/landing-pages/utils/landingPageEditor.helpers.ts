import type { LandingPageSectionKey, LandingPageSectionOrder, LandingPageSectionVisibilityMap, LandingPageContentMeta } from '../types/landingPageEditor.types';
import type { LandingPageGeneratedContent } from '../types/landingPageGeneration.types';

/** Move a section up in the order array */
export function moveSectionUp(order: LandingPageSectionOrder, key: LandingPageSectionKey): LandingPageSectionOrder {
  const idx = order.indexOf(key);
  if (idx <= 0) return order;
  const next = [...order];
  [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
  return next;
}

/** Move a section down in the order array */
export function moveSectionDown(order: LandingPageSectionOrder, key: LandingPageSectionKey): LandingPageSectionOrder {
  const idx = order.indexOf(key);
  if (idx < 0 || idx >= order.length - 1) return order;
  const next = [...order];
  [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
  return next;
}

/** Toggle a section's visibility */
export function toggleSectionVisibility(visibility: LandingPageSectionVisibilityMap, key: LandingPageSectionKey): LandingPageSectionVisibilityMap {
  return { ...visibility, [key]: !visibility[key] };
}

/** Remove an optional section from order and content */
export function removeSection(
  content: LandingPageGeneratedContent,
  meta: LandingPageContentMeta,
  key: LandingPageSectionKey
): { content: LandingPageGeneratedContent; meta: LandingPageContentMeta } {
  const updatedContent = { ...content, [key]: undefined };
  const updatedMeta: LandingPageContentMeta = {
    sectionOrder: meta.sectionOrder.filter(k => k !== key),
    sectionVisibility: { ...meta.sectionVisibility, [key]: false },
    sectionAlignment: { ...(meta.sectionAlignment || {}) },
  };
  return { content: updatedContent, meta: updatedMeta };
}

/** Update a specific section's data in content */
export function updateSectionData(
  content: LandingPageGeneratedContent,
  key: LandingPageSectionKey,
  data: unknown
): LandingPageGeneratedContent {
  return { ...content, [key]: data };
}

/** Sanitise a string lightly for safe storage */
export function sanitizeText(text: string): string {
  return text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

/** Derive a one-line page summary from current content */
export function derivePageSummary(content: LandingPageGeneratedContent): string {
  const headline = content.hero?.headline ?? '';
  const offer = content.offerSection?.title ?? '';
  if (headline && offer) return `${headline} — ${offer}`;
  return headline || offer || 'Untitled landing page';
}

/** Check if content has meaningful generated data */
export function hasGeneratedContent(content: LandingPageGeneratedContent | null | undefined): boolean {
  if (!content) return false;
  return !!(content.hero?.headline && content.hero.headline !== 'Your Headline');
}
