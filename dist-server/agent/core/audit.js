"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = auditLog;
exports.auditLogProposal = auditLogProposal;
exports.auditLogExecution = auditLogExecution;
exports.auditLogFailure = auditLogFailure;
exports.captureBeforeAfter = captureBeforeAfter;
const neon_http_1 = require("drizzle-orm/neon-http");
const serverless_1 = require("@neondatabase/serverless");
const schema_1 = require("../../shared/schema");
const sql = (0, serverless_1.neon)(process.env.DATABASE_URL);
const db = (0, neon_http_1.drizzle)(sql);
async function auditLog(entry) {
    try {
        await db.insert(schema_1.agentActionLog).values({
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
    }
    catch (error) {
        console.error('Failed to log audit entry:', error);
        // Don't throw - audit logging failures shouldn't break the main flow
    }
}
async function auditLogProposal(studioId, userId, action, targetTable, proposalData, riskLevel = "low") {
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
async function auditLogExecution(studioId, userId, action, targetTable, targetId, beforeData, afterData, approvedBy, amount) {
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
async function auditLogFailure(studioId, userId, action, targetTable, error, attemptedData) {
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
async function captureBeforeAfter(executor, beforeFetcher) {
    const before = await beforeFetcher();
    const result = await executor();
    const after = await beforeFetcher(); // Re-fetch to get updated state
    return { result, before, after };
}
