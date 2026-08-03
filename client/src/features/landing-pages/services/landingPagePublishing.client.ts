// Landing Page Publishing Client Service — Phase 4

import { apiRequest } from '@/lib/queryClient';
import type { PublishLandingPageResult, UnpublishLandingPageResponse, LandingPagePreviewLinkResponse } from '../types/landingPagePublishing.types';

const BASE = '/api/admin/landing-pages';

/** Publish a landing page — server validates readiness first */
export async function publishLandingPage(id: string): Promise<PublishLandingPageResult> {
  return apiRequest(`${BASE}/${id}/publish`, { method: 'POST' });
}

/** Unpublish a landing page — move back to draft */
export async function unpublishLandingPage(id: string): Promise<UnpublishLandingPageResponse> {
  return apiRequest(`${BASE}/${id}/unpublish`, { method: 'POST' });
}

/** Create a short-lived preview link for sharing */
export async function createLandingPagePreviewLink(id: string): Promise<LandingPagePreviewLinkResponse> {
  return apiRequest(`${BASE}/${id}/preview-link`, { method: 'POST' });
}
