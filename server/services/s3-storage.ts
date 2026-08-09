import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { config as appConfig } from '../config-reader';

// Storage credentials resolve from the onboarding wizard (studio_integrations,
// via config-reader) FIRST, then AWS_* env fallback — same bridge pattern as SMTP,
// so a tenant that configures Backblaze in the wizard actually gets working
// uploads. getS3Config() stays SYNC (many callers) and returns the latest
// resolved config from `_current`, which is refreshed at boot + whenever storage
// config is saved (invalidateStorageConfig) + lazily on a TTL.
interface StorageConfig {
  bucket: string; endpoint: string; region: string;
  accessKeyId: string; secretAccessKey: string; isConfigured: boolean;
}

// Owners paste storage endpoints as bare hosts ("xyz.storage.supabase.co/storage/v1/s3").
// The AWS SDK requires an absolute URL and throws `TypeError: Invalid URL` on a
// schemeless endpoint — which surfaces as a cryptic upload failure. Normalise here so
// any env- or wizard-supplied endpoint works with or without the scheme.
export function normalizeEndpoint(ep: string | null | undefined): string {
  const s = String(ep || '').trim().replace(/\/+$/, '');
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

// A storage endpoint is only usable if it's an absolute http(s) URL with a REAL host
// (dotted domain, IP, or localhost). This rejects a mistyped value — e.g. a bare
// access-key token pasted into the endpoint field — which would otherwise become
// "https://<token>" and fail every upload with "getaddrinfo ENOTFOUND <token>".
export function isUsableEndpoint(ep: string): boolean {
  if (!ep) return false;
  try {
    const u = new URL(ep);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return u.hostname === 'localhost' || u.hostname.includes('.');
  } catch {
    return false;
  }
}

// Prefer the wizard/DB endpoint, but if it's junk, fall back to the env endpoint
// rather than breaking uploads. If neither is usable, return '' (AWS default host).
function pickEndpoint(dbRaw: string | null | undefined, envRaw: string | null | undefined): string {
  const db = normalizeEndpoint(dbRaw);
  if (isUsableEndpoint(db)) return db;
  const env = normalizeEndpoint(envRaw);
  if (isUsableEndpoint(env)) return env;
  return '';
}

function envStorageConfig(): StorageConfig {
  const bucket = process.env.AWS_S3_BUCKET || '';
  const endpoint = pickEndpoint(null, process.env.AWS_S3_ENDPOINT);
  const region = process.env.AWS_REGION || 'eu-central-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
  return { bucket, endpoint, region, accessKeyId, secretAccessKey, isConfigured: !!(bucket && accessKeyId && secretAccessKey) };
}

let _current: StorageConfig = envStorageConfig();
let _lastLoad = 0;
const STORAGE_TTL = 60_000;

/**
 * Storage config resolves as a COHERENT SET — all of it from the wizard/DB, or all of
 * it from env. It used to fall back field by field, which silently built a hybrid: a
 * studio that had configured Backblaze in the wizard and then had env switched to
 * Supabase got Backblaze's endpoint and bucket with Supabase's keys, and every upload
 * failed with the provider's raw "Malformed Access Key Id". Credentials only mean
 * anything against the endpoint they were issued for, so they travel together.
 *
 * The DB wins only when it holds a usable PAIR (access key + secret). A half-filled
 * row — the shape a partial wizard run or a partial reset leaves behind — is ignored
 * rather than blended.
 */
async function resolveStorageConfig(): Promise<StorageConfig> {
  const dbAccessKeyId = (await appConfig.get('storage_access_key_id')) || '';
  const dbSecretKey = (await appConfig.get('storage_secret_key')) || '';

  if (dbAccessKeyId && dbSecretKey) {
    const bucket = (await appConfig.get('storage_bucket')) || '';
    const endpoint = pickEndpoint(await appConfig.get('storage_endpoint'), null);
    // Region is the one safe cross-source value: it is not part of the credential and
    // every provider here tolerates a default.
    const region = (await appConfig.get('storage_region')) || process.env.AWS_REGION || 'eu-central-1';
    return {
      bucket, endpoint, region,
      accessKeyId: dbAccessKeyId, secretAccessKey: dbSecretKey,
      isConfigured: !!(bucket && dbAccessKeyId && dbSecretKey),
    };
  }

  return envStorageConfig();
}

/**
 * Backblaze (and most S3-compatibles) encode the region IN the endpoint host —
 * s3.eu-central-003.backblazeb2.com. A Region field that disagrees with it is always a
 * mistake, and the SDK's own error ("InvalidAccessKeyId", or a signature failure) never
 * mentions the region, so it is close to undiagnosable.
 *
 * Returns the explanation when they disagree, or null. Shared by BOTH the save and the
 * test handler: it used to live inline in the test only, so a studio that saved without
 * testing still stored eu-central-003 against us-west-004 and had no way to know why
 * every upload failed.
 */
export function describeRegionMismatch(endpoint: string, region: string): string | null {
  const hostRegion = String(endpoint || '').match(/s3[.-]([a-z]{2}-[a-z]+-\d+)\./i)?.[1];
  if (!hostRegion || !region) return null;
  if (hostRegion.toLowerCase() === String(region).toLowerCase()) return null;
  return `Your endpoint is for region "${hostRegion}" but the Region field says "${region}". ` +
    `Set Region to "${hostRegion}" to match the endpoint.`;
}

type StorageProvider = 'backblaze' | 'supabase' | 'aws' | 'custom';

/** Which provider an endpoint points at. No endpoint means AWS's default host. */
export function providerForEndpoint(endpoint: string): StorageProvider {
  const ep = String(endpoint || '').toLowerCase();
  if (!ep) return 'aws';
  if (ep.includes('backblazeb2.com')) return 'backblaze';
  if (ep.includes('supabase')) return 'supabase';
  if (ep.includes('amazonaws.com')) return 'aws';
  return 'custom';
}

/**
 * Does this access key look like it was issued by the provider we are about to call?
 * Key IDs have distinct, stable shapes: AWS starts AKIA/ASIA, Backblaze application
 * key IDs are 25 hex characters, Supabase's are 20. Returns a human explanation when
 * they disagree, or null when they look consistent (or we cannot tell).
 */
export function describeCredentialMismatch(cfg: Pick<StorageConfig, 'endpoint' | 'accessKeyId'>): string | null {
  const key = String(cfg.accessKeyId || '').trim();
  if (!key) return null;
  const provider = providerForEndpoint(cfg.endpoint);
  const looksAws = /^(AKIA|ASIA)/.test(key);
  const looksBackblaze = /^[0-9a-f]{25}$/i.test(key);
  const looksSupabase = /^[0-9a-f]{20}$/i.test(key);

  const shape = looksAws ? 'an AWS' : looksBackblaze ? 'a Backblaze' : looksSupabase ? 'a Supabase' : null;
  if (!shape) return null;

  const endpointName =
    provider === 'backblaze' ? 'Backblaze B2' :
    provider === 'supabase' ? 'Supabase Storage' :
    provider === 'aws' ? 'AWS S3' : null;
  if (!endpointName) return null;

  const agrees =
    (provider === 'backblaze' && looksBackblaze) ||
    (provider === 'supabase' && looksSupabase) ||
    (provider === 'aws' && looksAws);
  if (agrees) return null;

  return `The storage endpoint is ${endpointName} (${cfg.endpoint || 'default AWS host'}) but the access key looks like ${shape} key. ` +
    `Access keys only work against the provider that issued them — set the endpoint, bucket and both keys to the same provider in Settings → Technical Setup → Storage.`;
}

/**
 * Turn a provider's raw S3 error into something a studio owner can act on. Uploads
 * were surfacing bare strings like "Malformed Access Key Id" straight into the UI,
 * which names neither the cause nor the fix.
 */
export function explainStorageError(err: any): string {
  const cfg = getS3Config();
  const raw = String(err?.message || err || 'Upload failed');
  const code = String(err?.name || err?.Code || '');
  const mismatch = describeCredentialMismatch(cfg);
  const where = `(bucket "${cfg.bucket || 'not set'}", endpoint ${cfg.endpoint || 'default AWS host'})`;

  if (/malformed access key|invalidaccesskeyid|signaturedoesnotmatch/i.test(`${raw} ${code}`)) {
    return mismatch
      ? `${mismatch} ${where}`
      : `Storage rejected the credentials ${where}: ${raw}. Check the access key and secret in Settings → Technical Setup → Storage.`;
  }
  if (/nosuchbucket/i.test(`${raw} ${code}`)) {
    return `The bucket "${cfg.bucket}" does not exist at ${cfg.endpoint || 'the configured endpoint'}. Create it, or correct the bucket name in Settings → Technical Setup → Storage.`;
  }
  if (/accessdenied|forbidden|403/i.test(`${raw} ${code}`)) {
    return `Storage denied the upload ${where}. The key is valid but lacks write permission on this bucket.`;
  }
  if (/getaddrinfo|enotfound|econnrefused/i.test(raw)) {
    return `Could not reach the storage endpoint ${cfg.endpoint || '(none set)'}. Check the endpoint URL in Settings → Technical Setup → Storage.`;
  }
  return mismatch ? `${mismatch} ${where}` : `${raw} ${where}`;
}

export async function refreshStorageConfig(): Promise<void> {
  try { _current = await resolveStorageConfig(); _lastLoad = Date.now(); } catch { /* keep previous */ }
}

/** Call after storage config is saved so the next request uses the new creds. */
export function invalidateStorageConfig(): void {
  _lastLoad = 0;
  refreshStorageConfig().catch(() => {});
}

export function getS3Config(): StorageConfig {
  // Lazy background refresh once the cache is stale (non-blocking).
  if (Date.now() - _lastLoad > STORAGE_TTL) {
    _lastLoad = Date.now();
    refreshStorageConfig().catch(() => {});
  }
  return _current;
}

export function getS3Client() {
  const { region, accessKeyId, secretAccessKey, endpoint } = getS3Config();
  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    endpoint: endpoint || undefined,
    forcePathStyle: !!endpoint
  });
}

