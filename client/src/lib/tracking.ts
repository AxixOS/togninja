/**
 * Conversion tracking helpers — fire GA4 (gtag) and Meta Pixel (fbq) events for
 * the actions that actually matter to the business: leads, add-to-cart, and
 * purchases.
 *
 * Design notes:
 * - These are SAFE no-ops when the trackers aren't loaded. GA4/Meta only load
 *   after the visitor grants consent (see ConsentScripts.tsx), so if a visitor
 *   declined analytics/marketing, nothing fires here — GDPR stays intact.
 * - Never throws. A tracking failure must never break a form submit or checkout.
 * - Currency is EUR throughout (the studio prices in euros).
 */

const CURRENCY = "EUR";

function gtag(...args: any[]): void {
  try {
    const fn = (window as any).gtag;
    if (typeof fn === "function") fn(...args);
  } catch {
    /* ignore */
  }
}

function fbq(...args: any[]): void {
  try {
    const fn = (window as any).fbq;
    if (typeof fn === "function") fn(...args);
  } catch {
    /* ignore */
  }
}

/**
 * A lead was captured (contact form, waitlist/appointment request, newsletter).
 * `source` describes which form so you can segment in GA4/Meta.
 */
export function trackLead(source: string, extra?: Record<string, any>): void {
  gtag("event", "generate_lead", { lead_source: source, currency: CURRENCY, ...extra });
  fbq("track", "Lead", { content_name: source, ...extra });
}

/** A product/voucher was added to the cart. */
export function trackAddToCart(item: {
  name?: string;
  value?: number;
  quantity?: number;
  id?: string;
}): void {
  const value = typeof item.value === "number" ? item.value : undefined;
  gtag("event", "add_to_cart", {
    currency: CURRENCY,
    value,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        price: value,
        quantity: item.quantity ?? 1,
      },
    ],
  });
  fbq("track", "AddToCart", {
    content_name: item.name,
    content_ids: item.id ? [item.id] : undefined,
    value,
    currency: CURRENCY,
  });
}

/**
 * A purchase completed. Pass the Stripe session id as `transactionId` so GA4/Meta
 * de-duplicate, and the real charged `value` when known.
 */
export function trackPurchase(params: {
  transactionId?: string;
  value?: number;
  currency?: string;
}): void {
  const currency = params.currency || CURRENCY;
  gtag("event", "purchase", {
    transaction_id: params.transactionId,
    value: params.value,
    currency,
  });
  fbq("track", "Purchase", { value: params.value, currency });
}

/** Generic escape hatch for any other event you want to measure. */
export function trackEvent(name: string, params?: Record<string, any>): void {
  gtag("event", name, params || {});
}
