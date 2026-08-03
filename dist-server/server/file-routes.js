"use strict";
/**
 * File Upload and Management Routes
 * Handles file uploads, downloads, folders, and storage quota
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("./db");
const schema_1 = require("../shared/schema");
const s3_storage_1 = require("./services/s3-storage");
const storage_quota_1 = require("./utils/storage-quota");
const router = (0, express_1.Router)();
// Configure multer for memory storage
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Get allowed file types from env or use defaults
        const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'application/zip',
            'video/mp4',
            'video/quicktime',
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`File type ${file.mimetype} not allowed`));
        }
    },
});
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
 * Middleware: Check storage quota before upload
 */
async function checkStorageQuotaMiddleware(req, res, next) {
    try {
        const userId = req.session.userId;
        // Get active subscription
        const subscription = await db_1.db.select()
            .from(schema_1.storageSubscriptions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, userId), (0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.status, 'active')))
            .limit(1);
        if (!subscription || subscription.length === 0) {
            return res.status(403).json({ error: 'No active storage subscription' });
        }
        const sub = subscription[0];
        const fileSize = req.file?.size || 0;
        // Use quota utility for validation
        const quotaCheck = await (0, storage_quota_1.checkQuotaBeforeUpload)(sub.id, fileSize);
        if (!quotaCheck.allowed) {
            return res.status(413).json({
                error: quotaCheck.reason,
                ...quotaCheck.details,
            });
        }
        // Attach subscription and quota details to request
        req.subscription = sub;
        req.quotaCheck = quotaCheck;
        next();
    }
    catch (error) {
        console.error('Error checking storage quota:', error);
        res.status(500).json({ error: 'Failed to check storage quota' });
    }
}
/**
 * Create a new folder
 * POST /api/files/folders
 */
router.post('/folders', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { name, parentId } = req.body;
        // Get subscription
        const subscription = await db_1.db.select()
            .from(schema_1.storageSubscriptions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, userId), (0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.status, 'active')))
            .limit(1);
        if (!subscription || subscription.length === 0) {
            return res.status(403).json({ error: 'No active storage subscription' });
        }
        // Create folder
        const folderData = {
            subscriptionId: subscription[0].id,
            name,
            parentFolderId: parentId || null,
        };
        const [folder] = await db_1.db.insert(schema_1.archivedFolders).values(folderData).returning();
        res.json(folder);
    }
    catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).json({ error: 'Failed to create folder' });
    }
});
/**
 * Get folder tree
 * GET /api/files/folders
 */
router.get('/folders', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        // Get subscription
        const subscription = await db_1.db.select()
            .from(schema_1.storageSubscriptions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, userId), (0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.status, 'active')))
            .limit(1);
        if (!subscription || subscription.length === 0) {
            return res.json([]);
        }
        // Get all folders for this subscription
        const folders = await db_1.db.select()
            .from(schema_1.archivedFolders)
            .where((0, drizzle_orm_1.eq)(schema_1.archivedFolders.subscriptionId, subscription[0].id))
            .orderBy(schema_1.archivedFolders.name);
        res.json(folders);
    }
    catch (error) {
        console.error('Error fetching folders:', error);
        res.status(500).json({ error: 'Failed to fetch folders' });
    }
});
/**
 * Upload file
 * POST /api/files/upload
 */
router.post('/upload', requireAuth, upload.single('file'), checkStorageQuotaMiddleware, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        const userId = req.session.userId;
        const { folderId } = req.body;
        const subscription = req.subscription;
        const quotaCheck = req.quotaCheck;
        // Upload to S3
        const uploadResult = await s3_storage_1.s3Service.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, subscription.id.toString(), folderId);
        // Save file metadata to database
        const fileData = {
            subscriptionId: subscription.id,
            folderId: folderId || null,
            fileName: req.file.originalname,
            fileSize: uploadResult.size,
            mimeType: uploadResult.mimeType,
            s3Key: uploadResult.key,
            s3Url: uploadResult.url,
            thumbnailS3Key: uploadResult.thumbnailKey || null,
            thumbnailUrl: uploadResult.thumbnailUrl || null,
            sourceType: 'upload',
            sourceId: null,
        };
        const [file] = await db_1.db.insert(schema_1.archivedFiles).values(fileData).returning();
        // Update storage usage using utility
        await (0, storage_quota_1.updateStorageUsage)(subscription.id);
        res.json({
            file,
            usage: quotaCheck.details,
        });
    }
    catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});
/**
 * Get files in folder
 * GET /api/files?folderId=123
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const folderId = req.query.folderId ? parseInt(req.query.folderId) : null;
        // Get subscription
        const subscription = await db_1.db.select()
            .from(schema_1.storageSubscriptions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, userId), (0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.status, 'active')))
            .limit(1);
        if (!subscription || subscription.length === 0) {
            return res.json([]);
        }
        // Get files
        const whereCondition = folderId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.archivedFiles.subscriptionId, subscription[0].id), (0, drizzle_orm_1.eq)(schema_1.archivedFiles.folderId, folderId))
            : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.archivedFiles.subscriptionId, subscription[0].id), (0, drizzle_orm_1.eq)(schema_1.archivedFiles.folderId, null));
        const files = await db_1.db.select()
            .from(schema_1.archivedFiles)
            .where(whereCondition)
            .orderBy(schema_1.archivedFiles.createdAt);
        res.json(files);
    }
    catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
});
/**
 * Get download URL for file
 * GET /api/files/:id/download
 */
