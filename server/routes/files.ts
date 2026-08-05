import { Router } from 'express';
import { db } from '../db';
import { eq, desc, and, like, ilike } from 'drizzle-orm';
import { digitalFiles } from '../../shared/schema';
import multer from 'multer';
import sharp from 'sharp';
import { studioImageMetadata } from '../lib/imageMetadata';
import path from 'path';
import fs from 'fs';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { getS3Client, getS3Config, buildPublicUrl } from '../services/s3-storage';
// removed unused imports

const router = Router();

// S3 client + bucket/endpoint resolve from onboarding config (studio_integrations)
// then AWS_* env, via the shared config-aware helpers — so wizard-configured
// storage works, not just env.

// Build a browser-loadable public URL. Delegates to the shared, provider-aware helper so
// Supabase gets the public object path (/storage/v1/object/public/…) rather than the
// auth-only S3 endpoint (/storage/v1/s3/…), which a browser <img> can't load.
const buildB2Url = (key: string): string => {
  const cfg = getS3Config();
  return buildPublicUrl(cfg.bucket, cfg.endpoint, key);
};

// Debug route to test router is mounted
router.get('/test', (req, res) => {
  res.json({ message: 'Files router is working!' });
});

// Configure multer for file uploads (memory storage for B2 upload)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Serve uploaded files
router.get('/serve/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', filename);
    
    // Security: prevent directory traversal
    if (!filePath.startsWith(path.join(process.cwd(), 'uploads'))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// GET /api/files/thumbnail/:id - Generate and serve low-res thumbnail from B2
router.get('/thumbnail/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    // Fetch file from database
    const [file] = await db.select().from(digitalFiles).where(eq(digitalFiles.id, fileId));
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const folderName = file.folderName || 'Manual Website Images';
    const fileExt = path.extname(file.fileName).toLowerCase();
    
    // Try to fetch thumbnail from B2
    const thumbnailKey = `${folderName}/${fileId}_thumb.webp`;
    const thumbnailUrl = buildB2Url(thumbnailKey);
    
    try {
      // Fetch thumbnail from B2
      const response = await fetch(thumbnailUrl);
      
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        return res.send(buffer);
      }
    } catch (error) {
      console.log(`Thumbnail not found in B2 for ${fileId}, generating...`);
    }
    
    // If thumbnail doesn't exist, fetch original and generate low-res version
    const originalKey = `${folderName}/${fileId}${fileExt}`;
    const originalUrl = buildB2Url(originalKey);
    
    try {
      const response = await fetch(originalUrl);
      
      if (!response.ok) {
        return res.status(404).json({ error: 'Original file not found in B2' });
      }
      
      const originalBuffer = Buffer.from(await response.arrayBuffer());
      
      // Generate low-res thumbnail (200x200)
      const thumbnailBuffer = await sharp(originalBuffer)
        .resize(200, 200, { fit: 'cover', position: 'center' })
        .webp({ quality: 60 })
        .toBuffer();
      
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(thumbnailBuffer);
      
    } catch (error) {
      console.error(`Failed to fetch/generate thumbnail for ${fileId}:`, error);
      res.status(500).json({ error: 'Failed to generate thumbnail' });
    }
    
  } catch (error) {
    console.error('Error serving thumbnail:', error);
    res.status(500).json({ error: 'Failed to serve thumbnail' });
  }
});

