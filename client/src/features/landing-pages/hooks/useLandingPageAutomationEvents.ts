// Phase 6: Hook — Landing Page Automation Events

import { useQuery } from '@tanstack/react-query';
import { getLandingPageAutomationEvents } from '../services/landingPageAutomation.client';

export function useLandingPageAutomationEvents(landingPageId: string, limit = 50) {
  const query = useQuery({
    queryKey: ['landing-page-automation-events', landingPageId, limit],
    queryFn: () => getLandingPageAutomationEvents(landingPageId, limit),
    enabled: !!landingPageId,
  });

  return {
    events: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
