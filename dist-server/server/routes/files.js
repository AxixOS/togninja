"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../shared/schema");
const multer_1 = __importDefault(require("multer"));
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = __importDefault(require("crypto"));
// removed unused imports
const router = (0, express_1.Router)();
// Initialize S3 client for Backblaze B2
const s3Client = new client_s3_1.S3Client({
    endpoint: process.env.AWS_S3_ENDPOINT || 'https://s3.eu-central-003.backblazeb2.com',
    region: process.env.AWS_REGION || 'eu-central-003',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
// Helper to build public B2 URL with proper URL encoding for spaces and special chars
const buildB2Url = (key) => {
    const bucket = process.env.AWS_S3_BUCKET || '';
    const endpoint = process.env.AWS_S3_ENDPOINT || '';
    // URL encode the key path, preserving slashes
    const encodedKey = key.split('/').map(part => encodeURIComponent(part)).join('/');
    if (endpoint.includes('backblazeb2.com')) {
        return `https://${bucket}.${endpoint.replace('https://', '').replace(/\/$/, '')}/${encodedKey}`;
    }
    return `${endpoint.replace(/\/$/, '')}/${bucket}/${encodedKey}`;
};
// Debug route to test router is mounted
router.get('/test', (req, res) => {
    res.json({ message: 'Files router is working!' });
});
// Configure multer for file uploads (memory storage for B2 upload)
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});
// Serve uploaded files
router.get('/serve/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path_1.default.join(process.cwd(), 'uploads', filename);
        // Security: prevent directory traversal
        if (!filePath.startsWith(path_1.default.join(process.cwd(), 'uploads'))) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.sendFile(filePath);
    }
    catch (error) {
        console.error('Error serving file:', error);
        res.status(500).json({ error: 'Failed to serve file' });
    }
});
// GET /api/files/thumbnail/:id - Generate and serve low-res thumbnail from B2
router.get('/thumbnail/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        // Fetch file from database
        const [file] = await db_1.db.select().from(schema_1.digitalFiles).where((0, drizzle_orm_1.eq)(schema_1.digitalFiles.id, fileId));
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        const folderName = file.folderName || 'Manual Website Images';
        const fileExt = path_1.default.extname(file.fileName).toLowerCase();
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
        }
        catch (error) {
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
            const thumbnailBuffer = await (0, sharp_1.default)(originalBuffer)
                .resize(200, 200, { fit: 'cover', position: 'center' })
                .webp({ quality: 60 })
                .toBuffer();
            res.setHeader('Content-Type', 'image/webp');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.send(thumbnailBuffer);
        }
        catch (error) {
            console.error(`Failed to fetch/generate thumbnail for ${fileId}:`, error);
            res.status(500).json({ error: 'Failed to generate thumbnail' });
        }
    }
    catch (error) {
        console.error('Error serving thumbnail:', error);
        res.status(500).json({ error: 'Failed to serve thumbnail' });
    }
});
// GET /api/files - Retrieve digital files with filters
router.get('/', async (req, res) => {
    try {
        const { folder_name, file_type, client_id, session_id, search_term, is_public, limit = '20' } = req.query;
        const baseQuery = db_1.db.select({
            id: schema_1.digitalFiles.id,
            folder_name: schema_1.digitalFiles.folderName,
            file_name: schema_1.digitalFiles.fileName,
            file_type: schema_1.digitalFiles.fileType,
            file_size: schema_1.digitalFiles.fileSize,
            client_id: schema_1.digitalFiles.clientId,
            session_id: schema_1.digitalFiles.sessionId,
            description: schema_1.digitalFiles.description,
            tags: schema_1.digitalFiles.tags,
            is_public: schema_1.digitalFiles.isPublic,
            uploaded_at: schema_1.digitalFiles.uploadedAt,
            created_at: schema_1.digitalFiles.createdAt,
            updated_at: schema_1.digitalFiles.updatedAt
        }).from(schema_1.digitalFiles);
        // Apply filters
        const conditions = [];
        if (folder_name) {
            conditions.push((0, drizzle_orm_1.ilike)(schema_1.digitalFiles.folderName, `%${folder_name}%`));
        }
        if (file_type) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.digitalFiles.fileType, file_type));
        }
        if (client_id) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.digitalFiles.clientId, client_id));
        }
        if (session_id) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.digitalFiles.sessionId, session_id));
        }
        if (search_term) {
            // Search in file name and description
            const searchCondition = (0, drizzle_orm_1.like)(schema_1.digitalFiles.fileName, `%${search_term}%`);
            conditions.push(searchCondition);
        }
        if (is_public !== undefined) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.digitalFiles.isPublic, is_public === 'true'));
        }
        const finalQuery = conditions.length > 0
            ? baseQuery.where((0, drizzle_orm_1.and)(...conditions))
            : baseQuery;
        const files = await finalQuery
            .orderBy((0, drizzle_orm_1.desc)(schema_1.digitalFiles.uploadedAt))
            .limit(parseInt(limit));
        // Add thumbnailUrl and mimeType for each file
        const filesWithThumbnails = files.map((file) => {
            const fileExt = path_1.default.extname(file.file_name).toLowerCase();
            const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
            const isImage = file.file_type === 'image' || imageExts.includes(fileExt);
            // Build B2 URLs for thumbnails (assuming they were generated during upload)
            const folderName = file.folder_name || 'Manual Website Images';
            const thumbnailKey = `${folderName}/${file.id}_thumb.webp`;
            const originalKey = `${folderName}/${file.id}${fileExt}`;
            // Generate low-res thumbnail URL using B2 or proxy endpoint
            let thumbnailUrl;
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
    }
    catch (error) {
        console.error('Failed to fetch digital files:', error);
        res.status(500).json({ error: 'Failed to fetch digital files' });
    }
});
// POST /api/files - Upload new file
router.post('/', async (req, res) => {
    try {
        const { folder_name, file_name, file_type, file_size, client_id, session_id, description = '', tags = [], is_public = false } = req.body;
        // Validate required fields
        if (!folder_name || !file_name || !file_type || !file_size) {
            return res.status(400).json({
                error: 'Missing required fields: folder_name, file_name, file_type, file_size'
            });
        }
        const fileId = crypto_1.default.randomUUID();
        const [newFile] = await db_1.db.insert(schema_1.digitalFiles).values({
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
    }
    catch (error) {
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
        const adminToken = req.headers['x-admin-token'] || '';
        const expectedAdminToken = process.env.ADMIN_TOKEN || '';
        const isAuthenticated = userId || (expectedAdminToken && adminToken && adminToken === expectedAdminToken);
        if (!isAuthenticated) {
            return res.status(401).json({ error: 'Not authenticated', details: 'Authentication required to upload files' });
        }
        // Store file metadata in database
        const fileId = crypto_1.default.randomUUID();
        const fileType = req.file.mimetype.startsWith('image/') ? 'image' :
            req.file.mimetype.startsWith('video/') ? 'video' :
                req.file.mimetype === 'application/pdf' ? 'document' : 'other';
        const fileExt = path_1.default.extname(req.file.originalname);
        const folderName = req.body.folderName || 'Manual Website Images';
        const fileName = `${folderName}/${fileId}${fileExt}`;
        // Upload to Backblaze B2
        let processedBuffer = req.file.buffer;
        let processedMime = req.file.mimetype;
        // Optimize images
        if (req.file.mimetype.startsWith('image/')) {
            try {
                processedBuffer = await (0, sharp_1.default)(req.file.buffer)
                    .rotate()
                    .resize({ width: 1400, withoutEnlargement: true })
                    .webp({ quality: 75 })
                    .toBuffer();
                processedMime = 'image/webp';
            }
            catch (error) {
                console.warn('[FILE UPLOAD] Image optimization failed, using original:', error);
            }
        }
        // Upload to B2
        await s3Client.send(new client_s3_1.PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET || '',
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
        let thumbnailUrl;
        if (req.file.mimetype.startsWith('image/')) {
            try {
                const thumbBuffer = await (0, sharp_1.default)(req.file.buffer)
                    .resize(300, 300, { fit: 'cover', position: 'center' })
                    .webp({ quality: 80 })
                    .toBuffer();
                const thumbFileName = `${folderName}/${fileId}_thumb.webp`;
                await s3Client.send(new client_s3_1.PutObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET || '',
                    Key: thumbFileName,
                    Body: thumbBuffer,
                    ContentType: 'image/webp',
                }));
                thumbnailUrl = buildB2Url(thumbFileName);
                console.log(`✅ Generated thumbnail for ${req.file.originalname}`);
            }
            catch (error) {
                console.error('Failed to generate thumbnail:', error);
                thumbnailUrl = fileUrl;
            }
        }
        const [newFile] = await db_1.db.insert(schema_1.digitalFiles).values({
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
    }
    catch (error) {
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
        const [updatedFile] = await db_1.db
            .update(schema_1.digitalFiles)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(schema_1.digitalFiles.id, id))
            .returning();
        if (!updatedFile) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.json(updatedFile);
    }
    catch (error) {
        console.error('Failed to update file:', error);
        res.status(500).json({ error: 'Failed to update file' });
    }
});
// GET /api/files/:id/download - Download original file
router.get('/:id/download', async (req, res) => {
    try {
        const { id } = req.params;
        // Get file metadata from database
        const [file] = await db_1.db.select()
            .from(schema_1.digitalFiles)
            .where((0, drizzle_orm_1.eq)(schema_1.digitalFiles.id, id))
            .limit(1);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        // Construct original filename (not thumbnail)
        const fileExt = path_1.default.extname(file.fileName);
        const originalFilename = `${id}${fileExt}`;
        const downloadUrl = `/api/files/serve/${originalFilename}`;
        res.json({ downloadUrl });
    }
    catch (error) {
        console.error('Error getting download URL:', error);
        res.status(500).json({ error: 'Failed to get download URL' });
    }
});
// DELETE /api/files/:id - Delete file
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [deletedFile] = await db_1.db
            .delete(schema_1.digitalFiles)
            .where((0, drizzle_orm_1.eq)(schema_1.digitalFiles.id, id))
            .returning();
        if (!deletedFile) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.json({
            message: 'File deleted successfully',
            file: deletedFile
        });
    }
    catch (error) {
        console.error('Failed to delete file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});
// GET /api/files/usage - Get storage usage statistics
router.get('/usage', async (req, res) => {
    try {
        const userId = req.session?.userId;
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
                limitGB: '0'
            });
        }
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE_URL);
        // Check if user has a storage subscription
        const subscriptions = await sql `
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
                limitGB: '0'
            });
        }
        const subscription = subscriptions[0];
        // Get storage usage for this subscription
        const usage = await sql `
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
            limitGB: limitGB.toFixed(2)
        });
    }
    catch (error) {
        console.error('Failed to get storage usage:', error);
        res.status(500).json({ error: 'Failed to get storage usage' });
    }
});
// GET /api/files/folders - Get folders from photo_folders table
router.get('/folders', async (req, res) => {
    try {
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE_URL);
        // Get all folders from photo_folders table
        const folders = await sql `
      SELECT id, name, parent_id, created_at, updated_at
      FROM photo_folders
      ORDER BY name ASC
    `;
        // Return in format expected by frontend
        res.json(folders.map((folder) => ({
            id: String(folder.id),
            name: folder.name,
            parentId: folder.parent_id ? String(folder.parent_id) : null,
            createdAt: folder.created_at,
            updatedAt: folder.updated_at
        })));
    }
    catch (error) {
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
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE_URL);
        // Create folder ID from name
        const folderId = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        // Insert into photo_folders table
        const [folder] = await sql `
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
    }
    catch (error) {
        console.error('Failed to create folder:', error);
        res.status(500).json({ error: 'Failed to create folder' });
    }
});
exports.default = router;
