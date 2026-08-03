// Phase 7: Hook — Awaiting Approval Executions (cross-page)

import { useQuery } from '@tanstack/react-query';
import { getAwaitingApprovalExecutions } from '../services/landingPageExecution.client';

export function useAwaitingApprovalExecutions() {
  const query = useQuery({
    queryKey: ['landing-page-executions-awaiting-approval'],
    queryFn: () => getAwaitingApprovalExecutions(),
  });

  return {
    executions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
