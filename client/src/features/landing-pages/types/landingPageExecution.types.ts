// Phase 7: Landing Page Execution Types

export type LandingPageExecutionType =
  | 'generate_promo_pack'
  | 'create_variant'
  | 'create_rerun_draft'
  | 'queue_social_promo'
  | 'queue_gmb_promo'
  | 'queue_email_promo'
  | 'create_follow_up_task'
  | 'push_crm_signal'
  | 'create_seasonal_clone'
  | 'refresh_cta_copy'
  | 'refresh_headline_variant';

export type LandingPageExecutionStatus =
  | 'pending'
  | 'awaiting_approval'
  | 'approved'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'cancelled';

export type LandingPageApprovalStatus =
  | 'not_required'
  | 'pending'
  | 'approved'
  | 'rejected';

export interface LandingPageExecutionRecord {
  id: string;
  landingPageId: string;
  userId: string;
  automationRuleId: string | null;
  sourceEventId: string | null;
  executionType: LandingPageExecutionType;
  executionStatus: LandingPageExecutionStatus;
  approvalStatus: LandingPageApprovalStatus;
  isAutoExecutable: boolean;
  requestedPayload: Record<string, unknown>;
  executionPayload: Record<string, unknown>;
  resultJson: Record<string, unknown>;
  errorMessage: string | null;
  retryCount: number;
  queuedAt: string;
  executedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLandingPageExecutionInput {
  landingPageId: string;
  userId: string;
  automationRuleId?: string | null;
  sourceEventId?: string | null;
  executionType: LandingPageExecutionType;
  isAutoExecutable?: boolean;
  requestedPayload?: Record<string, unknown>;
  approvalStatus?: LandingPageApprovalStatus;
}

export interface LandingPageExecutionResult {
  executionId: string;
  executionType: LandingPageExecutionType;
  success: boolean;
  resultJson: Record<string, unknown>;
  errorMessage?: string | null;
  createdArtifactId?: string | null;
  createdArtifactType?: string | null;
}

export interface LandingPageExecutionQueueSummary {
  landingPageId: string;
  totalCount: number;
  pendingCount: number;
  awaitingApprovalCount: number;
  runningCount: number;
  completedCount: number;
  failedCount: number;
  rejectedCount: number;
  recentExecutions: LandingPageExecutionRecord[];
}

export interface LandingPageExecutionSettingsRecord {
  id: string;
  userId: string;
  landingPageId: string | null;
  autoExecuteSafeActions: boolean;
  requireApprovalForContentChanges: boolean;
  requireApprovalForCrmPushes: boolean;
  requireApprovalForVariantCreation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateLandingPageExecutionSettingsInput {
  autoExecuteSafeActions?: boolean;
  requireApprovalForContentChanges?: boolean;
  requireApprovalForCrmPushes?: boolean;
  requireApprovalForVariantCreation?: boolean;
}
