/**
 * Gallery Transfer API Routes
 * Handles transferring gallery images to client archives
 */

import { Router, Request, Response } from 'express';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from './db';
import {
  galleries,
  galleryImages,
  storageSubscriptions,
  archivedFiles,
  galleryTransferLog,
  crmClients,
  InsertArchivedFile,
  InsertGalleryTransferLog,
} from '../shared/schema';
import { s3Service } from './services/s3-storage';
import { checkQuotaBeforeUpload, updateStorageUsage } from './utils/storage-quota';

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
 * Transfer gallery images to client archive
 * POST /api/gallery-transfer/:galleryId
 */
router.post('/:galleryId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.params;
    const { selectedImageIds, folderId, notifyClient } = req.body;

    // Get gallery with client info
    const galleryResult = await db.select({
      gallery: galleries,
      client: crmClients,
    })
      .from(galleries)
      .leftJoin(crmClients, eq(galleries.clientId, crmClients.id))
      .where(eq(galleries.id, galleryId))
      .limit(1);

    if (!galleryResult || galleryResult.length === 0) {
      return res.status(404).json({ error: 'Gallery not found' });
    }

    const { gallery, client } = galleryResult[0];

    if (!gallery.clientId || !client) {
      return res.status(400).json({ 
        error: 'Gallery must be linked to a client to transfer images' 
      });
    }

    // Check if client has userId
    if (!client.userId) {
      return res.status(400).json({
        error: 'Client account not set up',
        message: 'The client must create a user account before they can receive transferred images.',
      });
    }

    // Check if client has active storage subscription
    const subscription = await db.select()
      .from(storageSubscriptions)
      .where(
        and(
          eq(storageSubscriptions.userId, client.userId),
          eq(storageSubscriptions.status, 'active')
        )
      )
      .limit(1);

    if (!subscription || subscription.length === 0) {
      return res.status(403).json({
        error: 'Client does not have an active storage subscription',
        message: 'The client must subscribe to a storage plan before you can transfer images to their archive.',
      });
    }

    const clientSubscription = subscription[0];

    // Get images to transfer
    let images;
    if (selectedImageIds && selectedImageIds.length > 0) {
      images = await db.select()
        .from(galleryImages)
        .where(
          and(
            eq(galleryImages.galleryId, galleryId),
            inArray(galleryImages.id, selectedImageIds)
          )
        );
    } else {
      images = await db.select()
        .from(galleryImages)
        .where(eq(galleryImages.galleryId, galleryId));
    }

    if (images.length === 0) {
      return res.status(400).json({ error: 'No images found to transfer' });
    }

    // Calculate total size of images to transfer
    // For now, estimate ~2MB per image (can be updated later)
    const estimatedSizePerImage = 2 * 1024 * 1024; // 2MB
    const totalSize = images.length * estimatedSizePerImage;

    // Check if transfer would exceed storage quota using utility
    const quotaCheck = await checkQuotaBeforeUpload(clientSubscription.id, totalSize);
    
    if (!quotaCheck.allowed) {
      return res.status(413).json({
        error: quotaCheck.reason,
        ...quotaCheck.details,
      });
    }

    // Transfer each image
    const transferredFiles = [];
    let successCount = 0;
    let failCount = 0;

    for (const image of images) {
      try {
        // For now, create archive record pointing to original gallery image URL
        // In production, you would copy the image to S3
        const fileData: InsertArchivedFile = {
          subscriptionId: clientSubscription.id,
          folderId: folderId || null,
          fileName: image.filename || image.title || 'Untitled',
          fileSize: estimatedSizePerImage,
          mimeType: 'image/jpeg', // Assuming JPEG
          s3Key: image.url, // Using gallery image URL as key for now
          s3Url: image.url,
          thumbnailS3Key: null,
          thumbnailUrl: null,
          sourceType: 'gallery_transfer',
          sourceId: image.id,
        };

        const [archivedFile] = await db.insert(archivedFiles)
          .values(fileData)
          .returning();

        transferredFiles.push(archivedFile);
        successCount++;
      } catch (error) {
        console.error(`Failed to transfer image ${image.id}:`, error);
        failCount++;
      }
    }

    // Create transfer log entry
    const transferLogData: InsertGalleryTransferLog = {
      galleryId,
      clientId: gallery.clientId,
      subscriptionId: clientSubscription.id,
      imageCount: successCount,
      totalSizeBytes: totalSize,
      transferredBy: req.session!.userId,
    };

    await db.insert(galleryTransferLog).values(transferLogData);

    // Update storage usage using utility
    await updateStorageUsage(clientSubscription.id);

    // TODO: Send email notification to client if requested
    if (notifyClient && client.email) {
      // Email notification logic would go here
      console.log(`TODO: Send email notification to ${client.email}`);
    }

    res.json({
      success: true,
      transferred: successCount,
      failed: failCount,
      totalSize: totalSize,
      files: transferredFiles,
    });
  } catch (error) {
    console.error('Error transferring gallery to archive:', error);
    res.status(500).json({ error: 'Failed to transfer gallery to archive' });
  }
});

/**
 * Get transfer history for a gallery
 * GET /api/gallery-transfer/:galleryId/history
 */
router.get('/:galleryId/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const { galleryId } = req.params;

    const transfers = await db.select()
      .from(galleryTransferLog)
      .where(eq(galleryTransferLog.galleryId, galleryId))
      .orderBy(galleryTransferLog.transferredAt);

    res.json(transfers);
  } catch (error) {
    console.error('Error fetching transfer history:', error);
    res.status(500).json({ error: 'Failed to fetch transfer history' });
  }
});

export default router;
