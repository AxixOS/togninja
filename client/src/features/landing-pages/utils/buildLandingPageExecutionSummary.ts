// Phase 7: Build Landing Page Execution Summary
// Summarizes the execution queue state for dashboard display.

import type { LandingPageExecutionRecord, LandingPageExecutionQueueSummary } from '../types/landingPageExecution.types';

export function buildLandingPageExecutionSummary(
  landingPageId: string,
  executions: LandingPageExecutionRecord[],
  recentLimit: number = 10,
): LandingPageExecutionQueueSummary {
  const pendingCount = executions.filter((e) => e.executionStatus === 'pending').length;
  const awaitingApprovalCount = executions.filter((e) => e.executionStatus === 'awaiting_approval').length;
  const runningCount = executions.filter((e) => e.executionStatus === 'running').length;
  const completedCount = executions.filter((e) => e.executionStatus === 'completed').length;
  const failedCount = executions.filter((e) => e.executionStatus === 'failed').length;
  const rejectedCount = executions.filter((e) => e.executionStatus === 'rejected').length;

  const sorted = [...executions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    landingPageId,
    totalCount: executions.length,
    pendingCount,
    awaitingApprovalCount,
    runningCount,
    completedCount,
    failedCount,
    rejectedCount,
    recentExecutions: sorted.slice(0, recentLimit),
  };
}
