/**
 * File Upload and Management Routes
 * Handles file uploads, downloads, folders, and storage quota
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { eq, and, sql } from 'drizzle-orm';
import { db } from './db';
import {
  storageSubscriptions,
  storageUsage,
  archivedFolders,
  archivedFiles,
  InsertArchivedFolder,
  InsertArchivedFile,
} from '../shared/schema';
import { s3Service } from './services/s3-storage';
import { checkQuotaBeforeUpload, updateStorageUsage } from './utils/storage-quota';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
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
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

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
 * Middleware: Check storage quota before upload
 */
async function checkStorageQuotaMiddleware(req: Request, res: Response, next: Function) {
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
      return res.status(403).json({ error: 'No active storage subscription' });
    }

    const sub = subscription[0];
    const fileSize = req.file?.size || 0;

    // Use quota utility for validation
    const quotaCheck = await checkQuotaBeforeUpload(sub.id, fileSize);

    if (!quotaCheck.allowed) {
      return res.status(413).json({
        error: quotaCheck.reason,
        ...quotaCheck.details,
      });
    }

    // Attach subscription and quota details to request
    (req as any).subscription = sub;
    (req as any).quotaCheck = quotaCheck;

    next();
  } catch (error) {
    console.error('Error checking storage quota:', error);
    res.status(500).json({ error: 'Failed to check storage quota' });
  }
}

/**
 * Create a new folder
 * POST /api/files/folders
 */
router.post('/folders', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session!.userId;
    const { name, parentId } = req.body;

    // Get subscription
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
      return res.status(403).json({ error: 'No active storage subscription' });
    }

    // Create folder
    const folderData: InsertArchivedFolder = {
      subscriptionId: subscription[0].id,
      name,
      parentFolderId: parentId || null,
    };

    const [folder] = await db.insert(archivedFolders).values(folderData).returning();

    res.json(folder);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

/**
 * Get folder tree
 * GET /api/files/folders
 */
router.get('/folders', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session!.userId;

    // Get subscription
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
      return res.json([]);
    }

    // Get all folders for this subscription
    const folders = await db.select()
      .from(archivedFolders)
      .where(eq(archivedFolders.subscriptionId, subscription[0].id))
      .orderBy(archivedFolders.name);

    res.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

/**
 * Upload file
 * POST /api/files/upload
 */
router.post(
  '/upload',
  requireAuth,
  upload.single('file'),
  checkStorageQuotaMiddleware,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const userId = req.session!.userId;
      const { folderId } = req.body;
      const subscription = (req as any).subscription;
      const quotaCheck = (req as any).quotaCheck;

      // Upload to S3
      const uploadResult = await s3Service.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        subscription.id.toString(),
        folderId
      );

      // Save file metadata to database
      const fileData: InsertArchivedFile = {
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

      const [file] = await db.insert(archivedFiles).values(fileData).returning();

      // Update storage usage using utility
      await updateStorageUsage(subscription.id);

      res.json({
        file,
        usage: quotaCheck.details,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  }
);

/**
 * Get files in folder
 * GET /api/files?folderId=123
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session!.userId;
    const folderId = req.query.folderId ? parseInt(req.query.folderId as string) : null;

    // Get subscription
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
      return res.json([]);
    }

    // Get files
    const whereCondition = folderId
      ? and(
          eq(archivedFiles.subscriptionId, subscription[0].id),
          eq(archivedFiles.folderId, folderId)
        )
      : and(
          eq(archivedFiles.subscriptionId, subscription[0].id),
          eq(archivedFiles.folderId, null)
        );

    const files = await db.select()
      .from(archivedFiles)
      .where(whereCondition)
      .orderBy(archivedFiles.createdAt);

    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

/**
 * Get download URL for file
 * GET /api/files/:id/download
 */
router.get('/:id/download', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session!.userId;
    const fileId = parseInt(req.params.id);

    // Get file and verify ownership
    const files = await db.select({
      file: archivedFiles,
      subscription: storageSubscriptions,
    })
      .from(archivedFiles)
      .innerJoin(
        storageSubscriptions,
        eq(archivedFiles.subscriptionId, storageSubscriptions.id)
      )
      .where(
        and(
          eq(archivedFiles.id, fileId),
          eq(storageSubscriptions.userId, userId)
        )
      )
      .limit(1);

    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const { file } = files[0];

    // Generate presigned URL (valid for 1 hour)
    const downloadUrl = await s3Service.getPresignedDownloadUrl(file.s3Key, 3600);

    res.json({ downloadUrl });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

/**
 * Delete file
 * DELETE /api/files/:id
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session!.userId;
    const fileId = parseInt(req.params.id);

    // Get file and verify ownership
    const files = await db.select({
      file: archivedFiles,
      subscription: storageSubscriptions,
    })
      .from(archivedFiles)
      .innerJoin(
        storageSubscriptions,
        eq(archivedFiles.subscriptionId, storageSubscriptions.id)
      )
      .where(
        and(
          eq(archivedFiles.id, fileId),
          eq(storageSubscriptions.userId, userId)
        )
      )
      .limit(1);

    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const { file } = files[0];

    // Delete from S3
    await s3Service.deleteFile(file.s3Key);

    // Delete from database
    await db.delete(archivedFiles).where(eq(archivedFiles.id, fileId));

    // Update storage usage
    await db
      .update(storageUsage)
      .set({
        currentStorageBytes: sql`${storageUsage.currentStorageBytes} - ${file.fileSize}`,
        fileCount: sql`${storageUsage.fileCount} - 1`,
        lastCalculated: new Date(),
      })
      .where(eq(storageUsage.subscriptionId, file.subscriptionId));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

/**
 * Get storage usage stats
 * GET /api/files/usage
 */
router.get('/usage', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session!.userId;

    // Get subscription and usage
    const result = await db.select({
      subscription: storageSubscriptions,
      usage: storageUsage,
    })
      .from(storageSubscriptions)
      .leftJoin(
        storageUsage,
        eq(storageUsage.subscriptionId, storageSubscriptions.id)
      )
      .where(
        and(
          eq(storageSubscriptions.userId, userId),
          eq(storageSubscriptions.status, 'active')
        )
      )
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
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

/**
 * Move file to folder
 * PATCH /api/files/:id/move
 */
router.patch('/:id/move', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session!.userId;
    const fileId = parseInt(req.params.id);
    const { folderId } = req.body;

    // Get file and verify ownership
    const files = await db.select({
      file: archivedFiles,
      subscription: storageSubscriptions,
    })
      .from(archivedFiles)
      .innerJoin(
        storageSubscriptions,
        eq(archivedFiles.subscriptionId, storageSubscriptions.id)
      )
      .where(
        and(
          eq(archivedFiles.id, fileId),
          eq(storageSubscriptions.userId, userId)
        )
      )
      .limit(1);

    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    // If folderId is provided, verify folder exists and belongs to same subscription
    if (folderId) {
      const folder = await db.select()
        .from(archivedFolders)
        .where(
          and(
            eq(archivedFolders.id, folderId),
            eq(archivedFolders.subscriptionId, files[0].file.subscriptionId)
          )
        )
        .limit(1);

      if (!folder || folder.length === 0) {
        return res.status(404).json({ error: 'Folder not found' });
      }
    }

    // Update file's folder
    await db
      .update(archivedFiles)
      .set({ folderId: folderId || null })
      .where(eq(archivedFiles.id, fileId));

    res.json({ success: true, message: 'File moved successfully' });
  } catch (error) {
    console.error('Error moving file:', error);
    res.status(500).json({ error: 'Failed to move file' });
  }
});

export default router;