router.get('/:id/download', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const fileId = parseInt(req.params.id);
        // Get file and verify ownership
        const files = await db_1.db.select({
            file: schema_1.archivedFiles,
            subscription: schema_1.storageSubscriptions,
        })
            .from(schema_1.archivedFiles)
            .innerJoin(schema_1.storageSubscriptions, (0, drizzle_orm_1.eq)(schema_1.archivedFiles.subscriptionId, schema_1.storageSubscriptions.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.archivedFiles.id, fileId), (0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, userId)))
            .limit(1);
        if (!files || files.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }
        const { file } = files[0];
        // Generate presigned URL (valid for 1 hour)
        const downloadUrl = await s3_storage_1.s3Service.getPresignedDownloadUrl(file.s3Key, 3600);
        res.json({ downloadUrl });
    }
    catch (error) {
        console.error('Error generating download URL:', error);
        res.status(500).json({ error: 'Failed to generate download URL' });
    }
});
/**
 * Delete file
 * DELETE /api/files/:id
 */
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const fileId = parseInt(req.params.id);
        // Get file and verify ownership
        const files = await db_1.db.select({
            file: schema_1.archivedFiles,
            subscription: schema_1.storageSubscriptions,
        })
            .from(schema_1.archivedFiles)
            .innerJoin(schema_1.storageSubscriptions, (0, drizzle_orm_1.eq)(schema_1.archivedFiles.subscriptionId, schema_1.storageSubscriptions.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.archivedFiles.id, fileId), (0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, userId)))
            .limit(1);
        if (!files || files.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }
        const { file } = files[0];
        // Delete from S3
        await s3_storage_1.s3Service.deleteFile(file.s3Key);
        // Delete from database
        await db_1.db.delete(schema_1.archivedFiles).where((0, drizzle_orm_1.eq)(schema_1.archivedFiles.id, fileId));
        // Update storage usage
        await db_1.db
            .update(schema_1.storageUsage)
            .set({
            currentStorageBytes: (0, drizzle_orm_1.sql) `${schema_1.storageUsage.currentStorageBytes} - ${file.fileSize}`,
            fileCount: (0, drizzle_orm_1.sql) `${schema_1.storageUsage.fileCount} - 1`,
            lastCalculated: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.storageUsage.subscriptionId, file.subscriptionId));
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});
/**
 * Get storage usage stats
 * GET /api/files/usage
 */
router.get('/usage', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        // Get subscription and usage
        const result = await db_1.db.select({
            subscription: schema_1.storageSubscriptions,
            usage: schema_1.storageUsage,
        })
            .from(schema_1.storageSubscriptions)
            .leftJoin(schema_1.storageUsage, (0, drizzle_orm_1.eq)(schema_1.storageUsage.subscriptionId, schema_1.storageSubscriptions.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, userId), (0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.status, 'active')))
            .limit(1);
        if (!result || result.length === 0) {
            return res.json({
                hasSubscription: false,
                currentUsage: 0,
                storageLimit: 0,
                fileCount: 0,
                percentUsed: 0,
            });
        }
        const { subscription, usage } = result[0];
        const currentUsage = usage?.currentStorageBytes || 0;
        res.json({
            hasSubscription: true,
            tier: subscription.tier,
            status: subscription.status,
            currentUsage,
            storageLimit: subscription.storageLimit,
            fileCount: usage?.fileCount || 0,
            percentUsed: ((currentUsage / subscription.storageLimit) * 100).toFixed(2),
            usageGB: (currentUsage / 1024 / 1024 / 1024).toFixed(2),
            limitGB: (subscription.storageLimit / 1024 / 1024 / 1024).toFixed(2),
        });
    }
    catch (error) {
        console.error('Error fetching usage:', error);
        res.status(500).json({ error: 'Failed to fetch usage' });
    }
});
/**
 * Move file to folder
 * PATCH /api/files/:id/move
 */
router.patch('/:id/move', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const fileId = parseInt(req.params.id);
        const { folderId } = req.body;
        // Get file and verify ownership
        const files = await db_1.db.select({
            file: schema_1.archivedFiles,
            subscription: schema_1.storageSubscriptions,
        })
            .from(schema_1.archivedFiles)
            .innerJoin(schema_1.storageSubscriptions, (0, drizzle_orm_1.eq)(schema_1.archivedFiles.subscriptionId, schema_1.storageSubscriptions.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.archivedFiles.id, fileId), (0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, userId)))
            .limit(1);
        if (!files || files.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }
        // If folderId is provided, verify folder exists and belongs to same subscription
        if (folderId) {
            const folder = await db_1.db.select()
                .from(schema_1.archivedFolders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.archivedFolders.id, folderId), (0, drizzle_orm_1.eq)(schema_1.archivedFolders.subscriptionId, files[0].file.subscriptionId)))
                .limit(1);
            if (!folder || folder.length === 0) {
                return res.status(404).json({ error: 'Folder not found' });
            }
        }
        // Update file's folder
        await db_1.db
            .update(schema_1.archivedFiles)
            .set({ folderId: folderId || null })
            .where((0, drizzle_orm_1.eq)(schema_1.archivedFiles.id, fileId));
        res.json({ success: true, message: 'File moved successfully' });
    }
    catch (error) {
        console.error('Error moving file:', error);
        res.status(500).json({ error: 'Failed to move file' });
    }
});
exports.default = router;
