// Gated-services entitlement — the anti-piracy backbone for self-hosted tenants.
//
// The high-value features (Infinite Authority content, ShootCleaner, PixelSeal, the AI
// agent) run on OUR infrastructure and are reachable only with keys we issue. This module
// lets a tenant instance periodically validate its LICENCE against the entitlement server
// and cache which gated services it may use; a revoked/expired licence disables THOSE
// premium features locally — never the core CRM/site.
//
// Stub behaviour (Gate 0): if ENTITLEMENT_URL + LICENSE_KEY are unset (e.g. tenant-zero /
// dev), everything is enabled so the instance runs freely. Real enforcement activates only
// once a licence server is configured — so the mechanism ships now, the policy comes later
// (it lives in the entitlement server's response, not hardcoded here).

export type GatedService = 'ia' | 'ai-agent' | 'shootcleaner' | 'pixelseal';
export const GATED_SERVICES: GatedService[] = ['ia', 'ai-agent', 'shootcleaner', 'pixelseal'];

interface Entitlement {
  enabled: GatedService[];   // services this tenant may use
  expiresAt: number | null;  // epoch ms; null = no expiry
  fetchedAt: number;
}

const TTL_MS = 15 * 60 * 1000; // re-check at most every 15 min
let cache: Entitlement | null = null;
let inflight: Promise<Entitlement> | null = null;

function permissive(): Entitlement {
  return { enabled: [...GATED_SERVICES], expiresAt: null, fetchedAt: Date.now() };
}

async function fetchEntitlement(): Promise<Entitlement> {
  const url = process.env.ENTITLEMENT_URL;
  const key = process.env.LICENSE_KEY;
  if (!url || !key) return permissive(); // unconfigured → all enabled (stub)
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) throw new Error(`entitlement ${res.status}`);
    const j: any = await res.json();
    const enabled = Array.isArray(j.enabled)
      ? (j.enabled as any[]).filter((s): s is GatedService => (GATED_SERVICES as string[]).includes(s))
      : [];
    const expiresAt = j.expiresAt ? new Date(j.expiresAt).getTime() : null;
    return { enabled, expiresAt, fetchedAt: Date.now() };
  } catch (e: any) {
    // Fail-safe: on a licence-server blip keep the LAST known entitlement (grace) rather
    // than hard-disabling — never down a paying tenant over a transient network error.
    console.warn('[entitlement] check failed:', e?.message || e);
    return cache || permissive();
  }
}

/** Cached entitlement (refreshes past the TTL or once expired). */
export async function getEntitlement(): Promise<Entitlement> {
  const fresh = cache
    && (Date.now() - cache.fetchedAt) < TTL_MS
    && (!cache.expiresAt || cache.expiresAt > Date.now());
  if (fresh) return cache as Entitlement;
  if (!inflight) inflight = fetchEntitlement().then((e) => { cache = e; inflight = null; return e; });
  return inflight;
}

/** Is this tenant currently entitled to use `service`? */
export async function isEntitled(service: GatedService): Promise<boolean> {
  const e = await getEntitlement();
  if (e.expiresAt && e.expiresAt <= Date.now()) return false;
  return e.enabled.includes(service);
}

/** Express middleware to gate a premium route behind a service entitlement. */
export function requireEntitlement(service: GatedService) {
  return async (_req: any, res: any, next: any) => {
    if (await isEntitled(service)) return next();
    return res.status(402).json({ error: 'entitlement_required', service, code: 'not_entitled' });
  };
}
