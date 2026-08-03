// Phase 7: Execution Audit Types

import type { LandingPageExecutionType, LandingPageExecutionStatus, LandingPageApprovalStatus } from './landingPageExecution.types';

export type LandingPageExecutionAuditAction =
  | 'created'
  | 'queued'
  | 'auto_approved'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'running'
  | 'completed'
  | 'failed'
  | 'retried'
  | 'cancelled';

export interface LandingPageExecutionAuditEntry {
  id: string;
  executionId: string;
  landingPageId: string;
  userId: string;
  action: LandingPageExecutionAuditAction;
  executionType: LandingPageExecutionType;
  previousStatus: LandingPageExecutionStatus | null;
  newStatus: LandingPageExecutionStatus;
  previousApprovalStatus: LandingPageApprovalStatus | null;
  newApprovalStatus: LandingPageApprovalStatus;
  detailJson: Record<string, unknown>;
  occurredAt: string;
}

export interface LandingPageExecutionAuditSummary {
  landingPageId: string;
  totalEntries: number;
  recentEntries: LandingPageExecutionAuditEntry[];
  lastActivity: string | null;
}
