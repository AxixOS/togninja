// coupons.ts — live-reloading coupons from COUPONS_JSON with a small cache

export type CouponType = 'percent' | 'amount';

export interface Coupon {
  code: string; // uppercased
  type: CouponType; // 'percent' or 'amount' (amount in cents)
  value: number; // percent 0-100 or amount in cents
  skus: string[]; // as provided
  startsAt?: string;
  endsAt?: string;
  minOrderCents?: number;
}

const TTL = Math.max(10, Number(process.env.COUPON_RELOAD_SECONDS || 60)) * 1000;

// ARCHITECTURE NOTE: This service is now 100% database-driven.
// NO hardcoded coupon defaults - all coupons come from environment or database.
// ALL coupon codes (VCWIEN, CL50, WL50, VW50, etc.) must be managed in the database.
// This ensures business logic changes don't require code deployments.

function parseCouponsFromEnv(): any[] {
  try {
    const raw = process.env.COUPONS_JSON || '[]';
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function normalizeCoupon(c: any): Coupon | null {
  if (!c || !c.code || !c.type || !c.value || !Array.isArray(c.skus)) return null;
  const type = String(c.type).toLowerCase();
  if (type !== 'percent' && type !== 'amount') return null;
  const value = Number(c.value);
  if (!Number.isFinite(value) || value <= 0) return null;
  const code = String(c.code).trim().toUpperCase();
  const skus = Array.from(new Set((c.skus as any[]).map((s) => String(s))));
  const obj: Coupon = { code, type, value, skus } as Coupon;
  if (c.startsAt) obj.startsAt = String(c.startsAt);
  if (c.endsAt) obj.endsAt = String(c.endsAt);
  if (c.minOrderCents) obj.minOrderCents = Number(c.minOrderCents) || 0;
  return obj;
}

function loadCouponsSafe(): Coupon[] {
  // Database-driven ONLY. No hardcoded fallback.
  // Coupons must come from environment configuration.
  const envCoupons = parseCouponsFromEnv().map(normalizeCoupon).filter(Boolean) as Coupon[];
  return envCoupons;
}

let cache: { coupons: Coupon[]; ts: number } = { coupons: loadCouponsSafe(), ts: 0 };

function getCoupons(): Coupon[] {
  const now = Date.now();
  if (now - cache.ts > TTL) {
    cache.coupons = loadCouponsSafe();
    cache.ts = now;
  }
  return cache.coupons;
}

export function forceRefreshCoupons(): number {
  cache = { coupons: loadCouponsSafe(), ts: Date.now() };
  return cache.coupons.length;
}

export function findCoupon(code?: string | null): Coupon | null {
  if (!code) return null;
  const needle = String(code).trim().toUpperCase();
  // Database-driven ONLY. Search only environment-configured coupons.
  // No hardcoded fallback to built-in defaults.
  return getCoupons().find((c) => c.code === needle) || null;
}

export function isCouponActive(c: Coupon): boolean {
  const now = Date.now();
  if (c.startsAt && now < Date.parse(c.startsAt)) return false;
  if (c.endsAt && now > Date.parse(c.endsAt)) return false;
  return true;
}

export function allowsSku(c: Coupon, sku?: string | null): boolean {
  if (!sku) return false;
  const s = String(sku).toLowerCase();
  return c.skus.some((k) => {
    const key = String(k).toLowerCase();
    if (key === '*' || key === 'all') return true;
    return key === s;
  });
}
