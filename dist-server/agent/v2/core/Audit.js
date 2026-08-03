"use strict";
/**
 * Audit - Tool execution logging and compliance tracking
 *
 * Every tool call (success or failure) is logged to the database for:
 * - Debugging: Replay what the agent did
 * - Compliance: Audit trail for financial/GDPR actions
 * - Analytics: Track token usage, performance, error rates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logToolCall = logToolCall;
exports.getSessionAudit = getSessionAudit;
exports.getAuditStats = getAuditStats;
exports.logShadowDiff = logShadowDiff;
const db_1 = require("../../../server/db");
const schema_1 = require("../../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Log a tool call to the database
 * Non-blocking - failures are logged but don't crash the agent
 */
async function logToolCall(ctx, entry) {
    try {
        await db_1.db.insert(schema_1.agentAudit).values({
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
    }
    catch (error) {
        // Non-blocking: log to console but don't crash
        console.error(`[Audit] Failed to log tool call:`, error);
    }
}
/**
 * Get audit history for a session
 * Useful for the Agent Console timeline view
 */
async function getSessionAudit(sessionId) {
    try {
        const logs = await db_1.db
            .select()
            .from(schema_1.agentAudit)
            .where((0, drizzle_orm_1.eq)(schema_1.agentAudit.sessionId, sessionId))
            .orderBy(schema_1.agentAudit.createdAt);
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
    }
    catch (error) {
        console.error(`[Audit] Failed to fetch session audit:`, error);
        return [];
    }
}
/**
 * Get aggregate stats across all sessions
 * For monitoring dashboard
 */
async function getAuditStats(studioId, since) {
    try {
        const logs = await db_1.db
            .select()
            .from(schema_1.agentAudit)
            .where((0, drizzle_orm_1.gte)(schema_1.agentAudit.createdAt, since));
        // Calculate aggregates
        const total = logs.length;
        const successful = logs.filter(l => l.ok).length;
        const failed = total - successful;
        const avgDuration = logs.reduce((sum, l) => sum + (l.duration || 0), 0) / total;
        // Tool usage breakdown
        const toolUsage = logs.reduce((acc, log) => {
            acc[log.tool] = (acc[log.tool] || 0) + 1;
            return acc;
        }, {});
        return {
            total,
            successful,
            failed,
            successRate: total > 0 ? (successful / total) * 100 : 0,
            avgDuration: Math.round(avgDuration),
            toolUsage,
            period: { since, until: new Date() }
        };
    }
    catch (error) {
        console.error(`[Audit] Failed to calculate stats:`, error);
        return null;
    }
}
/**
 * Log shadow mode comparison (v1 vs v2)
 * Stored separately for migration analysis
 */
async function logShadowDiff(params) {
    try {
        await db_1.db.insert(schema_1.agentAuditDiff).values({
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
    }
    catch (error) {
        console.error(`[Audit] Failed to log shadow diff:`, error);
    }
}
