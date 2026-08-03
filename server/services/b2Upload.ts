// Minimal Backblaze B2 (S3-compatible) upload helper, mirroring the config in
// server/routes/files.ts, exposed so the blog idea endpoints can upload original
// and IPTC-embedded images server-side.
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  endpoint: process.env.AWS_S3_ENDPOINT || 'https://s3.eu-central-003.backblazeb2.com',
  region: process.env.AWS_REGION || 'eu-central-003',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export function buildB2Url(key: string): string {
  const bucket = process.env.AWS_S3_BUCKET || '';
  const endpoint = process.env.AWS_S3_ENDPOINT || 'https://s3.eu-central-003.backblazeb2.com';
  const encodedKey = key.split('/').map((p) => encodeURIComponent(p)).join('/');
  if (endpoint.includes('backblazeb2.com')) {
    return `https://${bucket}.${endpoint.replace('https://', '').replace(/\/$/, '')}/${encodedKey}`;
  }
  return `${endpoint.replace(/\/$/, '')}/${bucket}/${encodedKey}`;
}

/** Upload a buffer to B2 and return its public URL. */
export async function uploadBufferToB2(
  key: string,
  buffer: Buffer,
  contentType = 'image/jpeg',
): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET || '',
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return buildB2Url(key);
}

/** Delete an object from B2 by key. Best-effort — callers ignore failures. */
export async function deleteFromB2(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET || '',
    Key: key,
  }));
}

/** Fetch an image (e.g. a B2 URL) back into a Buffer for re-processing. */
export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch image failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
