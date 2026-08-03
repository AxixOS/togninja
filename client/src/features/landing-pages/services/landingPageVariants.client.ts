// Landing Page Variants Client Service — Phase 5

import { apiRequest } from '@/lib/queryClient';
import type {
  LandingPageVariantRecord,
  CreateLandingPageVariantInput,
  UpdateLandingPageVariantInput,
} from '../types/landingPageVariant.types';

const BASE = '/api/admin/landing-pages';

export async function listLandingPageVariants(landingPageId: string): Promise<LandingPageVariantRecord[]> {
  return apiRequest(`${BASE}/${landingPageId}/variants`);
}

export async function createLandingPageVariant(
  landingPageId: string,
  data: CreateLandingPageVariantInput,
): Promise<LandingPageVariantRecord> {
  return apiRequest(`${BASE}/${landingPageId}/variants`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function updateLandingPageVariant(
  variantId: string,
  data: UpdateLandingPageVariantInput,
): Promise<LandingPageVariantRecord> {
  return apiRequest(`${BASE}/variants/${variantId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function deleteLandingPageVariant(variantId: string): Promise<void> {
  return apiRequest(`${BASE}/variants/${variantId}`, { method: 'DELETE' });
}
