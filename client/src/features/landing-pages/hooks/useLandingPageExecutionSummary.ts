// Phase 7: Hook — Landing Page Execution Queue Summary

import { useQuery } from '@tanstack/react-query';
import { getLandingPageExecutionSummary } from '../services/landingPageExecution.client';

export function useLandingPageExecutionSummary(landingPageId: string) {
  const query = useQuery({
    queryKey: ['landing-page-execution-summary', landingPageId],
    queryFn: () => getLandingPageExecutionSummary(landingPageId),
    enabled: !!landingPageId,
  });

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
