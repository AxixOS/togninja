"use strict";
/**
 * Storage Quota Management Utilities
 * Handles storage calculation, quota enforcement, and usage tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotaUtils = exports.CLIENT_LIMITS = exports.STORAGE_LIMITS = void 0;
exports.calculateStorageUsed = calculateStorageUsed;
exports.getStorageUsage = getStorageUsage;
exports.checkQuotaBeforeUpload = checkQuotaBeforeUpload;
exports.updateStorageUsage = updateStorageUsage;
exports.getUpgradeRecommendations = getUpgradeRecommendations;
exports.formatBytes = formatBytes;
exports.getStorageStatistics = getStorageStatistics;
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../shared/schema");
// Storage tier limits in bytes
exports.STORAGE_LIMITS = {
    starter: 53687091200, // 50GB
    professional: 214748364800, // 200GB
    enterprise: 1099511627776, // 1TB
};
// Client limits per tier
exports.CLIENT_LIMITS = {
    starter: 100,
    professional: 500,
    enterprise: null, // unlimited
};
/**
 * Calculate total storage used by a subscription
 */
async function calculateStorageUsed(subscriptionId) {
    const result = await db_1.db.select({
        totalSize: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.archivedFiles.fileSize}), 0)`,
    })
        .from(schema_1.archivedFiles)
        .where((0, drizzle_orm_1.eq)(schema_1.archivedFiles.subscriptionId, subscriptionId));
    return Number(result[0]?.totalSize || 0);
}
/**
 * Get current storage usage for a subscription
 */
async function getStorageUsage(subscriptionId) {
    const subscription = await db_1.db.select()
        .from(schema_1.storageSubscriptions)
        .where((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.id, subscriptionId))
        .limit(1);
    if (!subscription || subscription.length === 0) {
        throw new Error('Subscription not found');
    }
    const sub = subscription[0];
    // Get file count
    const fileCountResult = await db_1.db.select({
        count: (0, drizzle_orm_1.sql) `COUNT(*)`,
    })
        .from(schema_1.archivedFiles)
        .where((0, drizzle_orm_1.eq)(schema_1.archivedFiles.subscriptionId, subscriptionId));
    const fileCount = Number(fileCountResult[0]?.count || 0);
    // Calculate actual usage from database
    const actualUsage = await calculateStorageUsed(subscriptionId);
    // Get stored usage (might be slightly out of sync)
    const usageRecord = await db_1.db.select()
        .from(schema_1.storageUsage)
        .where((0, drizzle_orm_1.eq)(schema_1.storageUsage.subscriptionId, subscriptionId))
        .limit(1);
    const storedUsage = usageRecord.length > 0 ? usageRecord[0].currentStorageBytes : 0;
    return {
        subscriptionId,
        tier: sub.tier,
        status: sub.status,
        currentStorageBytes: actualUsage, // Use actual calculated value
        storedUsageBytes: storedUsage, // What's stored in the usage table
        storageLimit: sub.storageLimit,
        fileCount,
        percentUsed: (actualUsage / sub.storageLimit) * 100,
        remainingBytes: sub.storageLimit - actualUsage,
        isNearLimit: (actualUsage / sub.storageLimit) >= 0.9, // 90% threshold
        isOverLimit: actualUsage > sub.storageLimit,
    };
}
/**
 * Check if upload would exceed quota
 */
async function checkQuotaBeforeUpload(subscriptionId, uploadSizeBytes) {
    try {
        const usage = await getStorageUsage(subscriptionId);
        if (usage.status !== 'active') {
            return {
                allowed: false,
                reason: `Subscription is ${usage.status}. Please reactivate your subscription to upload files.`,
            };
        }
        const newTotal = usage.currentStorageBytes + uploadSizeBytes;
        if (newTotal > usage.storageLimit) {
            const remaining = usage.remainingBytes;
            const remainingGB = (remaining / 1024 / 1024 / 1024).toFixed(2);
            const neededGB = (uploadSizeBytes / 1024 / 1024 / 1024).toFixed(2);
            return {
                allowed: false,
                reason: 'Storage quota exceeded',
                details: {
                    currentUsage: usage.currentStorageBytes,
                    storageLimit: usage.storageLimit,
                    remaining: remaining,
                    needed: uploadSizeBytes,
                    message: `You only have ${remainingGB}GB remaining, but this upload requires ${neededGB}GB. Please upgrade your plan or delete files.`,
                },
            };
        }
        return {
            allowed: true,
            details: {
                currentUsage: usage.currentStorageBytes,
                afterUpload: newTotal,
                storageLimit: usage.storageLimit,
                percentUsed: (newTotal / usage.storageLimit) * 100,
            },
        };
    }
    catch (error) {
        console.error('Error checking quota:', error);
        return {
            allowed: false,
            reason: 'Failed to check storage quota',
        };
    }
}
/**
 * Update storage usage in real-time
 */
async function updateStorageUsage(subscriptionId) {
    try {
        const actualUsage = await calculateStorageUsed(subscriptionId);
        const fileCountResult = await db_1.db.select({
            count: (0, drizzle_orm_1.sql) `COUNT(*)`,
        })
            .from(schema_1.archivedFiles)
            .where((0, drizzle_orm_1.eq)(schema_1.archivedFiles.subscriptionId, subscriptionId));
        const fileCount = Number(fileCountResult[0]?.count || 0);
        // Update or insert usage record
        const existing = await db_1.db.select()
            .from(schema_1.storageUsage)
            .where((0, drizzle_orm_1.eq)(schema_1.storageUsage.subscriptionId, subscriptionId))
            .limit(1);
        if (existing.length > 0) {
            await db_1.db.update(schema_1.storageUsage)
                .set({
                currentStorageBytes: actualUsage,
                fileCount: fileCount,
                lastCalculatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.storageUsage.subscriptionId, subscriptionId));
        }
        else {
            await db_1.db.insert(schema_1.storageUsage).values({
                subscriptionId,
                currentStorageBytes: actualUsage,
                fileCount: fileCount,
                lastCalculatedAt: new Date(),
            });
        }
    }
    catch (error) {
        console.error('Error updating storage usage:', error);
        throw error;
    }
}
/**
 * Get upgrade recommendations based on usage
 */
async function getUpgradeRecommendations(subscriptionId) {
    const usage = await getStorageUsage(subscriptionId);
    const recommendations = [];
    // Near limit warning
    if (usage.percentUsed >= 90 && usage.percentUsed < 100) {
        recommendations.push({
            type: 'warning',
            severity: 'high',
            message: `You're using ${usage.percentUsed.toFixed(1)}% of your storage. Consider upgrading soon.`,
            action: 'upgrade',
        });
    }
    // Over limit error
    if (usage.percentUsed >= 100) {
        recommendations.push({
            type: 'error',
            severity: 'critical',
            message: 'You have exceeded your storage limit. Upgrade now to continue uploading files.',
            action: 'upgrade_required',
        });
    }
    // Suggest next tier
    if (usage.tier === 'starter' && usage.percentUsed >= 75) {
        const professionalLimitGB = (exports.STORAGE_LIMITS.professional / 1024 / 1024 / 1024).toFixed(0);
        recommendations.push({
            type: 'suggestion',
            severity: 'medium',
            message: `Upgrade to Professional for ${professionalLimitGB}GB of storage (4x more space).`,
            action: 'view_plans',
            suggestedTier: 'professional',
        });
    }
    if (usage.tier === 'professional' && usage.percentUsed >= 75) {
        const enterpriseLimitGB = (exports.STORAGE_LIMITS.enterprise / 1024 / 1024 / 1024).toFixed(0);
        recommendations.push({
            type: 'suggestion',
            severity: 'medium',
            message: `Upgrade to Enterprise for ${enterpriseLimitGB}GB of storage (5x more space).`,
            action: 'view_plans',
            suggestedTier: 'enterprise',
        });
    }
    return {
        usage,
        recommendations,
        shouldShowUpgradePrompt: recommendations.some(r => r.severity === 'high' || r.severity === 'critical'),
    };
}
/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
/**
 * Get storage statistics for admin dashboard
 */
