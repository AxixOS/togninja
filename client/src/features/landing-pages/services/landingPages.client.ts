import { apiRequest } from '@/lib/queryClient';
import type {
  LandingPageRecord,
  CreateLandingPageInput,
  UpdateLandingPageInput,
  LandingPageListFilters,
} from '../types/landingPage.types';

const BASE = '/api/admin/landing-pages';

/** Fetch all landing pages for the current user, with optional status filter */
export async function listLandingPages(
  filters?: LandingPageListFilters
): Promise<LandingPageRecord[]> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') {
    params.set('status', filters.status);
  }
  const qs = params.toString();
  return apiRequest(`${BASE}${qs ? `?${qs}` : ''}`);
}

/** Fetch a single landing page by ID */
export async function getLandingPageById(id: string): Promise<LandingPageRecord> {
  return apiRequest(`${BASE}/${id}`);
}

/** Create a new landing page draft */
export async function createLandingPage(
  payload: CreateLandingPageInput
): Promise<LandingPageRecord> {
  return apiRequest(BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Update an existing landing page */
export async function updateLandingPage(
  id: string,
  payload: UpdateLandingPageInput
): Promise<LandingPageRecord> {
  return apiRequest(`${BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/** Delete a landing page */
export async function deleteLandingPage(id: string): Promise<void> {
  return apiRequest(`${BASE}/${id}`, { method: 'DELETE' });
}

/** Duplicate a landing page */
export async function duplicateLandingPage(id: string): Promise<LandingPageRecord> {
  return apiRequest(`${BASE}/${id}/duplicate`, { method: 'POST' });
}

/** Check if a slug is available */
export async function checkSlugAvailable(
  slug: string,
  excludeId?: string
): Promise<{ available: boolean }> {
  return apiRequest(`${BASE}/check-slug`, {
    method: 'POST',
    body: JSON.stringify({ slug, excludeId }),
  });
}

// TODO: Phase 2 — add generateLandingPage(context) for AI generation
// TODO: Phase 2 — add regenerateSection(section, context) for section-level regeneration
// TODO: Phase 3 — add publishLandingPage(id) / unpublishLandingPage(id)
