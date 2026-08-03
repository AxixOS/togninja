import { Router, type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { randomUUID } from 'crypto';
import { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { pool } from '../db';
import { getS3Client, getS3Config, buildPublicUrl } from '../services/s3-storage';

const router = Router();

function getConfiguredApiKey(): string {
  return (process.env.SHOOTCLEANER_API_KEY || '').trim();
}

function getPresentedApiKey(req: Request): string {
  const headerKey = (req.headers['x-api-key'] as string) || '';
  if (headerKey) {
    return headerKey.trim();
  }

  const authHeader = (req.headers.authorization || '').trim();
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return '';
}

function requireShootCleanerApiKey(req: Request, res: Response, next: NextFunction) {
  const expectedApiKey = getConfiguredApiKey();
  if (!expectedApiKey) {
    return res.status(503).json({
      error: 'ShootCleaner integration is not configured',
      code: 'shootcleaner_not_configured',
    });
  }

  const presentedApiKey = getPresentedApiKey(req);
  if (!presentedApiKey || presentedApiKey !== expectedApiKey) {
    return res.status(401).json({
      error: 'Invalid API key',
      code: 'invalid_api_key',
    });
  }

  next();
}

function getBaseUrl(req: Request): string {
  const forwardedProto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = req.get('host') || 'newagefotografie.com';
  return `${forwardedProto}://${host}`;
}

function buildB2Url(key: string): string | null {
  const bucket = (process.env.AWS_S3_BUCKET || '').trim();
  const endpoint = (process.env.AWS_S3_ENDPOINT || '').trim();
  if (!bucket || !endpoint) {
    return null;
  }

  const encodedKey = key.split('/').map((part) => encodeURIComponent(part)).join('/');
  if (endpoint.includes('backblazeb2.com')) {
    return `https://${bucket}.${endpoint.replace('https://', '').replace(/\/$/, '')}/${encodedKey}`;
  }

  return `${endpoint.replace(/\/$/, '')}/${bucket}/${encodedKey}`;
}

// ---------------------------------------------------------------------------
// Write API (Export to Galleries / Export to Cloud)
// ---------------------------------------------------------------------------

const READ_SCOPES = ['galleries:read', 'gallery-images:read', 'digital-files:read', 'clients:read', 'questionnaires:read', 'studio:read'];
const WRITE_SCOPES = ['galleries:write', 'gallery-images:write', 'digital-files:write'];
const ALL_SCOPES = [...READ_SCOPES, ...WRITE_SCOPES];

const MAX_FILES_PER_CALL = 100;
const MAX_FILE_BYTES = 200 * 1024 * 1024; // 200 MB
const PRESIGN_TTL_SECONDS = 15 * 60; // 15 minutes
const DEFAULT_EXPORT_FOLDER = 'ShootCleaner Exports';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/tiff', 'image/heic', 'image/heif', 'image/avif',
]);
const ALLOWED_FILE_TYPES = new Set([
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf', 'application/zip', 'video/mp4', 'video/quicktime',
]);

// Write endpoints require the key AND the matching *:write scope. v1 issues a
// single key that holds every scope; structured so a separate write-scoped key
// can be added later without changing the routes.
function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const expectedApiKey = getConfiguredApiKey();
    if (!expectedApiKey) {
      return res.status(503).json({ error: 'ShootCleaner integration is not configured', code: 'shootcleaner_not_configured' });
    }
    const presentedApiKey = getPresentedApiKey(req);
    if (!presentedApiKey || presentedApiKey !== expectedApiKey) {
      return res.status(401).json({ error: 'Invalid API key', code: 'invalid_api_key' });
    }
    if (!ALL_SCOPES.includes(scope)) {
      return res.status(403).json({ error: `Missing required scope: ${scope}`, code: 'insufficient_scope' });
    }
    next();
  };
}

// --- Idempotency: map a ShootCleaner externalRef -> the entity it created -----
let exportSchemaReady: Promise<void> | null = null;
function ensureExportSchema(): Promise<void> {
  if (!exportSchemaReady) {
    exportSchemaReady = pool
      .query(`
        CREATE TABLE IF NOT EXISTS shootcleaner_exports (
          external_ref text PRIMARY KEY,
          entity_type  text NOT NULL,
          entity_id    text NOT NULL,
          created_at   timestamptz DEFAULT now()
        )
      `)
      .then(() => undefined)
      .catch((err) => { exportSchemaReady = null; throw err; });
  }
  return exportSchemaReady;
}

