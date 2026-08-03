// Phase 6: Hook — Landing Page Scheduled Actions

import { useQuery } from '@tanstack/react-query';
import { getLandingPageScheduledActions } from '../services/landingPageAutomation.client';

export function useLandingPageScheduledActions(landingPageId: string) {
  const query = useQuery({
    queryKey: ['landing-page-scheduled-actions', landingPageId],
    queryFn: () => getLandingPageScheduledActions(landingPageId),
    enabled: !!landingPageId,
  });

  return {
    actions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
