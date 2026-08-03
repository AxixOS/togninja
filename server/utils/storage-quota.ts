/**
 * Storage Quota Management Utilities
 * Handles storage calculation, quota enforcement, and usage tracking
 */

import { db } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import {
  storageSubscriptions,
  storageUsage,
  archivedFiles,
} from '../../shared/schema';

// Storage tier limits in bytes
export const STORAGE_LIMITS = {
  starter: 53687091200,      // 50GB
  professional: 214748364800, // 200GB
  enterprise: 1099511627776,  // 1TB
};

// Client limits per tier
export const CLIENT_LIMITS = {
  starter: 100,
  professional: 500,
  enterprise: null, // unlimited
};

/**
 * Calculate total storage used by a subscription
 */
export async function calculateStorageUsed(subscriptionId: string): Promise<number> {
  const result = await db.select({
    totalSize: sql<number>`COALESCE(SUM(${archivedFiles.fileSize}), 0)`,
  })
    .from(archivedFiles)
    .where(eq(archivedFiles.subscriptionId, subscriptionId));

  return Number(result[0]?.totalSize || 0);
}

/**
 * Get current storage usage for a subscription
 */
export async function getStorageUsage(subscriptionId: string) {
  const subscription = await db.select()
    .from(storageSubscriptions)
    .where(eq(storageSubscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription || subscription.length === 0) {
    throw new Error('Subscription not found');
  }

  const sub = subscription[0];

  // Get file count
  const fileCountResult = await db.select({
    count: sql<number>`COUNT(*)`,
  })
    .from(archivedFiles)
    .where(eq(archivedFiles.subscriptionId, subscriptionId));

  const fileCount = Number(fileCountResult[0]?.count || 0);

  // Calculate actual usage from database
  const actualUsage = await calculateStorageUsed(subscriptionId);

  // Get stored usage (might be slightly out of sync)
  const usageRecord = await db.select()
    .from(storageUsage)
    .where(eq(storageUsage.subscriptionId, subscriptionId))
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
export async function checkQuotaBeforeUpload(
  subscriptionId: string,
  uploadSizeBytes: number
): Promise<{ allowed: boolean; reason?: string; details?: any }> {
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
  } catch (error) {
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
export async function updateStorageUsage(subscriptionId: string): Promise<void> {
  try {
    const actualUsage = await calculateStorageUsed(subscriptionId);

    const fileCountResult = await db.select({
      count: sql<number>`COUNT(*)`,
    })
      .from(archivedFiles)
      .where(eq(archivedFiles.subscriptionId, subscriptionId));

    const fileCount = Number(fileCountResult[0]?.count || 0);

    // Update or insert usage record
    const existing = await db.select()
      .from(storageUsage)
      .where(eq(storageUsage.subscriptionId, subscriptionId))
      .limit(1);

    if (existing.length > 0) {
      await db.update(storageUsage)
        .set({
          currentStorageBytes: actualUsage,
          fileCount: fileCount,
          lastCalculatedAt: new Date(),
        })
        .where(eq(storageUsage.subscriptionId, subscriptionId));
    } else {
      await db.insert(storageUsage).values({
        subscriptionId,
        currentStorageBytes: actualUsage,
        fileCount: fileCount,
        lastCalculatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('Error updating storage usage:', error);
    throw error;
  }
}

/**
 * Get upgrade recommendations based on usage
 */
export async function getUpgradeRecommendations(subscriptionId: string) {
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
    const professionalLimitGB = (STORAGE_LIMITS.professional / 1024 / 1024 / 1024).toFixed(0);
    recommendations.push({
      type: 'suggestion',
      severity: 'medium',
      message: `Upgrade to Professional for ${professionalLimitGB}GB of storage (4x more space).`,
      action: 'view_plans',
      suggestedTier: 'professional',
    });
  }

  if (usage.tier === 'professional' && usage.percentUsed >= 75) {
    const enterpriseLimitGB = (STORAGE_LIMITS.enterprise / 1024 / 1024 / 1024).toFixed(0);
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
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get storage statistics for admin dashboard
 */
export async function getStorageStatistics(userId: string) {
  const subscription = await db.select()
    .from(storageSubscriptions)
    .where(
      and(
        eq(storageSubscriptions.userId, userId),
        eq(storageSubscriptions.status, 'active')
      )
    )
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
  const recentFiles = await db.select()
    .from(archivedFiles)
    .where(eq(archivedFiles.subscriptionId, sub.id))
    .orderBy(sql`${archivedFiles.createdAt} DESC`)
    .limit(10);

  return {
    hasSubscription: true,
    tier: sub.tier,
    usage,
    files: recentFiles,
    subscription: sub,
  };
}

export const quotaUtils = {
  calculateStorageUsed,
  getStorageUsage,
  checkQuotaBeforeUpload,
  updateStorageUsage,
  getUpgradeRecommendations,
  formatBytes,
  getStorageStatistics,
  STORAGE_LIMITS,
  CLIENT_LIMITS,
};
