import { apiRequest } from '@/lib/queryClient';
import type { LandingPageRecord, UpdateLandingPageInput } from '../types/landingPage.types';
import type { LandingPageRevisionRecord } from '../types/landingPageRevision.types';

const BASE = '/api/admin/landing-pages';

/** Fetch a single landing page for editing */
export async function getEditableLandingPage(id: string): Promise<LandingPageRecord> {
  return apiRequest(`${BASE}/${id}`);
}

/** Save draft updates to a landing page */
export async function updateLandingPageDraft(
  id: string,
  payload: UpdateLandingPageInput & {
    content_json?: Record<string, unknown>;
    generation_context_json?: Record<string, unknown>;
  }
): Promise<LandingPageRecord> {
  return apiRequest(`${BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/** Duplicate a landing page */
export async function duplicateLandingPageById(id: string): Promise<LandingPageRecord> {
  return apiRequest(`${BASE}/${id}/duplicate`, { method: 'POST' });
}

/** AI suggestions for the recommended/optional fields (applied only to empties). */
export interface LandingPageFieldSuggestions {
  hero?: { eyebrow?: string; subheadline?: string; secondaryCtaText?: string; badgeText?: string };
  finalCta?: { secondaryCtaText?: string };
  seo?: { keyphrase?: string };
}
export async function suggestLandingPageFields(id: string): Promise<{ suggestions: LandingPageFieldSuggestions }> {
  return apiRequest(`${BASE}/${id}/suggest-fields`, { method: 'POST' });
}

/** Check if a slug is available for this user */
export async function checkSlugAvailability(
  slug: string,
  excludeId?: string
): Promise<{ available: boolean; slug: string }> {
  return apiRequest(`${BASE}/check-slug`, {
    method: 'POST',
    body: JSON.stringify({ slug, excludeId }),
  });
}

/** Fetch revisions for a landing page */
export async function getLandingPageRevisions(id: string): Promise<LandingPageRevisionRecord[]> {
  return apiRequest(`${BASE}/${id}/revisions`);
}
