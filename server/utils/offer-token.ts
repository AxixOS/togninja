/**
 * Signed voucher-offer tokens.
 *
 * A landing page's CTA sends the customer to the voucher personalize→Stripe
 * flow at the offer's price. Because that URL is client-visible, a raw
 * `?amount=225` could be edited to pay less. Instead the SERVER mints an
 * HMAC-signed token carrying the amount + title; the checkout verifies it and
 * charges the SIGNED amount, ignoring any client-supplied price. A tampered
 * token fails verification and the checkout is rejected.
 *
 * The token body is base64url JSON (readable client-side only for DISPLAY);
 * the signature is what makes it authoritative server-side.
 */
import crypto from 'crypto';

const secret = () => process.env.JWT_SECRET || process.env.SESSION_SECRET || 'default-secret';

export interface OfferPayload {
  amount: number; // euros
  title: string;
  slug?: string; // voucher product slug — lets product-restricted coupons match this offer
}

export function signOfferToken(payload: OfferPayload): string {
  const cents = Math.max(0, Math.round(Number(payload.amount) * 100));
  const data: Record<string, unknown> = { a: cents, t: String(payload.title || 'Gutschein').slice(0, 120) };
  if (payload.slug) data.s = String(payload.slug).slice(0, 120);
  const body = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyOfferToken(token: string | undefined | null): OfferPayload | null {
  try {
    if (!token) return null;
    const [body, sig] = String(token).split('.');
    if (!body || !sig) return null;
    const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const cents = Number(parsed.a);
    if (!(cents > 0)) return null;
    return { amount: cents / 100, title: String(parsed.t || 'Gutschein'), slug: parsed.s ? String(parsed.s) : undefined };
  } catch {
    return null;
  }
}
