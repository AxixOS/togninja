import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getS3Config, buildPublicUrl } from '../services/s3-storage';

/**
 * A request must talk to ONE storage provider from start to finish.
 *
 * getS3Config() is deliberately sync, and it refreshes itself in the background: once the
 * 60s TTL lapses it fires refreshStorageConfig() WITHOUT awaiting and returns the OLD
 * object (services/s3-storage.ts). The refresh reassigns the module-level `_current` on a
 * later tick — which, in an upload handler, is any tick after an `await`.
 *
 * A handler that calls getS3Config() (or getS3Client(), which calls it again internally)
 * once per operation therefore does not necessarily get the same provider twice. That is
 * not theoretical: this tenant's voucher product image was PUT to the previous Supabase
 * bucket and then had a Backblaze URL written to the database, because the PUT and the
 * URL builder each resolved the config on opposite sides of a `sharp` await. The object
 * is live on Supabase to this day and the stored URL has 404'd since the moment it was
 * written.
 *
 * refreshStorageConfig() REPLACES `_current` rather than mutating it, so one read gives a
 * value that can never change underneath us. Read once, build the client from that same
 * value, and hand the whole triple around together — exactly the reasoning the credential
 * set already gets in s3-storage.ts ("credentials only mean anything against the endpoint
 * they were issued for"). Bucket and endpoint only mean anything against the client that
 * wrote the object.
 */
export interface StorageSnapshot {
  client: S3Client;
  bucket: string;
  endpoint: string;
  region: string;
  isConfigured: boolean;
}

/** One getS3Config() read, one client built from it. Never call getS3Config() again in the same handler. */
export function getStorageSnapshot(): StorageSnapshot {
  const cfg = getS3Config();
  return {
    client: new S3Client({
      region: cfg.region,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      endpoint: cfg.endpoint || undefined,
      forcePathStyle: !!cfg.endpoint,
    }),
    bucket: cfg.bucket,
    endpoint: cfg.endpoint,
    region: cfg.region,
    isConfigured: cfg.isConfigured,
  };
}

/** The public URL for a key, built from the SAME snapshot that wrote it. */
export function publicUrlFor(snap: StorageSnapshot, key: string): string {
  return buildPublicUrl(snap.bucket, snap.endpoint, key);
}

/**
 * The extension has to describe the BYTES, not the file the studio picked.
 *
 * The upload path re-encodes every image to WebP and then named the object after the
 * source filename, so the bucket is full of `.jpg` keys holding `image/webp` payloads.
 * That is survivable for a browser (it sniffs), but every read path in this repo that
 * reconstructs a key by convention — /api/files/thumbnail/:id, the /api/files list —
 * guesses the extension, and a guess that disagrees with reality is a 404.
 */
export function extensionForImageMime(mime: string): string {
  switch (String(mime || '').toLowerCase()) {
    case 'image/webp': return '.webp';
    case 'image/jpeg':
    case 'image/jpg': return '.jpg';
    case 'image/png': return '.png';
    case 'image/avif': return '.avif';
    case 'image/gif': return '.gif';
    default: return '';
  }
}

function notFoundish(err: any): boolean {
  const status = err?.$metadata?.httpStatusCode;
  const name = String(err?.name || err?.Code || '');
  return status === 404 || /^(NotFound|NoSuchKey)$/i.test(name);
}

/**
 * PUT, then prove the object is really there before anyone records its URL.
 *
 * A PUT that does not throw is not proof that a row may now point at it — the same class
 * of defect as the booking email that reported success while sending nothing. Callers get
 * back the key that was actually written and the URL built from the same snapshot, so
 * there is never a URL derived from another URL by string surgery.
 *
 * The absence check is deliberately narrow: only a genuine 404/NoSuchKey means the write
 * did not land. A HeadObject that fails for any other reason (a key permitted to write but
 * not to head, a provider quirk) proves nothing, so it warns and trusts the PUT rather
 * than failing an upload that actually succeeded.
 */
