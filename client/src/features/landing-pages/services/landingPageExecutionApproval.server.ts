// Phase 7: Execution Approval Server Service
// Encapsulates approval/rejection logic.

export interface ApprovalDecision {
  executionId: string;
  userId: string;
  decision: 'approved' | 'rejected';
  reason?: string;
}

export function validateApprovalDecision(input: Partial<ApprovalDecision>): { valid: boolean; error?: string } {
  if (!input.executionId) return { valid: false, error: 'executionId is required.' };
  if (!input.userId) return { valid: false, error: 'userId is required.' };
  if (!input.decision || !['approved', 'rejected'].includes(input.decision)) {
    return { valid: false, error: 'decision must be "approved" or "rejected".' };
  }
  return { valid: true };
}

export function buildApprovalUpdate(decision: ApprovalDecision): Record<string, unknown> {
  const now = new Date().toISOString();
  if (decision.decision === 'approved') {
    return {
      executionStatus: 'queued',
      approvalStatus: 'approved',
      approvedAt: now,
      approvedBy: decision.userId,
    };
  }
  return {
    executionStatus: 'rejected',
    approvalStatus: 'rejected',
    rejectedAt: now,
    rejectedBy: decision.userId,
  };
}
