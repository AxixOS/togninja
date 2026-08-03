// Offline instance licence — the "is this install paid for" gate for self-hosted
// (and hosted) tenants. Complements entitlement.ts: this verifies a SIGNED licence
// key locally (no licence server needed), so it works fully offline at boot;
// entitlement.ts layers ONLINE premium-service gating on top when a server exists.
//
// Key = Ed25519-signed token: `TOG1.<base64url(payloadJSON)>.<base64url(sig)>`.
// The app holds only the PUBLIC key (LICENSE_PUBLIC_KEY) so it can VERIFY but never
// forge; the private signing key stays with the vendor (mint-license.mjs).
//
// ── Rollout safety ──────────────────────────────────────────────────────────
// Enforcement is OFF unless LICENSE_PUBLIC_KEY is set AND DEMO_MODE !== 'true'.
// So existing internal instances (New Age, tenant-zero, dev) are unaffected until
// you deliberately set LICENSE_PUBLIC_KEY on a customer instance. When enforced,
// an active/grace licence runs normally; a missing/invalid/expired-past-grace one
// blocks ADMIN WRITES only — never the public site, never reads, never their data.

import crypto from 'crypto';

export type LicenseState = 'unenforced' | 'active' | 'grace' | 'expired' | 'invalid' | 'missing';

export interface LicenseClaims {
  sid?: string;        // studio id this licence is bound to
  plan?: string;       // 'self-hosted' | 'hosted' | 'trial' | …
  iat?: number;        // issued-at (epoch seconds)
  exp?: number;        // expires (epoch seconds); 0/absent = perpetual
  features?: string[]; // optional feature flags
}

export interface LicenseStatus {
  state: LicenseState;
  enforced: boolean;
  plan: string | null;
  studioId: string | null;
  expiresAt: string | null;
  message: string;
}

const PREFIX = 'TOG1.';
const GRACE_DAYS = 14;
const RECHECK_MS = 60 * 60 * 1000; // re-evaluate (expiry) at most hourly

function b64urlToBuf(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

// Accept either a PEM public key or a base64 raw 32-byte Ed25519 key.
function loadPublicKey(): crypto.KeyObject | null {
  const raw = (process.env.LICENSE_PUBLIC_KEY || '').trim();
  if (!raw) return null;
  try {
    if (raw.includes('BEGIN PUBLIC KEY')) return crypto.createPublicKey(raw);
    const keyBuf = Buffer.from(raw, 'base64');
    if (keyBuf.length === 32) {
      // Wrap a raw Ed25519 public key in its SPKI DER header.
      const spkiHeader = Buffer.from('302a300506032b6570032100', 'hex');
      return crypto.createPublicKey({ key: Buffer.concat([spkiHeader, keyBuf]), format: 'der', type: 'spki' });
    }
    return crypto.createPublicKey({ key: keyBuf, format: 'der', type: 'spki' });
  } catch (e: any) {
    console.error('[license] Invalid LICENSE_PUBLIC_KEY:', e?.message || e);
    return null;
  }
}

export function verifyLicenseKey(token: string, pub: crypto.KeyObject): { ok: boolean; claims?: LicenseClaims } {
  try {
    if (!token || !token.startsWith(PREFIX)) return { ok: false };
    const [payloadB64, sigB64] = token.slice(PREFIX.length).split('.');
    if (!payloadB64 || !sigB64) return { ok: false };
    const payloadBuf = b64urlToBuf(payloadB64);
    const ok = crypto.verify(null, payloadBuf, pub, b64urlToBuf(sigB64)); // Ed25519
    if (!ok) return { ok: false };
    return { ok: true, claims: JSON.parse(payloadBuf.toString('utf8')) as LicenseClaims };
  } catch {
    return { ok: false };
  }
}

let cached: LicenseStatus | null = null;
let cachedAt = 0;

function computeStatus(): LicenseStatus {
  const pub = loadPublicKey();
  const demo = process.env.DEMO_MODE === 'true';

  // Not enforced: no public key configured, or explicit demo instance.
  if (!pub || demo) {
    return { state: 'unenforced', enforced: false, plan: null, studioId: null, expiresAt: null,
      message: 'Licensing is not enforced on this instance.' };
  }

  const token = (process.env.LICENSE_KEY || '').trim();
  if (!token) {
    return { state: 'missing', enforced: true, plan: null, studioId: null, expiresAt: null,
      message: 'No licence key configured. Set LICENSE_KEY to activate this instance.' };
  }

  const { ok, claims } = verifyLicenseKey(token, pub);
  if (!ok || !claims) {
    return { state: 'invalid', enforced: true, plan: null, studioId: null, expiresAt: null,
      message: 'Licence key is invalid. Please contact your provider for a valid key.' };
  }

  const plan = claims.plan || null;
  const studioId = claims.sid || null;
  const expSec = Number(claims.exp || 0);
  const expiresAt = expSec ? new Date(expSec * 1000).toISOString() : null;
  const base = { plan, studioId, expiresAt, enforced: true } as const;

  if (!expSec) return { ...base, state: 'active', message: 'Licensed (perpetual).' };

  const nowSec = Math.floor(Date.now() / 1000);
  const expDate = new Date(expSec * 1000).toLocaleDateString();
  if (nowSec <= expSec) return { ...base, state: 'active', message: `Licence active until ${expDate}.` };
  if (nowSec <= expSec + GRACE_DAYS * 86400) {
    return { ...base, state: 'grace', message: `Licence expired on ${expDate}. Renew within ${GRACE_DAYS} days to avoid interruption.` };
  }
  return { ...base, state: 'expired', message: `Licence expired on ${expDate}. Renew to restore management access.` };
}

/** Current licence status (cached, re-evaluated at most hourly for expiry roll-over). */
export function getLicenseStatus(): LicenseStatus {
  const now = Date.now();
  if (cached && now - cachedAt < RECHECK_MS) return cached;
  cached = computeStatus();
  cachedAt = now;
  return cached;
}

/** May this instance perform management writes right now? */
export function licenseAllowsMutations(): boolean {
  const s = getLicenseStatus();
  if (!s.enforced) return true;
  return s.state === 'active' || s.state === 'grace';
}

// Paths that must stay reachable even on an unlicensed instance, so the owner can
// always log in and paste a fresh key: auth, the licence endpoints, health, setup.
const ALLOW_PREFIXES = ['/api/auth', '/api/login', '/api/logout', '/api/license', '/api/health', '/api/healthz', '/api/setup'];

/**
 * Express middleware: when enforced and the licence is missing/invalid/expired,
 * block API *mutations* (POST/PUT/PATCH/DELETE) with a 402 — the public site,
 * all reads, and their existing data keep working. Active/grace pass through.
 */
export function licenseEnforcement(req: any, res: any, next: any) {
  const s = getLicenseStatus();
  if (!s.enforced || s.state === 'active' || s.state === 'grace') return next();
  const method = String(req.method || 'GET').toUpperCase();
  const isMutation = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  if (!isMutation) return next();
  if (!req.path.startsWith('/api/')) return next();
  if (ALLOW_PREFIXES.some((p) => req.path.startsWith(p))) return next();
  return res.status(402).json({ error: 'license_required', code: 'license_required', message: s.message });
}