// GET /api/files - Retrieve digital files with filters
router.get('/', async (req, res) => {
  try {
    const {
      folder_name,
      folderId,
      file_type,
      client_id,
      session_id,
      search_term,
      is_public,
      limit = '200'
    } = req.query;

    // Files store a folderName string, but the client sends the photo_folders id.
    // Resolve id → name so opening a folder actually lists ITS files.
    let resolvedFolderName: string | null = null;
    if (folderId) {
      try {
        const { neon } = await import('../db-compat.js');
        const sql = neon(process.env.DATABASE_URL!);
        const rows = await sql`SELECT name FROM photo_folders WHERE id = ${String(folderId)} LIMIT 1`;
        resolvedFolderName = rows[0]?.name || '__no_such_folder__';
      } catch { resolvedFolderName = null; }
    }

    const baseQuery = db.select({
      id: digitalFiles.id,
      folder_name: digitalFiles.folderName,
      file_name: digitalFiles.fileName,
      file_type: digitalFiles.fileType,
      file_size: digitalFiles.fileSize,
      client_id: digitalFiles.clientId,
      session_id: digitalFiles.sessionId,
      description: digitalFiles.description,
      tags: digitalFiles.tags,
      is_public: digitalFiles.isPublic,
      uploaded_at: digitalFiles.uploadedAt,
      created_at: digitalFiles.createdAt,
      updated_at: digitalFiles.updatedAt
    }).from(digitalFiles);

    // Apply filters
    const conditions = [];
    
    if (resolvedFolderName) {
      conditions.push(eq(digitalFiles.folderName, resolvedFolderName));
    } else if (folder_name) {
      conditions.push(ilike(digitalFiles.folderName, `%${folder_name}%`));
    }
    
    if (file_type) {
  conditions.push(eq(digitalFiles.fileType, file_type as any));
    }
    
    if (client_id) {
  conditions.push(eq(digitalFiles.clientId, client_id as string));
    }
    
    if (session_id) {
  conditions.push(eq(digitalFiles.sessionId, session_id as string));
    }
    
    if (search_term) {
      // Search in file name and description
  const searchCondition = like(digitalFiles.fileName, `%${search_term}%`);
      conditions.push(searchCondition);
    }
    
    if (is_public !== undefined) {
  conditions.push(eq(digitalFiles.isPublic, is_public === 'true'));
    }

    const finalQuery = conditions.length > 0
      ? baseQuery.where(and(...conditions))
      : baseQuery;
    const files = await finalQuery
      .orderBy(desc(digitalFiles.uploadedAt))
      .limit(parseInt(limit as string));

    // Add thumbnailUrl and mimeType for each file
    const filesWithThumbnails = files.map((file: any) => {
      const fileExt = path.extname(file.file_name).toLowerCase();
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
      const isImage = file.file_type === 'image' || imageExts.includes(fileExt);
      
      // Build B2 URLs for thumbnails (assuming they were generated during upload)
      const folderName = file.folder_name || 'Manual Website Images';
      const thumbnailKey = `${folderName}/${file.id}_thumb.webp`;
      const originalKey = `${folderName}/${file.id}${fileExt}`;
      
      // Generate low-res thumbnail URL using B2 or proxy endpoint
      let thumbnailUrl: string | undefined;
      if (isImage) {
        // Use thumbnail proxy endpoint that will fetch from B2 and resize on-the-fly
        thumbnailUrl = `/api/files/thumbnail/${file.id}`;
      }
      
      return {
        id: file.id,
        fileName: file.file_name,
        fileSize: file.file_size,
        mimeType: isImage ? 'image/' + fileExt.substring(1) : 'application/octet-stream',
        thumbnailUrl,
        createdAt: file.created_at,
      };
    });

    res.json(filesWithThumbnails);
  } catch (error) {
    console.error('Failed to fetch digital files:', error);
    res.status(500).json({ error: 'Failed to fetch digital files' });
  }
});

