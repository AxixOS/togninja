"use strict";
/**
 * Google Calendar Sync Scheduler
 * Runs background sync every 5 minutes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSyncScheduler = startSyncScheduler;
exports.stopSyncScheduler = stopSyncScheduler;
exports.triggerManualSync = triggerManualSync;
const db_1 = require("../db");
const schema_1 = require("@shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const googleCalendarSyncService_1 = require("./googleCalendarSyncService");
let syncInterval = null;
/**
 * Start the background sync scheduler
 */
function startSyncScheduler() {
    // Check if sync is enabled
    if (process.env.GOOGLE_SYNC_ENABLED !== 'true') {
        console.log('📅 Google Calendar sync is disabled (set GOOGLE_SYNC_ENABLED=true to enable)');
        return;
    }
    // Check if credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.log('📅 Google Calendar credentials not configured - skipping sync');
        return;
    }
    const intervalMs = parseInt(process.env.GOOGLE_SYNC_INTERVAL || '300000'); // Default 5 minutes
    console.log(`📅 Starting Google Calendar sync scheduler (every ${intervalMs / 1000}s)`);
    // Run initial sync after 10 seconds
    setTimeout(() => {
        performScheduledSync();
    }, 10000);
    // Then run every interval
    syncInterval = setInterval(() => {
        performScheduledSync();
    }, intervalMs);
}
/**
 * Stop the sync scheduler
 */
function stopSyncScheduler() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
        console.log('📅 Google Calendar sync scheduler stopped');
    }
}
/**
 * Perform sync for all users with sync enabled
 */
async function performScheduledSync() {
    try {
        // Get all users with Google sync enabled
        const configs = await db_1.db
            .select()
            .from(schema_1.calendarSyncSettings)
            .where((0, drizzle_orm_1.eq)(schema_1.calendarSyncSettings.syncEnabled, true));
        if (configs.length === 0) {
            console.log('📅 No users with sync enabled');
            return;
        }
        console.log(`📅 Running sync for ${configs.length} user(s)...`);
        for (const config of configs) {
            try {
                const syncService = await (0, googleCalendarSyncService_1.createSyncServiceForUser)(config.userId);
                if (syncService) {
                    const results = await syncService.performSync();
                    // Update last sync time
                    await db_1.db
                        .update(schema_1.calendarSyncSettings)
                        .set({ lastSyncAt: new Date() })
                        .where((0, drizzle_orm_1.eq)(schema_1.calendarSyncSettings.id, config.id));
                    console.log(`✅ Synced user ${config.userId}: ${results.imported} imported, ${results.updated} updated`);
                }
            }
            catch (error) {
                console.error(`❌ Error syncing user ${config.userId}:`, error.message);
            }
        }
        console.log('📅 Scheduled sync complete');
    }
    catch (error) {
        console.error('❌ Scheduled sync failed:', error);
    }
}
/**
 * Manually trigger sync for a specific user
 */
async function triggerManualSync(userId) {
    try {
        const syncService = await (0, googleCalendarSyncService_1.createSyncServiceForUser)(userId);
        if (!syncService) {
            return {
                success: false,
                errors: ['Google Calendar not connected or sync not configured'],
            };
        }
        const results = await syncService.performSync();
        // Update last sync time
        await db_1.db
            .update(schema_1.calendarSyncSettings)
            .set({ lastSyncAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.calendarSyncSettings.userId, userId));
        return {
            success: results.success,
            imported: results.imported,
            updated: results.updated,
            deleted: results.deleted,
            errors: results.errors,
        };
    }
    catch (error) {
        console.error('Manual sync error:', error);
        return {
            success: false,
            errors: [error.message],
        };
    }
}
