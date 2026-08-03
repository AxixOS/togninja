// Phase 6: Hook — Landing Page Recommendations

import { useQuery } from '@tanstack/react-query';
import { getLandingPageRecommendations } from '../services/landingPageAutomation.client';

export function useLandingPageRecommendations(landingPageId: string) {
  const query = useQuery({
    queryKey: ['landing-page-recommendations', landingPageId],
    queryFn: () => getLandingPageRecommendations(landingPageId),
    enabled: !!landingPageId,
  });

  return {
    recommendations: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
