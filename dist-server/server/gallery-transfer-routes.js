"use strict";
/**
 * Gallery Transfer API Routes
 * Handles transferring gallery images to client archives
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("./db");
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
 * Transfer gallery images to client archive
 * POST /api/gallery-transfer/:galleryId
 */
router.post('/:galleryId', requireAuth, async (req, res) => {
    try {
        const { galleryId } = req.params;
        const { selectedImageIds, folderId, notifyClient } = req.body;
        // Get gallery with client info
        const galleryResult = await db_1.db.select({
            gallery: schema_1.galleries,
            client: schema_1.crmClients,
        })
            .from(schema_1.galleries)
            .leftJoin(schema_1.crmClients, (0, drizzle_orm_1.eq)(schema_1.galleries.clientId, schema_1.crmClients.id))
            .where((0, drizzle_orm_1.eq)(schema_1.galleries.id, galleryId))
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
        const subscription = await db_1.db.select()
            .from(schema_1.storageSubscriptions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, client.userId), (0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.status, 'active')))
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
            images = await db_1.db.select()
                .from(schema_1.galleryImages)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.galleryImages.galleryId, galleryId), (0, drizzle_orm_1.inArray)(schema_1.galleryImages.id, selectedImageIds)));
        }
        else {
            images = await db_1.db.select()
                .from(schema_1.galleryImages)
                .where((0, drizzle_orm_1.eq)(schema_1.galleryImages.galleryId, galleryId));
        }
        if (images.length === 0) {
            return res.status(400).json({ error: 'No images found to transfer' });
        }
        // Calculate total size of images to transfer
        // For now, estimate ~2MB per image (can be updated later)
        const estimatedSizePerImage = 2 * 1024 * 1024; // 2MB
        const totalSize = images.length * estimatedSizePerImage;
        // Check if transfer would exceed storage quota using utility
        const quotaCheck = await (0, storage_quota_1.checkQuotaBeforeUpload)(clientSubscription.id, totalSize);
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
                const fileData = {
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
                const [archivedFile] = await db_1.db.insert(schema_1.archivedFiles)
                    .values(fileData)
                    .returning();
                transferredFiles.push(archivedFile);
                successCount++;
            }
            catch (error) {
                console.error(`Failed to transfer image ${image.id}:`, error);
                failCount++;
            }
        }
        // Create transfer log entry
        const transferLogData = {
            galleryId,
            clientId: gallery.clientId,
            subscriptionId: clientSubscription.id,
            imageCount: successCount,
            totalSizeBytes: totalSize,
            transferredBy: req.session.userId,
        };
        await db_1.db.insert(schema_1.galleryTransferLog).values(transferLogData);
        // Update storage usage using utility
        await (0, storage_quota_1.updateStorageUsage)(clientSubscription.id);
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
    }
    catch (error) {
        console.error('Error transferring gallery to archive:', error);
        res.status(500).json({ error: 'Failed to transfer gallery to archive' });
    }
});
/**
 * Get transfer history for a gallery
 * GET /api/gallery-transfer/:galleryId/history
 */
router.get('/:galleryId/history', requireAuth, async (req, res) => {
    try {
        const { galleryId } = req.params;
        const transfers = await db_1.db.select()
            .from(schema_1.galleryTransferLog)
            .where((0, drizzle_orm_1.eq)(schema_1.galleryTransferLog.galleryId, galleryId))
            .orderBy(schema_1.galleryTransferLog.transferredAt);
        res.json(transfers);
    }
    catch (error) {
        console.error('Error fetching transfer history:', error);
        res.status(500).json({ error: 'Failed to fetch transfer history' });
    }
});
exports.default = router;
