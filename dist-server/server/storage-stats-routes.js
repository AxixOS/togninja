"use strict";
/**
 * Storage Statistics API Routes
 * Provides storage usage data and upgrade recommendations
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("./db");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../shared/schema");
const storage_quota_1 = require("./utils/storage-quota");
const router = (0, express_1.Router)();
/**
 * Middleware: Check if user is authenticated
 */
function requireAuth(req, res, next) {
    if (!req.session?.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
}
/**
 * GET /api/storage-stats/usage
 * Get current storage usage and recommendations
 */
router.get('/usage', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        // Get active subscription
        const subscription = await db_1.db.select()
            .from(schema_1.storageSubscriptions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, userId), (0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.status, 'active')))
            .limit(1);
        if (!subscription || subscription.length === 0) {
            return res.json({
                hasSubscription: false,
                usage: null,
                recommendations: [],
            });
        }
        const sub = subscription[0];
        // Get usage data and recommendations
        const recommendations = await (0, storage_quota_1.getUpgradeRecommendations)(sub.id);
        res.json({
            hasSubscription: true,
            ...recommendations,
            formatted: {
                currentUsage: (0, storage_quota_1.formatBytes)(recommendations.usage.currentStorageBytes),
                storageLimit: (0, storage_quota_1.formatBytes)(recommendations.usage.storageLimit),
                remaining: (0, storage_quota_1.formatBytes)(recommendations.usage.remainingBytes),
            },
        });
    }
    catch (error) {
        console.error('Error fetching storage usage:', error);
        res.status(500).json({ error: 'Failed to fetch storage usage' });
    }
});
/**
 * GET /api/storage-stats/dashboard
 * Get comprehensive storage statistics for dashboard
 */
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const stats = await (0, storage_quota_1.getStorageStatistics)(userId);
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching storage statistics:', error);
        res.status(500).json({ error: 'Failed to fetch storage statistics' });
    }
});
/**
 * POST /api/storage-stats/recalculate
 * Force recalculation of storage usage
 */
router.post('/recalculate', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        // Get active subscription
        const subscription = await db_1.db.select()
            .from(schema_1.storageSubscriptions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, userId), (0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.status, 'active')))
            .limit(1);
        if (!subscription || subscription.length === 0) {
            return res.status(404).json({ error: 'No active subscription found' });
        }
        const sub = subscription[0];
        // Recalculate usage
        await (0, storage_quota_1.updateStorageUsage)(sub.id);
        // Get updated usage
        const usage = await (0, storage_quota_1.getStorageUsage)(sub.id);
        res.json({
            message: 'Storage usage recalculated',
            usage,
            formatted: {
                currentUsage: (0, storage_quota_1.formatBytes)(usage.currentStorageBytes),
                storageLimit: (0, storage_quota_1.formatBytes)(usage.storageLimit),
                remaining: (0, storage_quota_1.formatBytes)(usage.remainingBytes),
            },
        });
    }
    catch (error) {
        console.error('Error recalculating storage:', error);
        res.status(500).json({ error: 'Failed to recalculate storage usage' });
    }
});
exports.default = router;