async function lookupExternalRef(ref: string): Promise<{ entityType: string; entityId: string } | null> {
  if (!ref) return null;
  await ensureExportSchema();
  const result = await pool.query('SELECT entity_type, entity_id FROM shootcleaner_exports WHERE external_ref = $1 LIMIT 1', [ref]);
  const row = result.rows[0];
  return row ? { entityType: row.entity_type, entityId: row.entity_id } : null;
}

async function recordExternalRef(ref: string, entityType: string, entityId: string): Promise<void> {
  if (!ref) return;
  await ensureExportSchema();
  await pool.query(
    'INSERT INTO shootcleaner_exports (external_ref, entity_type, entity_id) VALUES ($1, $2, $3) ON CONFLICT (external_ref) DO NOTHING',
    [ref, entityType, entityId],
  );
}

// --- Helpers ------------------------------------------------------------------
function sanitizeFilename(name: string): string {
  return String(name || '').replace(/[^a-zA-Z0-9.\-]/g, '_');
}

function slugify(input: string): string {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function ensureUniqueSlug(base: string): Promise<string> {
  const seed = base || 'gallery';
  let candidate = seed;
  let n = 1;
  // Bounded in practice; the slug column is unique.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const r = await pool.query('SELECT 1 FROM galleries WHERE slug = $1 LIMIT 1', [candidate]);
    if (!r.rows[0]) return candidate;
    n += 1;
    candidate = `${seed}-${n}`;
  }
}

type FileValidationError = { status: number; error: string; code: string };
function validateFileList(files: any, allowed: Set<string>): FileValidationError | null {
  if (!Array.isArray(files) || files.length === 0) {
    return { status: 400, error: 'files[] is required', code: 'invalid_request' };
  }
  if (files.length > MAX_FILES_PER_CALL) {
    return { status: 400, error: `Maximum ${MAX_FILES_PER_CALL} files per call`, code: 'too_many_files' };
  }
  for (const f of files) {
    const contentType = String(f?.contentType || '').toLowerCase();
    if (!contentType || !allowed.has(contentType)) {
      return { status: 400, error: `Unsupported content type: ${f?.contentType ?? 'none'}`, code: 'invalid_content_type' };
    }
    const size = Number(f?.sizeBytes ?? f?.fileSize ?? 0);
    if (size && size > MAX_FILE_BYTES) {
      return { status: 413, error: `File exceeds the ${MAX_FILE_BYTES}-byte limit`, code: 'file_too_large' };
    }
  }
  return null;
}

async function presignPut(key: string, contentType: string): Promise<string> {
  const { bucket } = getS3Config();
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(getS3Client(), command, { expiresIn: PRESIGN_TTL_SECONDS });
}

function presignExpiry(): string {
  return new Date(Date.now() + PRESIGN_TTL_SECONDS * 1000).toISOString();
}

async function clientExists(clientId: string): Promise<boolean> {
  const r = await pool.query('SELECT 1 FROM crm_clients WHERE id::text = $1 LIMIT 1', [clientId]);
  return !!r.rows[0];
}

