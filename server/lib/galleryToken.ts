// Access tokens for a client gallery.
//
// The old token was:
//     Buffer.from(`${gallery.id}:${email}:${Date.now()}`).toString('base64')
// with a comment reading "For now, return a simple token (in production, use JWT)".
//
// It was never verified. GET /api/galleries/:slug/images checked only that an
// Authorization header was PRESENT — any string passed — and GET /:slug/download read no
// header at all and streamed every full-resolution image as a ZIP. So a gallery slug was
// the whole of the security: anyone who was forwarded a link, or who guessed a slug, could
// download a family's or a client's entire shoot.
//
// And because the payload is unsigned base64 of public-ish values, even a checked token
// would have been forgeable by hand. Signing is what makes verification mean anything.
//
// Deliberately NOT a JWT. This needs one claim, one audience and one verifier; a JWT
// library brings an algorithm field, which is the part of JWT that keeps producing
// vulnerabilities (alg:none, RS256/HS256 confusion). HMAC-SHA256 over a fixed payload has
// no algorithm to negotiate.
import crypto from 'crypto';

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let cachedSecret: string | null = null;

/**
 * The signing secret.
 *
 * Falls back to a per-process random value rather than to a constant. That logs gallery
 * visitors out on restart, which is mildly annoying and completely safe; a hardcoded
 * default would be neither, because it would be identical on every deployment of this
 * product and therefore public.
 */
function secret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv =
    process.env.GALLERY_TOKEN_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    '';
  if (fromEnv.trim()) {
    cachedSecret = fromEnv.trim();
  } else {
    cachedSecret = crypto.randomBytes(32).toString('hex');
    console.warn(
      '[gallery-token] No GALLERY_TOKEN_SECRET/SESSION_SECRET set — using a random ' +
      'per-process secret. Gallery links will stop working at every restart until one is set.',
    );
  }
  return cachedSecret;
}

const b64url = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

const sign = (payload: string) =>
  b64url(crypto.createHmac('sha256', secret()).update(payload).digest());

/** Issue a token binding this visitor to this gallery. */
export function issueGalleryToken(galleryId: string, email: string): string {
  const payload = b64url(Buffer.from(JSON.stringify({ g: galleryId, e: email || '', t: Date.now() })));
  return `${payload}.${sign(payload)}`;
}

export interface GalleryTokenResult {
  ok: boolean;
  email?: string;
  reason?: 'missing' | 'malformed' | 'bad_signature' | 'expired' | 'wrong_gallery';
}

/**
 * Verify a token really was issued by this server, for THIS gallery, recently.
 *
 * The gallery id check is the one that stops a visitor with a legitimate token for their
 * own gallery reading somebody else's by swapping the slug in the URL.
 */
export function verifyGalleryToken(token: string | undefined | null, galleryId: string): GalleryTokenResult {
  const raw = String(token || '').trim();
  if (!raw) return { ok: false, reason: 'missing' };

  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return { ok: false, reason: 'malformed' };

  const payload = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  const expected = sign(payload);

  // Constant-time compare; a length mismatch would make timingSafeEqual throw.
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'bad_signature' };

  let body: any;
  try { body = JSON.parse(unb64url(payload).toString('utf8')); }
  catch { return { ok: false, reason: 'malformed' }; }

  if (!body || typeof body.t !== 'number') return { ok: false, reason: 'malformed' };
  if (Date.now() - body.t > TOKEN_TTL_MS) return { ok: false, reason: 'expired' };
  if (String(body.g || '') !== String(galleryId)) return { ok: false, reason: 'wrong_gallery' };

  return { ok: true, email: String(body.e || '') };
}

/** The Bearer token on a request, if any. */
export function bearerFrom(req: any): string | null {
  const h = String(req?.headers?.authorization || '');
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}
