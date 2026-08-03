/**
 * Audit - Tool execution logging and compliance tracking
 * 
 * Every tool call (success or failure) is logged to the database for:
 * - Debugging: Replay what the agent did
 * - Compliance: Audit trail for financial/GDPR actions
 * - Analytics: Track token usage, performance, error rates
 */

import { db } from "../../../server/db";
import { agentAudit, agentAuditDiff } from "../../../shared/schema";
import { ToolContext } from "./Types";
import { eq, gte } from "drizzle-orm";

/**
 * Log entry for a tool execution
 */
interface AuditLogEntry {
  tool: string;
  args: any;
  result: any;
  ok: boolean;
  error?: string;
  duration: number;
  simulated: boolean;
}

/**
 * Log a tool call to the database
 * Non-blocking - failures are logged but don't crash the agent
 */
export async function logToolCall(
  ctx: ToolContext,
  entry: AuditLogEntry
): Promise<void> {
  try {
    await db.insert(agentAudit).values({
      sessionId: ctx.sessionId,
      tool: entry.tool,
      argsJson: JSON.stringify(entry.args),
      resultJson: entry.ok ? JSON.stringify(entry.result) : null,
      ok: entry.ok,
      error: entry.error || null,
      duration: entry.duration,
      simulated: entry.simulated,
      createdAt: new Date()
    });
    
    console.log(`[Audit] Logged: ${entry.tool} (ok=${entry.ok}, duration=${entry.duration}ms, simulated=${entry.simulated})`);
  } catch (error) {
    // Non-blocking: log to console but don't crash
    console.error(`[Audit] Failed to log tool call:`, error);
  }
}

/**
 * Get audit history for a session
 * Useful for the Agent Console timeline view
 */
export async function getSessionAudit(sessionId: string) {
  try {
    const logs = await db
      .select()
      .from(agentAudit)
      .where(eq(agentAudit.sessionId, sessionId))
      .orderBy(agentAudit.createdAt);
    
    return logs.map(log => ({
      tool: log.tool,
      args: JSON.parse(log.argsJson || "{}"),
      result: log.resultJson ? JSON.parse(log.resultJson) : null,
      ok: log.ok,
      error: log.error,
      duration: log.duration,
      simulated: log.simulated,
      timestamp: log.createdAt
    }));
  } catch (error) {
    console.error(`[Audit] Failed to fetch session audit:`, error);
    return [];
  }
}

/**
 * Get aggregate stats across all sessions
 * For monitoring dashboard
 */
export async function getAuditStats(studioId: string, since: Date) {
  try {
    const logs = await db
      .select()
      .from(agentAudit)
      .where(gte(agentAudit.createdAt, since));
    
    // Calculate aggregates
    const total = logs.length;
    const successful = logs.filter(l => l.ok).length;
    const failed = total - successful;
    const avgDuration = logs.reduce((sum, l) => sum + (l.duration || 0), 0) / total;
    
    // Tool usage breakdown
    const toolUsage = logs.reduce((acc, log) => {
      acc[log.tool] = (acc[log.tool] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgDuration: Math.round(avgDuration),
      toolUsage,
      period: { since, until: new Date() }
    };
  } catch (error) {
    console.error(`[Audit] Failed to calculate stats:`, error);
    return null;
  }
}

/**
 * Shadow diff parameters
 */
interface ShadowDiffParams {
  sessionId: string;
  v1Text: string;
  v2PlanJson: any;
  v2ResultsJson: any[];
  match: boolean;
  v1Error?: string | null;
  v2Error?: string | null;
  v1Duration?: number;
  v2Duration?: number;
}

/**
 * Log shadow mode comparison (v1 vs v2)
 * Stored separately for migration analysis
 */
export async function logShadowDiff(params: ShadowDiffParams): Promise<void> {
  try {
    await db.insert(agentAuditDiff).values({
      sessionId: params.sessionId,
      v1Text: params.v1Text,
      v2PlanJson: JSON.stringify(params.v2PlanJson),
      v2ResultsJson: JSON.stringify(params.v2ResultsJson),
      match: params.match,
      v1Error: params.v1Error || null,
      v2Error: params.v2Error || null,
      v1Duration: params.v1Duration || null,
      v2Duration: params.v2Duration || null,
      createdAt: new Date(),
    });
    
    console.log(`[Audit] Shadow diff logged: match=${params.match}, v1=${params.v1Duration}ms, v2=${params.v2Duration}ms`);
  } catch (error) {
    console.error(`[Audit] Failed to log shadow diff:`, error);
  }
}