async function fetchGalleryById(id: string, req: Request): Promise<any | null> {
  const r = await pool.query(
    `
      SELECT
        g.id, g.title, g.slug, g.description, g.cover_image,
        g.is_public, g.is_password_protected, g.client_id,
        g.created_at, g.updated_at,
        COALESCE(COUNT(gi.id), 0)::int AS image_count
      FROM galleries g
      LEFT JOIN gallery_images gi ON gi.gallery_id = g.id
      WHERE g.id = $1
      GROUP BY g.id
    `,
    [id],
  );
  const row = r.rows[0];
  if (!row) return null;
  const baseUrl = getBaseUrl(req);
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    coverImageUrl: row.cover_image,
    isPublic: row.is_public,
    isPasswordProtected: row.is_password_protected,
    clientId: row.client_id,
    imageCount: row.image_count,
    galleryUrl: `${baseUrl}/gallery/${row.slug}`,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchGalleryImageById(imageId: string): Promise<any | null> {
  const r = await pool.query(
    `
      SELECT
        gi.id, gi.gallery_id AS "galleryId",
        g.slug AS "gallerySlug", g.title AS "galleryTitle",
        gi.filename, gi.url, gi.title, gi.description,
        gi.sort_order AS "sortOrder", gi.size_bytes AS "sizeBytes",
        gi.content_type AS "contentType", gi.created_at AS "createdAt"
      FROM gallery_images gi
      INNER JOIN galleries g ON g.id = gi.gallery_id
      WHERE gi.id = $1
    `,
    [imageId],
  );
  return r.rows[0] || null;
}

function mapDigitalFileRow(row: any, req: Request): any {
  const baseUrl = getBaseUrl(req);
  const fileExt = path.extname(row.file_name || '');
  const folder = row.folder_name || DEFAULT_EXPORT_FOLDER;
  const storageKey = `${folder}/${row.id}${fileExt}`;
  let parsedTags: any[] = [];
  if (typeof row.tags === 'string' && row.tags.trim()) {
    try { parsedTags = JSON.parse(row.tags); } catch { parsedTags = []; }
  }
  return {
    id: row.id,
    folderName: row.folder_name,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    clientId: row.client_id,
    sessionId: row.session_id,
    description: row.description,
    tags: parsedTags,
    isPublic: row.is_public,
    uploadedAt: row.uploaded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fileUrl: buildB2Url(storageKey),
    thumbnailUrl: `${baseUrl}/api/files/thumbnail/${row.id}`,
  };
}

async function fetchDigitalFileById(id: string, req: Request): Promise<any | null> {
  const r = await pool.query('SELECT * FROM digital_files WHERE id = $1 LIMIT 1', [id]);
  const row = r.rows[0];
  return row ? mapDigitalFileRow(row, req) : null;
}

router.get('/health', requireShootCleanerApiKey, (_req, res) => {
  res.json({
    ok: true,
    service: 'shootcleaner',
    scopes: ALL_SCOPES,
  });
});

router.get('/galleries', requireShootCleanerApiKey, async (req, res) => {
  try {
    const limitRaw = Number.parseInt(String(req.query.limit || '100'), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 100;
    const search = String(req.query.search || '').trim();
    const clientId = String(req.query.clientId || '').trim();
    const publicOnly = String(req.query.publicOnly || '').trim().toLowerCase();

    const where: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(g.title ILIKE $${params.length} OR g.slug ILIKE $${params.length} OR COALESCE(g.description, '') ILIKE $${params.length})`);
    }

    if (clientId) {
      params.push(clientId);
      where.push(`g.client_id = $${params.length}`);
    }

    if (publicOnly === 'true') {
      where.push('g.is_public = true');
    } else if (publicOnly === 'false') {
      where.push('g.is_public = false');
    }

    params.push(limit);

    const result = await pool.query(
      `
        SELECT
          g.id,
          g.title,
          g.slug,
          g.description,
          g.cover_image,
          g.is_public,
          g.is_password_protected,
          g.client_id,
          g.created_at,
          g.updated_at,
          COALESCE(COUNT(gi.id), 0)::int AS image_count
        FROM galleries g
        LEFT JOIN gallery_images gi ON gi.gallery_id = g.id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        GROUP BY g.id
        ORDER BY g.created_at DESC
        LIMIT $${params.length}
      `,
      params,
    );

    const baseUrl = getBaseUrl(req);
    res.json({
      data: result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.description,
        coverImageUrl: row.cover_image,
        isPublic: row.is_public,
        isPasswordProtected: row.is_password_protected,
        clientId: row.client_id,
        imageCount: row.image_count,
        galleryUrl: `${baseUrl}/gallery/${row.slug}`,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    console.error('[shootcleaner] Failed to list galleries:', error);
    res.status(500).json({ error: 'Failed to fetch galleries' });
  }
});

router.get('/galleries/:id/images', requireShootCleanerApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `
        SELECT
          gi.id,
          gi.gallery_id,
          gi.filename,
          gi.url,
          gi.title,
          gi.description,
          gi.sort_order,
          gi.size_bytes,
          gi.content_type,
          gi.created_at,
          g.slug AS gallery_slug,
          g.title AS gallery_title
        FROM gallery_images gi
        INNER JOIN galleries g ON g.id = gi.gallery_id
        WHERE gi.gallery_id = $1
        ORDER BY gi.sort_order ASC, gi.created_at ASC
      `,
      [id],
    );

    res.json({
      data: result.rows.map((row: any) => ({
        id: row.id,
        galleryId: row.gallery_id,
        gallerySlug: row.gallery_slug,
        galleryTitle: row.gallery_title,
        filename: row.filename,
        url: row.url,
        title: row.title,
        description: row.description,
        sortOrder: row.sort_order,
        sizeBytes: row.size_bytes,
        contentType: row.content_type,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('[shootcleaner] Failed to fetch gallery images:', error);
    res.status(500).json({ error: 'Failed to fetch gallery images' });
  }
});

router.get('/digital-files', requireShootCleanerApiKey, async (req, res) => {
  try {
    const limitRaw = Number.parseInt(String(req.query.limit || '100'), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 100;
    const search = String(req.query.search || '').trim();
    const folderName = String(req.query.folderName || '').trim();
    const fileType = String(req.query.fileType || '').trim();
    const clientId = String(req.query.clientId || '').trim();
    const sessionId = String(req.query.sessionId || '').trim();
    const publicOnly = String(req.query.publicOnly || '').trim().toLowerCase();

    const where: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(df.file_name ILIKE $${params.length} OR COALESCE(df.description, '') ILIKE $${params.length})`);
    }

    if (folderName) {
      params.push(`%${folderName}%`);
      where.push(`COALESCE(df.folder_name, '') ILIKE $${params.length}`);
    }

    if (fileType) {
      params.push(fileType);
      where.push(`df.file_type = $${params.length}`);
    }

    if (clientId) {
      params.push(clientId);
      where.push(`df.client_id = $${params.length}`);
    }

    if (sessionId) {
      params.push(sessionId);
      where.push(`df.session_id = $${params.length}`);
    }

    if (publicOnly === 'true') {
      where.push('df.is_public = true');
    } else if (publicOnly === 'false') {
      where.push('df.is_public = false');
    }

    params.push(limit);

    const result = await pool.query(
      `
        SELECT
          df.id,
          df.folder_name,
          df.file_name,
          df.file_type,
          df.file_size,
          df.client_id,
          df.session_id,
          df.description,
          df.tags,
          df.is_public,
          df.uploaded_at,
          df.created_at,
          df.updated_at
        FROM digital_files df
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY df.uploaded_at DESC NULLS LAST, df.created_at DESC
        LIMIT $${params.length}
      `,
      params,
    );

    const baseUrl = getBaseUrl(req);
    res.json({
      data: result.rows.map((row: any) => {
        const fileExt = path.extname(row.file_name || '');
        const folder = row.folder_name || 'Manual Website Images';
        const storageKey = `${folder}/${row.id}${fileExt}`;
        const fileUrl = buildB2Url(storageKey);

        let parsedTags: any[] = [];
        if (typeof row.tags === 'string' && row.tags.trim()) {
          try {
            parsedTags = JSON.parse(row.tags);
          } catch {
            parsedTags = [];
          }
        }

        return {
          id: row.id,
          folderName: row.folder_name,
          fileName: row.file_name,
          fileType: row.file_type,
          fileSize: row.file_size,
          clientId: row.client_id,
          sessionId: row.session_id,
          description: row.description,
          tags: parsedTags,
          isPublic: row.is_public,
          uploadedAt: row.uploaded_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          fileUrl,
          thumbnailUrl: `${baseUrl}/api/files/thumbnail/${row.id}`,
        };
      }),
    });
  } catch (error) {
    console.error('[shootcleaner] Failed to list digital files:', error);
    res.status(500).json({ error: 'Failed to fetch digital files' });
  }
});

