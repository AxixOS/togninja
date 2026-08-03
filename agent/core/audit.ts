import { db } from '../../server/db.js';
import { agentActionLog } from '../../shared/schema';

// `db` is the shared portable (node-postgres) drizzle instance from server/db.ts.

export interface AuditEntry {
  studio_id: string;
  user_id: string | null;
  action: string;
  target_table?: string;
  target_id?: string;
  before?: any;
  after?: any;
  status: "proposed" | "approved" | "executed" | "failed" | "rolled_back";
  approved_by?: string | null;
  risk_level?: "low" | "med" | "high";
  amount?: number;
  metadata?: any;
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(agentActionLog).values({
      studioId: entry.studio_id,
      userId: entry.user_id,
      action_type: entry.action,
      action_details: entry.metadata,
      success: entry.status === "executed",
      error_message: entry.status === "failed" ? entry.metadata?.error_message : null,
      createdAt: new Date()
    });
    
    console.log(`Audit logged: ${entry.action} on ${entry.target_table || 'unknown'} - ${entry.status}`, {
      studioId: entry.studio_id,
      userId: entry.user_id,
      action: entry.action,
      status: entry.status
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    // Don't throw - audit logging failures shouldn't break the main flow
  }
}

export async function auditLogProposal(
  studioId: string,
  userId: string | null,
  action: string,
  targetTable: string,
  proposalData: any,
  riskLevel: "low" | "med" | "high" = "low"
): Promise<void> {
  await auditLog({
    studio_id: studioId,
    user_id: userId,
    action,
    target_table: targetTable,
    before: null,
    after: proposalData,
    status: "proposed",
    risk_level: riskLevel,
    metadata: { proposal_timestamp: new Date().toISOString() }
  });
}

export async function auditLogExecution(
  studioId: string,
  userId: string | null,
  action: string,
  targetTable: string,
  targetId: string,
  beforeData: any,
  afterData: any,
  approvedBy?: string | null,
  amount?: number
): Promise<void> {
  await auditLog({
    studio_id: studioId,
    user_id: userId,
    action,
    target_table: targetTable,
    target_id: targetId,
    before: beforeData,
    after: afterData,
    status: "executed",
    approved_by: approvedBy,
    amount,
    metadata: { execution_timestamp: new Date().toISOString() }
  });
}

export async function auditLogFailure(
  studioId: string,
  userId: string | null,
  action: string,
  targetTable: string,
  error: any,
  attemptedData?: any
): Promise<void> {
  await auditLog({
    studio_id: studioId,
    user_id: userId,
    action,
    target_table: targetTable,
    before: attemptedData,
    after: null,
    status: "failed",
    metadata: { 
      error_message: error.message || String(error),
      error_timestamp: new Date().toISOString()
    }
  });
}

// Helper function to capture before/after data for updates
export async function captureBeforeAfter<T>(
  executor: () => Promise<T>,
  beforeFetcher: () => Promise<any>
): Promise<{ result: T; before: any; after: any }> {
  const before = await beforeFetcher();
  const result = await executor();
  const after = await beforeFetcher(); // Re-fetch to get updated state
  
  return { result, before, after };
}