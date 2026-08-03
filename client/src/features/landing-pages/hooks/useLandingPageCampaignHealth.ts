// Phase 6: Hook — Landing Page Campaign Health

import { useQuery } from '@tanstack/react-query';
import { getLandingPageCampaignHealth } from '../services/landingPageAutomation.client';

export function useLandingPageCampaignHealth(landingPageId: string) {
  const query = useQuery({
    queryKey: ['landing-page-campaign-health', landingPageId],
    queryFn: () => getLandingPageCampaignHealth(landingPageId),
    enabled: !!landingPageId,
  });

  return {
    health: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