// POST /api/files - Upload new file
router.post('/', async (req, res) => {
  try {
    const {
      folder_name,
      file_name,
      file_type,
      file_size,
      client_id,
      session_id,
      description = '',
      tags = [],
      is_public = false
    } = req.body;

    // Validate required fields
    if (!folder_name || !file_name || !file_type || !file_size) {
      return res.status(400).json({ 
        error: 'Missing required fields: folder_name, file_name, file_type, file_size' 
      });
    }

    const fileId = crypto.randomUUID();
    
    const [newFile] = await db.insert(digitalFiles).values({
      id: fileId,
      folderName: folder_name,
      fileName: file_name,
      fileType: file_type,
      fileSize: file_size,
      clientId: client_id || null,
      sessionId: session_id || null,
      description,
      tags: JSON.stringify(tags),
      isPublic: is_public,
      uploadedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    res.status(201).json(newFile);
  } catch (error) {
    console.error('Failed to upload file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// POST /api/files/upload - Upload file with multipart/form-data
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check for session-based auth OR admin token header
    const userId = req.session?.userId;
    const adminToken = (req.headers['x-admin-token'] as string) || '';
    const expectedAdminToken = process.env.ADMIN_TOKEN || '';
    
    const isAuthenticated = userId || (expectedAdminToken && adminToken && adminToken === expectedAdminToken);
    
    if (!isAuthenticated) {
      return res.status(401).json({ error: 'Not authenticated', details: 'Authentication required to upload files' });
    }

    // Store file metadata in database
    const fileId = crypto.randomUUID();
    const fileType = req.file.mimetype.startsWith('image/') ? 'image' :
                     req.file.mimetype.startsWith('video/') ? 'video' :
                     req.file.mimetype === 'application/pdf' ? 'document' : 'other';
    
    const fileExt = path.extname(req.file.originalname);
    // The client sends folderId (photo_folders id); resolve it to the folder name
    // so the file is stored IN that folder (was defaulting everything to
    // "Manual Website Images", so folders always looked empty).
    let folderName = req.body.folderName;
    if (!folderName && req.body.folderId) {
      try {
        const { neon } = await import('../db-compat.js');
        const sql = neon(process.env.DATABASE_URL!);
        const rows = await sql`SELECT name FROM photo_folders WHERE id = ${String(req.body.folderId)} LIMIT 1`;
        folderName = rows[0]?.name || undefined;
      } catch { /* fall through to default */ }
    }
    folderName = folderName || 'Manual Website Images';
    const fileName = `${folderName}/${fileId}${fileExt}`;
    
    // Upload to Backblaze B2
    let processedBuffer = req.file.buffer;
    let processedMime = req.file.mimetype;
    
    // Optimize images
    if (req.file.mimetype.startsWith('image/')) {
      try {
        processedBuffer = await sharp(req.file.buffer)
          .rotate()
          .resize({ width: 1400, withoutEnlargement: true })
          .withMetadata(studioImageMetadata()) // preserve input metadata + stamp studio copyright
          .webp({ quality: 75 })
          .toBuffer();
        processedMime = 'image/webp';
      } catch (error) {
        console.warn('[FILE UPLOAD] Image optimization failed, using original:', error);
      }
    }
    
    // Upload to B2
    await getS3Client().send(new PutObjectCommand({
      Bucket: getS3Config().bucket,
      Key: fileName,
      Body: processedBuffer,
      ContentType: processedMime,
      Metadata: {
        originalName: req.file.originalname,
        uploadedBy: userId,
        folder: folderName,
      },
    }));
    
    const fileUrl = buildB2Url(fileName);
    
    // Generate thumbnail for images
    let thumbnailUrl: string | undefined;
    if (req.file.mimetype.startsWith('image/')) {
      try {
        const thumbBuffer = await sharp(req.file.buffer)
          .resize(300, 300, { fit: 'cover', position: 'center' })
          .webp({ quality: 80 })
          .toBuffer();
        
        const thumbFileName = `${folderName}/${fileId}_thumb.webp`;
        
        await getS3Client().send(new PutObjectCommand({
          Bucket: getS3Config().bucket,
          Key: thumbFileName,
          Body: thumbBuffer,
          ContentType: 'image/webp',
        }));
        
        thumbnailUrl = buildB2Url(thumbFileName);
        console.log(`✅ Generated thumbnail for ${req.file.originalname}`);
      } catch (error) {
        console.error('Failed to generate thumbnail:', error);
        thumbnailUrl = fileUrl;
      }
    }
    
    const [newFile] = await db.insert(digitalFiles).values({
      id: fileId,
      folderName: folderName,
      fileName: req.file.originalname,
      fileType: fileType,
      fileSize: req.file.size,
      clientId: null,
      sessionId: null,
      description: '',
      tags: JSON.stringify([]),
      isPublic: true,
      uploadedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    res.status(201).json({
      ...newFile,
      url: fileUrl,
      thumbnailUrl,
      mimeType: processedMime,
      message: 'File uploaded successfully to Backblaze B2'
    });
  } catch (error) {
    console.error('Failed to upload file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// PUT /api/files/:id - Update file metadata
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Remove ID from update data
    delete updateData.id;
    
    // Convert tags to JSON string if provided
    if (updateData.tags && Array.isArray(updateData.tags)) {
      updateData.tags = JSON.stringify(updateData.tags);
    }
    
    // Set updated timestamp
    updateData.updated_at = new Date();

    const [updatedFile] = await db
  .update(digitalFiles)
      .set(updateData)
  .where(eq(digitalFiles.id, id))
      .returning();

    if (!updatedFile) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(updatedFile);
  } catch (error) {
    console.error('Failed to update file:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// GET /api/files/:id/download - Download original file
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get file metadata from database
    const [file] = await db.select()
      .from(digitalFiles)
      .where(eq(digitalFiles.id, id))
      .limit(1);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Construct original filename (not thumbnail)
    const fileExt = path.extname(file.fileName);
    const originalFilename = `${id}${fileExt}`;
    const downloadUrl = `/api/files/serve/${originalFilename}`;
    
    res.json({ downloadUrl });
  } catch (error) {
    console.error('Error getting download URL:', error);
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

// DELETE /api/files/:id - Delete file
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [deletedFile] = await db
  .delete(digitalFiles)
  .where(eq(digitalFiles.id, id))
      .returning();

    if (!deletedFile) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ 
      message: 'File deleted successfully', 
      file: deletedFile 
    });
  } catch (error) {
    console.error('Failed to delete file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// GET /api/files/usage - Get storage usage statistics
router.get('/usage', async (req, res) => {
  try {
    const userId = req.session?.userId;
    // Paid storage tiers require Stripe subscription prices. On a self-hosted
    // single-studio install these aren't set, so the UI hides the paid plans.
    const billingEnabled = !!(process.env.STRIPE_PRICE_STARTER || process.env.STRIPE_PRICE_PROFESSIONAL || process.env.STRIPE_PRICE_ENTERPRISE);

    console.log('📊 Usage check request:', {
      userId, 
      hasSession: !!req.session,
      sessionKeys: req.session ? Object.keys(req.session) : []
    });
    
    if (!userId) {
      console.log('⚠️ No userId in session, returning no subscription');
      return res.json({
        hasSubscription: false,
        currentUsage: 0,
        storageLimit: 0,
        fileCount: 0,
        percentUsed: '0',
        usageGB: '0',
        limitGB: '0',
        billingEnabled
      });
    }
    
    const { neon } = await import('../db-compat.js');
    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if user has a storage subscription
    const subscriptions = await sql`
      SELECT id, tier, status, storage_limit, current_period_end
      FROM storage_subscriptions
      WHERE user_id = ${userId}
      AND status = 'active'
      LIMIT 1
    `;
    
    console.log('📊 Subscription query result:', { 
      userId, 
      count: subscriptions.length,
      subscription: subscriptions.length > 0 ? subscriptions[0] : null 
    });
    
    if (subscriptions.length === 0) {
      console.log('⚠️ No active subscription found for user:', userId);
      return res.json({
        hasSubscription: false,
        currentUsage: 0,
        storageLimit: 0,
        fileCount: 0,
        percentUsed: '0',
        usageGB: '0',
        limitGB: '0',
        billingEnabled
      });
    }
    
    const subscription = subscriptions[0];
    
    // Get storage usage for this subscription
    const usage = await sql`
      SELECT current_storage_bytes, file_count
      FROM storage_usage
      WHERE subscription_id = ${subscription.id}
      LIMIT 1
    `;
    
    const currentBytes = usage.length > 0 ? Number(usage[0].current_storage_bytes) : 0;
    const fileCount = usage.length > 0 ? Number(usage[0].file_count) : 0;
    const limitBytes = Number(subscription.storage_limit);
    
    const currentGB = currentBytes / (1024 * 1024 * 1024);
    const limitGB = limitBytes / (1024 * 1024 * 1024);
    const percentUsed = limitBytes > 0 ? (currentBytes / limitBytes) * 100 : 0;
    
    res.json({
      hasSubscription: true,
      tier: subscription.tier,
      status: subscription.status,
      currentUsage: currentBytes,
      storageLimit: limitBytes,
      fileCount: fileCount,
      percentUsed: percentUsed.toFixed(2),
      usageGB: currentGB.toFixed(2),
      limitGB: limitGB.toFixed(2),
      billingEnabled
    });
  } catch (error) {
    console.error('Failed to get storage usage:', error);
    res.status(500).json({ error: 'Failed to get storage usage' });
  }
});

// GET /api/files/folders - Get folders from photo_folders table
router.get('/folders', async (req, res) => {
  try {
    const { neon } = await import('../db-compat.js');
    const sql = neon(process.env.DATABASE_URL!);
    
    // Get all folders from photo_folders table
    const folders = await sql`
      SELECT id, name, parent_id, created_at, updated_at
      FROM photo_folders
      ORDER BY name ASC
    `;

    // Return in format expected by frontend
    res.json(folders.map((folder: any) => ({
      id: String(folder.id),
      name: folder.name,
      parentId: folder.parent_id ? String(folder.parent_id) : null,
      createdAt: folder.created_at,
      updatedAt: folder.updated_at
    })));
  } catch (error) {
    console.error('Failed to get folders:', error);
    res.status(500).json({ error: 'Failed to get folder organization' });
  }
});

// POST /api/files/folders - Create a new folder
router.post('/folders', async (req, res) => {
  try {
    const { name, parentId } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const { neon } = await import('../db-compat.js');
    const sql = neon(process.env.DATABASE_URL!);
    
    // Create folder ID from name
    const folderId = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Insert into photo_folders table
    const [folder] = await sql`
      INSERT INTO photo_folders (id, name, parent_id)
      VALUES (${folderId}, ${name.trim()}, ${parentId || null})
      ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
      RETURNING id, name, parent_id, created_at, updated_at
    `;

    res.json({
      success: true,
      message: 'Folder created successfully',
      folder: {
        id: String(folder.id),
        name: folder.name,
        parentId: folder.parent_id ? String(folder.parent_id) : null,
        createdAt: folder.created_at,
        updatedAt: folder.updated_at
      }
    });
  } catch (error) {
    console.error('Failed to create folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

export default router;