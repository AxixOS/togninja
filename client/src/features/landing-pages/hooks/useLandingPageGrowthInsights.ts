import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { LandingPageGrowthSummary } from '../types/landingPageGrowth.types';

export function useLandingPageGrowthInsights(landingPageId: string) {
  const query = useQuery<LandingPageGrowthSummary>({
    queryKey: ['landing-page-growth-insights', landingPageId],
    queryFn: () => apiRequest(`/api/admin/landing-pages/${landingPageId}/growth-insights`),
    enabled: !!landingPageId,
  });

  return {
    insights: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
