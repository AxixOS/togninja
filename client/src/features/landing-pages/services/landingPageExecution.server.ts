// Phase 7: Landing Page Execution Server Service
// Core execution orchestration logic.

export interface ExecutionCreateInput {
  landingPageId: string;
  userId: string;
  automationRuleId?: string | null;
  sourceEventId?: string | null;
  executionType: string;
  approvalStatus?: string;
  isAutoExecutable?: boolean;
  requestedPayload?: Record<string, unknown>;
}

export function validateExecutionInput(input: Partial<ExecutionCreateInput>): { valid: boolean; error?: string } {
  if (!input.executionType) return { valid: false, error: 'executionType is required.' };
  if (!input.landingPageId) return { valid: false, error: 'landingPageId is required.' };
  if (!input.userId) return { valid: false, error: 'userId is required.' };

  const validTypes = [
    'generate_promo_pack', 'create_variant', 'create_rerun_draft',
    'queue_social_promo', 'queue_gmb_promo', 'queue_email_promo',
    'create_follow_up_task', 'push_crm_signal', 'create_seasonal_clone',
    'refresh_cta_copy', 'refresh_headline_variant',
  ];

  if (!validTypes.includes(input.executionType)) {
    return { valid: false, error: `Invalid execution type: ${input.executionType}` };
  }

  return { valid: true };
}

export function normalizeExecutionRow(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    landingPageId: row.landing_page_id,
    userId: row.user_id,
    automationRuleId: row.automation_rule_id,
    sourceEventId: row.source_event_id,
    executionType: row.execution_type,
    executionStatus: row.execution_status,
    approvalStatus: row.approval_status,
    isAutoExecutable: row.is_auto_executable,
    requestedPayload: row.requested_payload,
    executionPayload: row.execution_payload,
    resultJson: row.result_json,
    errorMessage: row.error_message,
    retryCount: row.retry_count,
    queuedAt: row.queued_at,
    executedAt: row.executed_at,
    completedAt: row.completed_at,
    failedAt: row.failed_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    rejectedAt: row.rejected_at,
    rejectedBy: row.rejected_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function normalizeExecutionRows(rows: any[]): any[] {
  return rows.map(normalizeExecutionRow).filter(Boolean);
}

export function determineInitialStatus(approvalStatus: string): string {
  if (approvalStatus === 'not_required') return 'queued';
  return 'awaiting_approval';
}

export function canTransitionTo(currentStatus: string, targetStatus: string): boolean {
  const transitions: Record<string, string[]> = {
    pending: ['awaiting_approval', 'queued', 'cancelled'],
    awaiting_approval: ['queued', 'rejected', 'cancelled'],
    approved: ['queued'],
    queued: ['running', 'cancelled'],
    running: ['completed', 'failed'],
    completed: [],
    failed: ['queued'],
    rejected: [],
    cancelled: [],
  };

  return (transitions[currentStatus] || []).includes(targetStatus);
}