// ---------------------------------------------------------------------------
// Export to Galleries
// ---------------------------------------------------------------------------

// Create (or idempotently reuse) a gallery.
router.post('/galleries', requireScope('galleries:write'), async (req, res) => {
  try {
    const body = req.body || {};
    const title = String(body.title || '').trim();
    if (!title) {
      return res.status(400).json({ error: 'title is required', code: 'invalid_request' });
    }

    const externalRef = String(body.externalRef || '').trim();
    if (externalRef) {
      const existing = await lookupExternalRef(externalRef);
      if (existing && existing.entityType === 'gallery') {
        const found = await fetchGalleryById(existing.entityId, req);
        if (found) return res.json({ data: found }); // idempotent re-export
      }
    }

    const clientId = body.clientId != null && String(body.clientId).trim() ? String(body.clientId).trim() : null;
    if (clientId && !(await clientExists(clientId))) {
      return res.status(400).json({ error: 'clientId not found', code: 'invalid_client_id' });
    }

    const isPasswordProtected = body.isPasswordProtected === true;
    const password = isPasswordProtected && body.password ? String(body.password) : null;
    const isPublic = body.isPublic === true; // default false for exports
    const description = body.description != null ? String(body.description) : null;
    const slug = await ensureUniqueSlug(slugify(String(body.slug || title)));

    const insert = await pool.query(
      `
        INSERT INTO galleries (title, slug, description, is_public, is_password_protected, password, client_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id
      `,
      [title, slug, description, isPublic, isPasswordProtected, password, clientId],
    );
    const galleryId = insert.rows[0].id;
    if (externalRef) await recordExternalRef(externalRef, 'gallery', galleryId);

    const created = await fetchGalleryById(galleryId, req);
    return res.status(201).json({ data: created });
  } catch (error) {
    console.error('[shootcleaner] Failed to create gallery:', error);
    return res.status(500).json({ error: 'Failed to create gallery', code: 'gallery_create_failed' });
  }
});