export async function putObjectVerified(
  snap: StorageSnapshot,
  opts: { key: string; body: Buffer; contentType: string; cacheControl?: string; metadata?: Record<string, string> },
): Promise<{ key: string; url: string; bytes: number }> {
  await snap.client.send(new PutObjectCommand({
    Bucket: snap.bucket,
    Key: opts.key,
    Body: opts.body,
    ContentType: opts.contentType,
    CacheControl: opts.cacheControl,
    Metadata: opts.metadata,
  }));

  try {
    const head = await snap.client.send(new HeadObjectCommand({ Bucket: snap.bucket, Key: opts.key }));
    if (typeof head.ContentLength === 'number' && head.ContentLength !== opts.body.length) {
      throw new Error(
        `Storage stored ${head.ContentLength} bytes for "${opts.key}" but ${opts.body.length} were sent. ` +
        `The upload was truncated; refusing to record its URL.`,
      );
    }
  } catch (err: any) {
    if (notFoundish(err)) {
      throw new Error(
        `Storage accepted the upload of "${opts.key}" into bucket "${snap.bucket}" but the object is not there. ` +
        `Refusing to record a URL that would 404.`,
      );
    }
    if (/refusing to record/i.test(String(err?.message || ''))) throw err;
    console.warn(`[STORAGE] Could not verify "${opts.key}" after upload (${err?.name || 'error'}: ${err?.message}). Trusting the PUT.`);
  }

  return { key: opts.key, url: publicUrlFor(snap, opts.key), bytes: opts.body.length };
}

/**
 * The object key behind a public URL — or null when the URL is not ours to touch.
 *
 * Two bugs live here. `URL.pathname` is percent-encoded, so the old inline copies of this
 * handed DeleteObjectCommand the key `Voucher%20Products/…`; the SDK encoded that again to
 * `Voucher%2520Products/…`, S3 returns 204 for a DELETE of a key that does not exist, and
 * the handler logged "Deleted old image object" for a no-op. Every replaced voucher image
 * is still sitting in the bucket.
 *
 * The second is why this returns null so often. This tenant was migrated Supabase ->
 * Backblaze and rows written before the migration still hold Supabase URLs. Once the
 * delete actually works, treating a foreign URL's path as a key in the CURRENT bucket
 * would delete whatever happens to share that path. A key is only returned when the URL
 * demonstrably addresses this bucket at this endpoint.
 */
export function storageKeyFromUrl(urlStr: string | null | undefined, snap: Pick<StorageSnapshot, 'bucket' | 'endpoint'>): string | null {
  if (!urlStr || !snap.bucket) return null;
  let u: URL;
  try { u = new URL(String(urlStr)); } catch { return null; }

  const decode = (p: string): string | null => {
    const key = p.replace(/^\/+/, '').split('/').map((seg) => { try { return decodeURIComponent(seg); } catch { return seg; } }).join('/');
    return key || null;
  };

  const host = u.hostname.toLowerCase();
  const bucket = snap.bucket;
  const path = u.pathname.replace(/^\/+/, '');

  let endpointHost = '';
  if (snap.endpoint) { try { endpointHost = new URL(snap.endpoint).hostname.toLowerCase(); } catch { /* unusable endpoint */ } }

  // Supabase public objects: <project>/storage/v1/object/public/<bucket>/<key>. The S3
  // endpoint host and the public host are the same box, different path prefix.
  if (endpointHost && host === endpointHost) {
    const supaPrefix = `storage/v1/object/public/${bucket}/`;
    if (path.startsWith(supaPrefix)) return decode(path.slice(supaPrefix.length));
    // Path style: <endpoint>/<bucket>/<key>
    if (path.startsWith(`${bucket}/`)) return decode(path.slice(bucket.length + 1));
    return null;
  }

  // Virtual-hosted style: <bucket>.<endpoint host>/<key>, and AWS's default host.
  if (endpointHost && host === `${bucket}.${endpointHost}`.toLowerCase()) return decode(path);
  if (!endpointHost && host === `${bucket}.s3.amazonaws.com`.toLowerCase()) return decode(path);

  return null;
}
