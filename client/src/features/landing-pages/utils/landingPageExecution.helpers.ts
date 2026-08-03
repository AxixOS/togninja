// Phase 7: Landing Page Execution Helpers

import type { LandingPageExecutionStatus, LandingPageApprovalStatus, LandingPageExecutionRecord } from '../types/landingPageExecution.types';
import { EXECUTION_STATUSES, APPROVAL_STATUSES, EXECUTION_TYPES } from './landingPageExecution.constants';

export function getExecutionStatusLabel(status: LandingPageExecutionStatus): string {
  return EXECUTION_STATUSES[status]?.label ?? status;
}

export function getExecutionStatusColor(status: LandingPageExecutionStatus): string {
  return EXECUTION_STATUSES[status]?.color ?? 'gray';
}

export function getExecutionStatusIcon(status: LandingPageExecutionStatus): string {
  return EXECUTION_STATUSES[status]?.icon ?? 'circle';
}

export function getApprovalStatusLabel(status: LandingPageApprovalStatus): string {
  return APPROVAL_STATUSES[status]?.label ?? status;
}

export function getApprovalStatusColor(status: LandingPageApprovalStatus): string {
  return APPROVAL_STATUSES[status]?.color ?? 'gray';
}

export function getExecutionTypeLabel(type: string): string {
  return EXECUTION_TYPES[type as keyof typeof EXECUTION_TYPES]?.label ?? type;
}

export function getExecutionTypeIcon(type: string): string {
  return EXECUTION_TYPES[type as keyof typeof EXECUTION_TYPES]?.icon ?? 'zap';
}

export function isTerminalStatus(status: LandingPageExecutionStatus): boolean {
  return ['completed', 'failed', 'rejected', 'cancelled'].includes(status);
}

export function isActionableStatus(status: LandingPageExecutionStatus): boolean {
  return ['pending', 'awaiting_approval', 'approved', 'queued'].includes(status);
}

export function canRetry(execution: LandingPageExecutionRecord, maxRetries: number): boolean {
  return execution.executionStatus === 'failed' && execution.retryCount < maxRetries;
}

export function canApprove(execution: LandingPageExecutionRecord): boolean {
  return execution.approvalStatus === 'pending' && execution.executionStatus === 'awaiting_approval';
}

export function canReject(execution: LandingPageExecutionRecord): boolean {
  return execution.approvalStatus === 'pending' && execution.executionStatus === 'awaiting_approval';
}

export function canCancel(execution: LandingPageExecutionRecord): boolean {
  return ['pending', 'awaiting_approval', 'queued'].includes(execution.executionStatus);
}

export function getQueueBadgeCount(pendingCount: number, awaitingApprovalCount: number): number {
  return pendingCount + awaitingApprovalCount;
}

export function formatExecutionDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return '—';
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}
