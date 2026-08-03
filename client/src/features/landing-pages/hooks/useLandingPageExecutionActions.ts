// Phase 7: Hook — Landing Page Execution Actions (approve, reject, retry, cancel, run)

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createLandingPageExecution,
  approveLandingPageExecution,
  rejectLandingPageExecution,
  retryLandingPageExecution,
  cancelLandingPageExecution,
  runLandingPageExecution,
} from '../services/landingPageExecution.client';

export function useLandingPageExecutionActions(landingPageId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['landing-page-executions', landingPageId] });
    queryClient.invalidateQueries({ queryKey: ['landing-page-execution-summary', landingPageId] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: { execution_type: string; automation_rule_id?: string; source_event_id?: string; requested_payload?: Record<string, unknown> }) =>
      createLandingPageExecution(landingPageId, payload),
    onSuccess: invalidate,
  });

  const approveMutation = useMutation({
    mutationFn: (executionId: string) => approveLandingPageExecution(landingPageId, executionId),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: (executionId: string) => rejectLandingPageExecution(landingPageId, executionId),
    onSuccess: invalidate,
  });

  const retryMutation = useMutation({
    mutationFn: (executionId: string) => retryLandingPageExecution(landingPageId, executionId),
    onSuccess: invalidate,
  });

  const cancelMutation = useMutation({
    mutationFn: (executionId: string) => cancelLandingPageExecution(landingPageId, executionId),
    onSuccess: invalidate,
  });

  const runMutation = useMutation({
    mutationFn: (executionId: string) => runLandingPageExecution(landingPageId, executionId),
    onSuccess: invalidate,
  });

  return {
    createExecution: createMutation.mutate,
    createExecutionAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    approveExecution: approveMutation.mutate,
    isApproving: approveMutation.isPending,

    rejectExecution: rejectMutation.mutate,
    isRejecting: rejectMutation.isPending,

    retryExecution: retryMutation.mutate,
    isRetrying: retryMutation.isPending,

    cancelExecution: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,

    runExecution: runMutation.mutate,
    isRunning: runMutation.isPending,
  };
}