export function buildPublicUrl(bucket: string, endpoint: string, key: string): string {
  const ep = (endpoint || '').replace(/\/$/, '');
  // URL encode each path segment, preserving slashes for proper URL formatting
  const encodedKey = key.split('/').map(part => encodeURIComponent(part)).join('/');
  if (!ep) return `https://${bucket}.s3.amazonaws.com/${encodedKey}`;
  // Supabase Storage: the S3-compatible endpoint (…/storage/v1/s3) is auth-only —
  // a browser <img> can't load from it. Public objects are served from a different
  // path: …/storage/v1/object/public/<bucket>/<key> (bucket must be marked Public).
  // Accept either the full S3 endpoint or the bare project host.
  if (ep.includes('supabase')) {
    const host = ep.replace(/\/storage\/v1\/s3$/, '');
    return `${host}/storage/v1/object/public/${bucket}/${encodedKey}`;
  }
  return ep.includes('backblazeb2.com')
    ? `https://${bucket}.${ep.replace(/^https?:\/\//i, '')}/${encodedKey}`
    : `${ep}/${bucket}/${encodedKey}`;
}

export async function storageHealth() {
  const cfg = getS3Config();
  const result: any = {
    accessConfigured: cfg.isConfigured,
    bucket: cfg.bucket || null,
    endpoint: cfg.endpoint || null,
    canList: false,
    canWriteTest: false,
  };
  if (!cfg.isConfigured) return result;
  const s3 = getS3Client();
  try {
    await s3.send(new ListObjectsV2Command({ Bucket: cfg.bucket, MaxKeys: 1 }));
    result.canList = true;
  } catch (e: any) {
    result.listError = e?.message || String(e);
  }
  // Optional write test only when explicitly allowed (never by default in prod)
  if (String(process.env.ALLOW_S3_HEALTH_WRITE || '').toLowerCase() === 'true') {
    try {
      const key = `health/${Date.now()}_${Math.random().toString(36).slice(2)}.txt`;
      await s3.send(new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: Buffer.from('ok', 'utf-8'),
        ContentType: 'text/plain',
        CacheControl: 'no-store',
      }));
      result.canWriteTest = true;
      result.testKey = key;
    } catch (e: any) {
      result.writeError = e?.message || String(e);
    }
  }
  return result;
}

