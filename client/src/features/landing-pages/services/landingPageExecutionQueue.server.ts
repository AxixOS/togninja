// Phase 7: Execution Queue Server Service
// Queue processing logic for managing execution lifecycle.

export interface QueueProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ executionId: string; error: string }>;
}

export function buildQueueSummaryFromCounts(row: any): Record<string, number> {
  return {
    totalCount: parseInt(row.total_count) || 0,
    pendingCount: parseInt(row.pending_count) || 0,
    awaitingApprovalCount: parseInt(row.awaiting_approval_count) || 0,
    runningCount: parseInt(row.running_count) || 0,
    completedCount: parseInt(row.completed_count) || 0,
    failedCount: parseInt(row.failed_count) || 0,
    rejectedCount: parseInt(row.rejected_count) || 0,
  };
}

export function shouldAutoExecute(
  executionType: string,
  autoExecuteSafeActions: boolean,
): boolean {
  const safeTypes = [
    'generate_promo_pack',
    'queue_social_promo',
    'queue_gmb_promo',
    'create_follow_up_task',
  ];
  return safeTypes.includes(executionType) && autoExecuteSafeActions;
}

export function getRetryDelay(retryCount: number): number {
  // Exponential backoff: 1s, 2s, 4s
  return Math.min(1000 * Math.pow(2, retryCount), 8000);
}
