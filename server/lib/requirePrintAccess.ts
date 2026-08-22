// Who may touch the print-lab routes?
//
// /api/print was mounted with no authentication of any kind. The router's own comment
// admitted it: "router-level auth is added in the order-flow hardening pass (Phase 2)".
// Phase 2 never happened. That left, to anyone on the internet:
//
//   POST   /api/print/catalog        create print products
//   PUT    /api/print/catalog/:id    change their prices
//   DELETE /api/print/catalog/:id    delete the studio's catalogue
//   GET    /api/print/orders         SELECT po.* — every buyer's name, email, phone and
//                                    postal address
//   POST   /api/print/order          take an imageUrl STRAIGHT FROM THE REQUEST BODY and
//                                    dispatch it to Prodigi for physical fulfilment
//
// The last one is the worst and it has no payment step anywhere in its chain. An anonymous
// caller who has never seen a gallery could post any URL on the internet plus a shipping
// address and have the studio's Prodigi account print it and post it to them, billed to
// the studio.
//
// It is dormant rather than armed only because no Prodigi API key is configured yet — so
// it arms itself precisely when the studio starts using the feature. GET /orders and
// DELETE /catalog need no key and were live.
//
// Two audiences, two rules. Staff do everything. A gallery visitor may browse products,
// price them and order — and only for the gallery they hold a token for.
import type { Request, Response, NextFunction } from 'express';
import { verifyGalleryToken, bearerFrom } from './galleryToken';

/** Paths a gallery visitor legitimately needs, relative to the /api/print mount. */
const VISITOR_PATHS = new Set(['/products', '/quote', '/order']);

/** Prodigi calls this itself; it authenticates by its own signature check inside. */
const UNAUTHENTICATED_PATHS = new Set(['/webhook']);

export function requirePrintAccess(req: Request, res: Response, next: NextFunction) {
  if (UNAUTHENTICATED_PATHS.has(req.path)) return next();

  // Staff: the studio owns the catalogue, the orders and the Prodigi account.
  if ((req as any).user || (req as any).session?.userId) return next();

  if (!VISITOR_PATHS.has(req.path)) {
    return res.status(401).json({
      error: 'auth_required',
      message: 'Sign in to manage the print catalogue.',
    });
  }

  // Establish WHO before WHAT. Checking for the gallery id first meant an anonymous
  // caller got a 400 telling them which field to add — a refusal, but one that reads as
  // "malformed request" rather than "you are not allowed", and one that hands a prober a
  // hint. No credential at all is a 401, always.
  const token = bearerFrom(req);
  if (!token) {
    return res.status(401).json({
      error: 'auth_required',
      message: 'Open this gallery with the link and password from your email.',
    });
  }

  // The gallery id is what binds the token to the request: without it there is nothing to
  // check the token against, so an absent id is a refusal, not a pass.
  const galleryId = (req.body && req.body.galleryId) || req.query.galleryId;
  if (!galleryId) {
    return res.status(400).json({
      error: 'gallery_required',
      message: 'Open the gallery first.',
    });
  }

  const result = verifyGalleryToken(token, String(galleryId));
  if (!result.ok) {
    return res.status(result.reason === 'missing' ? 401 : 403).json({
      error: result.reason === 'missing' ? 'auth_required' : 'invalid_token',
      message: 'Open this gallery with the link and password from your email.',
    });
  }

  return next();
}

/**
 * Is the in-gallery print store switched on?
 *
 * Default OFF, deliberately. Placing an order dispatches to Prodigi for physical
 * fulfilment and NOTHING in that chain takes payment — no Stripe session, no invoice,
 * no charge — while the buyer's confirmation screen tells them an invoice is coming.
 * So even a perfectly authenticated client could order unlimited free prints at the
 * studio's expense.
 *
 * Authenticating the route (above) closes the anonymous hole. It does not make the
 * feature safe to sell through, and a security fix must not quietly leave a money hole
 * open behind it. Turning this on is therefore a deliberate act that should follow
 * wiring the Stripe leg — the machinery is already there in server/routes.ts
 * (createCheckoutSession + the signature-verified webhook).
 */
export function printStoreEnabled(): boolean {
  return /^(1|true|yes|on)$/i.test(process.env.PRINT_STORE_ENABLED || '');
}
