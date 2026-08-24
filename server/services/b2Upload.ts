// Image storage for the blog Idea Mode endpoints.
//
// WHAT THIS USED TO DO, AND WHY EVERY IDEA-MODE IMAGE WAS BROKEN.
//
// This file built its own S3 client and its own public URL out of process.env, ignoring the
// storage provider recorded in studio_integrations. On the live instance AWS_S3_ENDPOINT was
// still the OLD Supabase endpoint, left over from a previous storage provider, while the
// database said `backblaze`. So the URL builder fell through its backblazeb2.com branch to
// the generic one and produced:
//
//   https://<project>.storage.supabase.co/storage/v1/s3/<bucket>/<key>
//
// That is the S3 API endpoint, not a public object URL. It requires a SigV4 signature and
// answers 403 to an <img> tag — which is exactly what a studio saw: an Idea Mode photo panel
// with a blank thumbnail, and then "Analyze images" failing, because the Vision call fetches
// the same URL and gets the same 403. Two symptoms, one dead URL.
//
// The same disease as the Price Wizard reading process.env instead of config.get(): a module
// that resolves configuration privately cannot be configured from inside the product, and
// drifts the moment the real setting moves.
//
// So the provider now comes from server/lib/storage-snapshot.ts, which reads the configured
// storage ONCE per operation, builds the client from it, derives the public URL from THE SAME
// snapshot that did the write, and HEADs the object afterwards to prove it is really there.
// One snapshot, one truth — a mid-request provider change cannot land the bytes in one bucket
// and the URL in another.
//
// The B2 names are kept because callers across the blog pipeline import them; the behaviour
// is now provider-agnostic.
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getStorageSnapshot, publicUrlFor, putObjectVerified } from '../lib/storage-snapshot';

/**
 * The public URL for a key, from the CURRENT storage configuration.
 *
 * Prefer the url returned by uploadBufferToB2 — it comes from the snapshot that performed the
 * write and so cannot disagree with where the bytes actually went. This exists for callers
 * that hold a key and no snapshot.
 */
export function buildB2Url(key: string): string {
  return publicUrlFor(getStorageSnapshot(), key);
}

/** Upload a buffer and return the public URL of the object that was verifiably written. */
export async function uploadBufferToB2(
  key: string,
  buffer: Buffer,
  contentType = 'image/jpeg',
): Promise<string> {
  const snap = getStorageSnapshot();
  if (!snap.isConfigured) {
    // Loudly, and before anything is written. Silently storing to a half-configured bucket is
    // how an image ends up with a URL that 403s and a studio is left to guess why.
    throw new Error(
      'Image storage is not configured, so the photo could not be saved. Add your storage '
      + 'settings in Settings and try again.',
    );
  }
  const { url } = await putObjectVerified(snap, {
    key,
    body: buffer,
    contentType,
    // Blog images are immutable once written — the key carries the article subject and a
    // random suffix, so a changed picture is a new key rather than a new body at the old one.
    cacheControl: 'public, max-age=31536000, immutable',
  });
  return url;
}

/** Delete an object by key. Best-effort — callers ignore failures. */
export async function deleteFromB2(key: string): Promise<void> {
  const snap = getStorageSnapshot();
  if (!snap.isConfigured) return;
  await snap.client.send(new DeleteObjectCommand({ Bucket: snap.bucket, Key: key }));
}

/** Fetch an image back into a Buffer for re-processing. */
export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    // The status is the whole diagnosis here. A 403 means the URL is an S3 API path rather
    // than a public object URL — the failure this module was rewritten to end — and a caller
    // that swallows it turns a storage misconfiguration into "analysis failed".
    throw new Error(`Could not read the image back from storage (HTTP ${res.status}).`);
  }
  return Buffer.from(await res.arrayBuffer());
}