// Request presigned PUT URLs for gallery images (bytes go straight to B2).
router.post('/galleries/:id/images/presign', requireScope('gallery-images:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const g = await pool.query('SELECT id FROM galleries WHERE id = $1 LIMIT 1', [id]);
    if (!g.rows[0]) return res.status(404).json({ error: 'Gallery not found', code: 'gallery_not_found' });

    const files = req.body?.files;
    const validationError = validateFileList(files, ALLOWED_IMAGE_TYPES);
    if (validationError) {
      return res.status(validationError.status).json({ error: validationError.error, code: validationError.code });
    }

    const { isConfigured } = getS3Config();
    if (!isConfigured) return res.status(503).json({ error: 'Storage is not configured', code: 'storage_not_configured' });

    const data: any[] = [];
    for (const f of files) {
      const rawName = String(f.filename || 'image');
      const ext = path.extname(rawName) || '.jpg';
      const base = sanitizeFilename(path.basename(rawName, ext)).slice(0, 80) || 'image';
      const fileKey = `galleries/${id}/${base}-${randomUUID().slice(0, 8)}${ext}`;
      const uploadUrl = await presignPut(fileKey, f.contentType);
      data.push({
        filename: f.filename,
        fileKey,
        uploadUrl,
        method: 'PUT',
        headers: { 'Content-Type': f.contentType },
        expiresAt: presignExpiry(),
      });
    }
    return res.json({ data });
  } catch (error) {
    console.error('[shootcleaner] Failed to presign gallery images:', error);
    return res.status(500).json({ error: 'Failed to create upload URLs', code: 'presign_failed' });
  }
});

// Register uploaded gallery images after the client PUTs the bytes to B2.
router.post('/galleries/:id/images/commit', requireScope('gallery-images:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const gq = await pool.query('SELECT id, slug, title FROM galleries WHERE id = $1 LIMIT 1', [id]);
    const gallery = gq.rows[0];
    if (!gallery) return res.status(404).json({ error: 'Gallery not found', code: 'gallery_not_found' });

    const images = req.body?.images;
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'images[] is required', code: 'invalid_request' });
    }
    if (images.length > MAX_FILES_PER_CALL) {
      return res.status(400).json({ error: `Maximum ${MAX_FILES_PER_CALL} images per call`, code: 'too_many_files' });
    }

    const { bucket, endpoint } = getS3Config();
    const s3 = getS3Client();
    const data: any[] = [];

    for (const img of images) {
      const fileKey = String(img?.fileKey || '').trim();
      if (!fileKey) return res.status(400).json({ error: 'fileKey is required for each image', code: 'invalid_request' });

      const externalRef = String(img?.externalRef || '').trim();
      if (externalRef) {
        const existing = await lookupExternalRef(externalRef);
        if (existing && existing.entityType === 'gallery_image') {
          const found = await fetchGalleryImageById(existing.entityId);
          if (found) { data.push(found); continue; } // idempotent
        }
      }

      // Confirm the client actually uploaded the object before writing the row.
      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: fileKey }));
      } catch {
        return res.status(409).json({ error: `Uploaded object not found in storage: ${fileKey}`, code: 'object_missing' });
      }

      const url = buildPublicUrl(bucket, endpoint, fileKey);
      const filename = sanitizeFilename(String(img.filename || path.basename(fileKey)));
      const sortOrder = Number.isFinite(Number(img.sortOrder)) ? Number(img.sortOrder) : 0;
      const sizeBytes = Number(img.sizeBytes || 0);
      const metadata = JSON.stringify({ source: 'shootcleaner', fileKey, externalRef: externalRef || null });

      const ins = await pool.query(
        `
          INSERT INTO gallery_images
            (gallery_id, filename, url, title, description, sort_order, size_bytes, content_type, metadata, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW())
          RETURNING id
        `,
        [id, filename, url, img.title ?? null, img.description ?? null, sortOrder, sizeBytes, img.contentType ?? null, metadata],
      );
      const newId = ins.rows[0].id;
      if (externalRef) await recordExternalRef(externalRef, 'gallery_image', newId);
      const created = await fetchGalleryImageById(newId);
      if (created) data.push(created);
    }

    return res.status(201).json({ data });
  } catch (error) {
    console.error('[shootcleaner] Failed to commit gallery images:', error);
    return res.status(500).json({ error: 'Failed to commit images', code: 'commit_failed' });
  }
});

