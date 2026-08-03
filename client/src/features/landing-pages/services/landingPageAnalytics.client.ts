// Landing Page Analytics Client Service — Phase 5

import { apiRequest } from '@/lib/queryClient';
import type { LandingPageAnalyticsSummary, LandingPagesAnalyticsOverview } from '../types/landingPageAnalytics.types';

const BASE = '/api/admin/landing-pages';

export async function getLandingPageAnalytics(id: string, days = 30): Promise<LandingPageAnalyticsSummary> {
  return apiRequest(`${BASE}/${id}/analytics?days=${days}`);
}

export async function getLandingPagesAnalyticsOverview(): Promise<LandingPagesAnalyticsOverview[]> {
  return apiRequest('/api/admin/landing-pages-analytics-overview');
}
