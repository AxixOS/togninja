// Phase 7: Hook — List Landing Page Executions

import { useQuery } from '@tanstack/react-query';
import { listLandingPageExecutions } from '../services/landingPageExecution.client';

export function useLandingPageExecutions(landingPageId: string, options?: { status?: string; approvalStatus?: string }) {
  const query = useQuery({
    queryKey: ['landing-page-executions', landingPageId, options?.status, options?.approvalStatus],
    queryFn: () => listLandingPageExecutions(landingPageId, options),
    enabled: !!landingPageId,
  });

  return {
    executions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