// ---------------------------------------------------------------------------
// Export to Cloud (digital files)
// ---------------------------------------------------------------------------

router.post('/digital-files/presign', requireScope('digital-files:write'), async (req, res) => {
  try {
    const files = req.body?.files;
    // Normalize digital-file fields (fileName/fileSize) onto the validator's shape.
    const normalized = Array.isArray(files)
      ? files.map((f: any) => ({ contentType: f?.contentType, sizeBytes: f?.fileSize ?? f?.sizeBytes }))
      : files;
    const validationError = validateFileList(normalized, ALLOWED_FILE_TYPES);
    if (validationError) {
      return res.status(validationError.status).json({ error: validationError.error, code: validationError.code });
    }

    const { isConfigured } = getS3Config();
    if (!isConfigured) return res.status(503).json({ error: 'Storage is not configured', code: 'storage_not_configured' });

    const folderName = String(req.body?.folderName || '').trim() || DEFAULT_EXPORT_FOLDER;
    const data: any[] = [];
    for (const f of files) {
      const fileName = String(f.fileName || f.filename || 'file');
      const ext = path.extname(fileName) || '';
      const fileId = randomUUID();
      const fileKey = `${folderName}/${fileId}${ext}`;
      const uploadUrl = await presignPut(fileKey, f.contentType);
      data.push({
        fileName,
        fileKey,
        uploadUrl,
        method: 'PUT',
        headers: { 'Content-Type': f.contentType },
        expiresAt: presignExpiry(),
      });
    }
    return res.json({ data });
  } catch (error) {
    console.error('[shootcleaner] Failed to presign digital files:', error);
    return res.status(500).json({ error: 'Failed to create upload URLs', code: 'presign_failed' });
  }
});

router.post('/digital-files/commit', requireScope('digital-files:write'), async (req, res) => {
  try {
    const files = req.body?.files;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'files[] is required', code: 'invalid_request' });
    }
    if (files.length > MAX_FILES_PER_CALL) {
      return res.status(400).json({ error: `Maximum ${MAX_FILES_PER_CALL} files per call`, code: 'too_many_files' });
    }

    const { bucket } = getS3Config();
    const s3 = getS3Client();
    const data: any[] = [];

    for (const f of files) {
      const fileKey = String(f?.fileKey || '').trim();
      if (!fileKey) return res.status(400).json({ error: 'fileKey is required for each file', code: 'invalid_request' });

      const externalRef = String(f?.externalRef || '').trim();
      if (externalRef) {
        const existing = await lookupExternalRef(externalRef);
        if (existing && existing.entityType === 'digital_file') {
          const found = await fetchDigitalFileById(existing.entityId, req);
          if (found) { data.push(found); continue; }
        }
      }

      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: fileKey }));
      } catch {
        return res.status(409).json({ error: `Uploaded object not found in storage: ${fileKey}`, code: 'object_missing' });
      }

      const ext = path.extname(fileKey);
      const fileId = path.basename(fileKey, ext); // storage-key basename == digital_files.id
      const folderName = path.dirname(fileKey) || DEFAULT_EXPORT_FOLDER;
      const fileName = String(f.fileName || path.basename(fileKey));
      const contentType = String(f.contentType || '');
      const fileType = String(
        f.fileType ||
        (contentType.startsWith('image/') ? 'image'
          : contentType.startsWith('video/') ? 'video'
            : contentType === 'application/pdf' ? 'document' : 'other'),
      );

      const clientId = f.clientId != null && String(f.clientId).trim() ? String(f.clientId).trim() : null;
      if (clientId && !(await clientExists(clientId))) {
        return res.status(400).json({ error: 'clientId not found', code: 'invalid_client_id' });
      }
      const sessionId = f.sessionId != null && String(f.sessionId).trim() ? String(f.sessionId).trim() : null;
      const tags = JSON.stringify(Array.isArray(f.tags) ? f.tags : ['shootcleaner']);
      const fileSize = Number(f.fileSize || 0);
      const isPublic = f.isPublic === true;
      const description = f.description != null ? String(f.description) : '';

      await pool.query(
        `
          INSERT INTO digital_files
            (id, folder_name, file_name, file_type, file_size, client_id, session_id, description, tags, is_public, uploaded_at, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            file_name = EXCLUDED.file_name,
            file_size = EXCLUDED.file_size,
            description = EXCLUDED.description,
            tags = EXCLUDED.tags,
            is_public = EXCLUDED.is_public,
            updated_at = NOW()
        `,
        [fileId, folderName, fileName, fileType, fileSize, clientId, sessionId, description, tags, isPublic],
      );
      if (externalRef) await recordExternalRef(externalRef, 'digital_file', fileId);

      const created = await fetchDigitalFileById(fileId, req);
      if (created) data.push(created);
    }

    return res.status(201).json({ data });
  } catch (error) {
    console.error('[shootcleaner] Failed to commit digital files:', error);
    return res.status(500).json({ error: 'Failed to commit files', code: 'commit_failed' });
  }
});