async function getStorageStatistics(userId) {
    const subscription = await db_1.db.select()
        .from(schema_1.storageSubscriptions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, userId), (0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.status, 'active')))
        .limit(1);
    if (!subscription || subscription.length === 0) {
        return {
            hasSubscription: false,
            tier: null,
            usage: null,
            files: [],
        };
    }
    const sub = subscription[0];
    const usage = await getStorageUsage(sub.id);
    // Get recent files
    const recentFiles = await db_1.db.select()
        .from(schema_1.archivedFiles)
        .where((0, drizzle_orm_1.eq)(schema_1.archivedFiles.subscriptionId, sub.id))
        .orderBy((0, drizzle_orm_1.sql) `${schema_1.archivedFiles.createdAt} DESC`)
        .limit(10);
    return {
        hasSubscription: true,
        tier: sub.tier,
        usage,
        files: recentFiles,
        subscription: sub,
    };
}
exports.quotaUtils = {
    calculateStorageUsed,
    getStorageUsage,
    checkQuotaBeforeUpload,
    updateStorageUsage,
    getUpgradeRecommendations,
    formatBytes,
    getStorageStatistics,
    STORAGE_LIMITS: exports.STORAGE_LIMITS,
    CLIENT_LIMITS: exports.CLIENT_LIMITS,
};
