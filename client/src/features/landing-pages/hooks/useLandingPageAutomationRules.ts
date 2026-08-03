// Phase 6: Hook — List Landing Page Automation Rules

import { useQuery } from '@tanstack/react-query';
import { listLandingPageAutomationRules } from '../services/landingPageAutomation.client';

export function useLandingPageAutomationRules(landingPageId: string) {
  const query = useQuery({
    queryKey: ['landing-page-automation-rules', landingPageId],
    queryFn: () => listLandingPageAutomationRules(landingPageId),
    enabled: !!landingPageId,
  });

  return {
    rules: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