/**
 * AWS S3 Storage Service
 * Handles file uploads, downloads, and management in Amazon S3
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import sharp from 'sharp';

// S3 client + bucket + endpoint now come from the config-aware helpers above
// (getS3Client() / getS3Config()) so onboarding-wizard storage config works —
// not just AWS_* env. CLOUDFRONT_URL stays env-only (optional CDN).
const CLOUDFRONT_URL = process.env.AWS_CLOUDFRONT_URL;

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  thumbnailKey?: string;
  thumbnailUrl?: string;
}

/**
 * Upload a file to S3
 */
export async function uploadFile(
  file: Buffer,
  originalName: string,
  mimeType: string,
  subscriptionId: string,
  folderId?: string
): Promise<UploadResult> {
  const fileExtension = path.extname(originalName);
  const fileName = `${uuidv4()}${fileExtension}`;
  
  // Construct S3 key with folder structure
  const folderPath = folderId ? `${subscriptionId}/${folderId}` : subscriptionId;
  const key = `uploads/${folderPath}/${fileName}`;

  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: getS3Config().bucket,
    Key: key,
    Body: file,
    ContentType: mimeType,
    // Set ACL to private - files are accessed via presigned URLs
    ACL: 'private',
    Metadata: {
      originalName,
      subscriptionId,
      ...(folderId && { folderId }),
    },
  });

  await getS3Client().send(command);

  // Get file URL
  const url = getFileUrl(key);

  // Create thumbnail for images
  let thumbnailKey: string | undefined;
  let thumbnailUrl: string | undefined;

  if (mimeType.startsWith('image/')) {
    const thumbnailResult = await createThumbnail(file, key, mimeType);
    thumbnailKey = thumbnailResult.key;
    thumbnailUrl = thumbnailResult.url;
  }

  return {
    key,
    url,
    size: file.length,
    mimeType,
    thumbnailKey,
    thumbnailUrl,
  };
}

