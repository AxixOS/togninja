import { useQuery } from '@tanstack/react-query';
import { getLandingPageAnalytics } from '../services/landingPageAnalytics.client';

export function useLandingPageAnalytics(landingPageId: string, days = 30) {
  const query = useQuery({
    queryKey: ['landing-page-analytics', landingPageId, days],
    queryFn: () => getLandingPageAnalytics(landingPageId, days),
    enabled: !!landingPageId,
  });

  return {
    analytics: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
