/**
 * Storage Statistics API Routes
 * Provides storage usage data and upgrade recommendations
 */

import { Router, Request, Response } from 'express';
import { db } from './db';
import { eq, and } from 'drizzle-orm';
import { storageSubscriptions } from '../shared/schema';
import { 
  getStorageUsage, 
  getUpgradeRecommendations,
  getStorageStatistics,
  updateStorageUsage,
  formatBytes,
} from './utils/storage-quota';

const router = Router();

/**
 * Middleware: Check if user is authenticated
 */
function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

/**
 * GET /api/storage-stats/usage
 * Get current storage usage and recommendations
 */
router.get('/usage', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session!.userId;

    // Get active subscription
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
      return res.json({
        hasSubscription: false,
        usage: null,
        recommendations: [],
      });
    }

    const sub = subscription[0];

    // Get usage data and recommendations
    const recommendations = await getUpgradeRecommendations(sub.id);

    res.json({
      hasSubscription: true,
      ...recommendations,
      formatted: {
        currentUsage: formatBytes(recommendations.usage.currentStorageBytes),
        storageLimit: formatBytes(recommendations.usage.storageLimit),
        remaining: formatBytes(recommendations.usage.remainingBytes),
      },
    });
  } catch (error) {
    console.error('Error fetching storage usage:', error);
    res.status(500).json({ error: 'Failed to fetch storage usage' });
  }
});

/**
 * GET /api/storage-stats/dashboard
 * Get comprehensive storage statistics for dashboard
 */
router.get('/dashboard', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session!.userId;
    const stats = await getStorageStatistics(userId);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching storage statistics:', error);
    res.status(500).json({ error: 'Failed to fetch storage statistics' });
  }
});

/**
 * POST /api/storage-stats/recalculate
 * Force recalculation of storage usage
 */
router.post('/recalculate', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session!.userId;

    // Get active subscription
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
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const sub = subscription[0];

    // Recalculate usage
    await updateStorageUsage(sub.id);

    // Get updated usage
    const usage = await getStorageUsage(sub.id);

    res.json({
      message: 'Storage usage recalculated',
      usage,
      formatted: {
        currentUsage: formatBytes(usage.currentStorageBytes),
        storageLimit: formatBytes(usage.storageLimit),
        remaining: formatBytes(usage.remainingBytes),
      },
    });
  } catch (error) {
    console.error('Error recalculating storage:', error);
    res.status(500).json({ error: 'Failed to recalculate storage usage' });
  }
});

export default router;
