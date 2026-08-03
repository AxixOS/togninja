// Landing Page Promo Pack Client Service — Phase 5

import { apiRequest } from '@/lib/queryClient';
import type { LandingPagePromoPackRequest, LandingPagePromoPackResponse } from '../types/landingPagePromoPack.types';

const BASE = '/api/admin/landing-pages';

export async function generateLandingPagePromoPack(
  landingPageId: string,
  request?: LandingPagePromoPackRequest,
): Promise<LandingPagePromoPackResponse> {
  return apiRequest(`${BASE}/${landingPageId}/promo-pack`, {
    method: 'POST',
    body: JSON.stringify(request || {}),
    headers: { 'Content-Type': 'application/json' },
  });
}