/**
 * Create thumbnail for image
 */
async function createThumbnail(
  imageBuffer: Buffer,
  originalKey: string,
  mimeType: string
): Promise<{ key: string; url: string }> {
  try {
    // Generate thumbnail (300x300)
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    const thumbnailKey = originalKey.replace('/uploads/', '/thumbnails/').replace(path.extname(originalKey), '.jpg');

    const command = new PutObjectCommand({
      Bucket: getS3Config().bucket,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
      ACL: 'private',
    });

    await getS3Client().send(command);

    return {
      key: thumbnailKey,
      url: getFileUrl(thumbnailKey),
    };
  } catch (error) {
    console.error('Error creating thumbnail:', error);
    // Return original if thumbnail creation fails
    return {
      key: originalKey,
      url: getFileUrl(originalKey),
    };
  }
}

/**
 * Get file URL (CloudFront or S3 direct)
 */
function getFileUrl(key: string): string {
  const cfg = getS3Config();
  // Prefer CDN if configured
  if (CLOUDFRONT_URL) {
    return `${CLOUDFRONT_URL.replace(/\/$/, '')}/${key}`;
  }
  // If using Backblaze B2 S3-compatible endpoint, use path-style URL
  if (cfg.endpoint && /backblazeb2\.com/i.test(cfg.endpoint)) {
    return `${cfg.endpoint.replace(/\/$/, '')}/${cfg.bucket}/${key}`;
  }
  return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${key}`;
}

/**
 * Generate presigned URL for secure file download
 */
export async function getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getS3Config().bucket,
    Key: key,
  });

  const url = await getSignedUrl(getS3Client(), command, { expiresIn });
  return url;
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: getS3Config().bucket,
    Key: key,
  });

  await getS3Client().send(command);

  // Also delete thumbnail if exists
  const thumbnailKey = key.replace('/uploads/', '/thumbnails/').replace(path.extname(key), '.jpg');
  try {
    const thumbnailCommand = new DeleteObjectCommand({
      Bucket: getS3Config().bucket,
      Key: thumbnailKey,
    });
    await getS3Client().send(thumbnailCommand);
  } catch (error) {
    // Thumbnail might not exist, that's okay
    console.log('No thumbnail to delete or error deleting thumbnail:', error);
  }
}

/**
 * Get file metadata from S3
 */
export async function getFileMetadata(key: string) {
  const command = new HeadObjectCommand({
    Bucket: getS3Config().bucket,
    Key: key,
  });

  const response = await getS3Client().send(command);
  return {
    size: response.ContentLength,
    contentType: response.ContentType,
    lastModified: response.LastModified,
    metadata: response.Metadata,
  };
}

/**
 * List files in a folder
 */
export async function listFiles(subscriptionId: string, folderId?: string) {
  const prefix = folderId 
    ? `uploads/${subscriptionId}/${folderId}/`
    : `uploads/${subscriptionId}/`;

  const command = new ListObjectsV2Command({
    Bucket: getS3Config().bucket,
    Prefix: prefix,
    MaxKeys: 1000,
  });

  const response = await getS3Client().send(command);
  return response.Contents || [];
}

/**
 * Copy file (used for gallery transfers)
 */
export async function copyFile(
  sourceKey: string,
  destinationSubscriptionId: string,
  destinationFolderId?: string
): Promise<string> {
  // Download source file
  const getCommand = new GetObjectCommand({
    Bucket: getS3Config().bucket,
    Key: sourceKey,
  });

  const { Body, ContentType } = await getS3Client().send(getCommand);
  
  if (!Body) {
    throw new Error('Failed to download source file');
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of Body as any) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  // Upload to destination
  const fileExtension = path.extname(sourceKey);
  const fileName = `${uuidv4()}${fileExtension}`;
  const folderPath = destinationFolderId 
    ? `${destinationSubscriptionId}/${destinationFolderId}`
    : destinationSubscriptionId;
  const destinationKey = `uploads/${folderPath}/${fileName}`;

  const putCommand = new PutObjectCommand({
    Bucket: getS3Config().bucket,
    Key: destinationKey,
    Body: buffer,
    ContentType: ContentType || 'application/octet-stream',
    ACL: 'private',
    Metadata: {
      copiedFrom: sourceKey,
      destinationSubscriptionId,
    },
  });

  await getS3Client().send(putCommand);

  return destinationKey;
}

/**
 * Calculate total storage used by subscription
 */
export async function calculateStorageUsed(subscriptionId: string): Promise<number> {
  let totalSize = 0;
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: getS3Config().bucket,
      Prefix: `uploads/${subscriptionId}/`,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    });

    const response = await getS3Client().send(command);
    
    if (response.Contents) {
      totalSize += response.Contents.reduce((sum, obj) => sum + (obj.Size || 0), 0);
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return totalSize;
}

/**
 * Multipart upload for large files (>100MB)
 */
export async function uploadLargeFile(
  file: Buffer,
  originalName: string,
  mimeType: string,
  subscriptionId: string,
  folderId?: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  // For files smaller than 100MB, use regular upload
  if (file.length < 100 * 1024 * 1024) {
    return uploadFile(file, originalName, mimeType, subscriptionId, folderId);
  }

  // TODO: Implement multipart upload for large files
  // This is a placeholder - full implementation requires chunking and CreateMultipartUpload API
  console.log('Large file upload - using standard upload for now');
  return uploadFile(file, originalName, mimeType, subscriptionId, folderId);
}

export const s3Service = {
  uploadFile,
  getPresignedDownloadUrl,
  deleteFile,
  getFileMetadata,
  listFiles,
  copyFile,
  calculateStorageUsed,
  uploadLargeFile,
};