// ---------------------------------------------------------------------------
// Clients (read) — so ShootCleaner can resolve/assign images to the right client
// ---------------------------------------------------------------------------

function mapClientRow(row: any): any {
  return {
    id: row.id,
    clientId: row.client_id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: [row.first_name, row.last_name].filter(Boolean).join(' '),
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    country: row.country,
    company: row.company,
    vatNumber: row.vat_number,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// List / search clients. ?search= matches name, email or client_id.
router.get('/clients', requireShootCleanerApiKey, async (req, res) => {
  try {
    const limitRaw = Number.parseInt(String(req.query.limit || '100'), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 100;
    const offsetRaw = Number.parseInt(String(req.query.offset || '0'), 10);
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;
    const search = String(req.query.search || '').trim();

    const where: string[] = [];
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      const p = `$${params.length}`;
      where.push(`(first_name ILIKE ${p} OR last_name ILIKE ${p} OR COALESCE(email,'') ILIKE ${p} OR COALESCE(client_id,'') ILIKE ${p} OR (first_name || ' ' || last_name) ILIKE ${p})`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await pool.query(`SELECT COUNT(*)::int AS c FROM crm_clients ${whereSql}`, params);
    params.push(limit); params.push(offset);
    const result = await pool.query(
      `SELECT id, client_id, first_name, last_name, email, phone, address, city, state, zip,
              country, company, vat_number, status, created_at, updated_at
       FROM crm_clients ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    res.json({ data: result.rows.map(mapClientRow), total: countRes.rows[0]?.c ?? 0, limit, offset });
  } catch (error) {
    console.error('[shootcleaner] Failed to list clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

router.get('/clients/:id', requireShootCleanerApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, client_id, first_name, last_name, email, phone, address, city, state, zip,
              country, company, vat_number, status, created_at, updated_at
       FROM crm_clients WHERE id::text = $1 OR client_id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Client not found', code: 'client_not_found' });
    res.json({ data: mapClientRow(row) });
  } catch (error) {
    console.error('[shootcleaner] Failed to fetch client:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// ---------------------------------------------------------------------------
// Questionnaire responses (read) — source material for the case-study generator
// ---------------------------------------------------------------------------

function buildQuestionnaireLabelMap(surveyPages: any): Record<string, string> {
  const map: Record<string, string> = {};
  try {
    const pages = typeof surveyPages === 'string' ? JSON.parse(surveyPages) : surveyPages;
    if (Array.isArray(pages)) {
      for (const page of pages) {
        for (const q of (page.questions || [])) {
          if (q.id && (q.title || q.text)) map[q.id] = q.title || q.text;
        }
      }
    }
  } catch { /* ignore malformed survey pages */ }
  return map;
}

function mapQuestionnaireRow(r: any): any {
  const labelMap = buildQuestionnaireLabelMap(r.survey_pages);
  const rawAnswers = typeof r.answers === 'string' ? JSON.parse(r.answers || '{}') : (r.answers || {});
  const resolvedAnswers: Record<string, string> = {};
  for (const [key, val] of Object.entries(rawAnswers)) {
    resolvedAnswers[labelMap[key] || key] = String(val);
  }
  return {
    id: r.id,
    clientId: r.client_id,
    clientName: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.stored_client_name || 'Unknown',
    clientEmail: r.crm_email || r.stored_client_email || null,
    questionnaireSlug: r.template_slug,
    questionnaireTitle: r.questionnaire_title,
    answers: rawAnswers,
    // resolvedAnswers keys are the human question labels — ideal for case studies.
    resolvedAnswers,
    submittedAt: r.submitted_at,
  };
}

const QUESTIONNAIRE_SELECT = `
  SELECT qr.id, qr.client_id, qr.token, qr.template_slug, qr.answers, qr.submitted_at,
         qr.client_name AS stored_client_name, qr.client_email AS stored_client_email,
         c.first_name, c.last_name, c.email AS crm_email,
         s.title AS questionnaire_title, s.pages AS survey_pages
  FROM questionnaire_responses qr
  LEFT JOIN crm_clients c ON qr.client_id = c.id::text
  LEFT JOIN surveys s ON qr.template_slug::text = s.id::text`;

router.get('/questionnaire-responses', requireShootCleanerApiKey, async (req, res) => {
  try {
    const limitRaw = Number.parseInt(String(req.query.limit || '50'), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
    const offsetRaw = Number.parseInt(String(req.query.offset || '0'), 10);
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;
    const clientId = String(req.query.clientId || '').trim();
    const questionnaireId = String(req.query.questionnaireId || '').trim();

    const where: string[] = [];
    const params: any[] = [];
    if (clientId) { params.push(clientId); where.push(`qr.client_id = $${params.length}`); }
    if (questionnaireId) { params.push(questionnaireId); where.push(`qr.template_slug = $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await pool.query(`SELECT COUNT(*)::int AS c FROM questionnaire_responses qr ${whereSql}`, params);
    params.push(limit); params.push(offset);
    const result = await pool.query(
      `${QUESTIONNAIRE_SELECT} ${whereSql} ORDER BY qr.submitted_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    res.json({ data: result.rows.map(mapQuestionnaireRow), total: countRes.rows[0]?.c ?? 0, limit, offset });
  } catch (error) {
    console.error('[shootcleaner] Failed to list questionnaire responses:', error);
    res.status(500).json({ error: 'Failed to fetch questionnaire responses' });
  }
});

router.get('/questionnaire-responses/:id', requireShootCleanerApiKey, async (req, res) => {
  try {
    const result = await pool.query(`${QUESTIONNAIRE_SELECT} WHERE qr.id = $1 LIMIT 1`, [req.params.id]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Response not found', code: 'response_not_found' });
    res.json({ data: mapQuestionnaireRow(row) });
  } catch (error) {
    console.error('[shootcleaner] Failed to fetch questionnaire response:', error);
    res.status(500).json({ error: 'Failed to fetch questionnaire response' });
  }
});

// ---------------------------------------------------------------------------
// Studio profile (read) — so ShootCleaner can brand its output (invoices, galleries,
// case studies) with the studio's name, logo and contact details.
// ---------------------------------------------------------------------------
router.get('/studio', requireShootCleanerApiKey, async (_req, res) => {
  try {
    // Single-tenant per database — the app treats the first studio_configs row as
    // THE studio (mirrors studioConfigs.limit(1) elsewhere).
    const r = await pool.query(
      `SELECT studio_name, business_name, logo_url, email, owner_email, phone, website,
              address, city, state, zip, country, currency, vat_number
       FROM studio_configs
       LIMIT 1`,
    );
    const row = r.rows[0];
    if (!row) return res.status(404).json({ error: 'Studio not configured', code: 'studio_not_configured' });

    const formatted = [
      row.address,
      [row.zip, row.city].filter(Boolean).join(' '),
      row.state,
      row.country,
    ].filter(Boolean).join(', ') || null;

    res.json({
      data: {
        name: row.business_name || row.studio_name || null,
        logoUrl: row.logo_url || null,
        phone: row.phone || null,
        email: row.email || row.owner_email || null,
        website: row.website || null,
        address: {
          line: row.address || null,
          city: row.city || null,
          state: row.state || null,
          zip: row.zip || null,
          country: row.country || null,
          formatted,
        },
        vat: row.vat_number || null,
        currency: row.currency || null,
      },
    });
  } catch (error) {
    console.error('[shootcleaner] Failed to fetch studio profile:', error);
    res.status(500).json({ error: 'Failed to fetch studio profile' });
  }
});

export default router;