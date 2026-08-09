// Create the studio's Stripe webhook endpoint for it.
//
// The wizard used to ask a photographer to paste a webhook signing secret. That secret
// only exists AFTER you create an endpoint in Stripe's dashboard, so the field sent every
// buyer out of onboarding, into an interface they had never seen, to find a value whose
// purpose they could not judge. Skipping it looked harmless — nothing in the wizard
// failed — and the consequence appeared much later: a voucher paid for and never
// fulfilled, because no event ever reached /api/stripe/webhook.
//
// The secret key entered one field above is enough to do the whole thing over the API.

/** The events /api/stripe/webhook actually handles. Asking for more is noise. */
export const REQUIRED_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.expired',
];

export const WEBHOOK_PATH = '/api/stripe/webhook';

export interface WebhookSetupResult {
  ok: boolean;
  /** Present when we created (or re-created) an endpoint and have its signing secret. */
  secret?: string;
  endpointId?: string;
  url?: string;
  /** Set when an endpoint already existed and Stripe will not re-reveal its secret. */
  existedAlready?: boolean;
  message: string;
}

/**
 * The public origin Stripe should call back on. A webhook pointing at localhost or at a
 * preview host silently never fires in production, so this refuses to guess.
 */
export function resolveWebhookUrl(explicit?: string): string | null {
  const base = String(
    explicit ||
    process.env.PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    '',
  ).trim().replace(/\/+$/, '');
  if (!base) return null;
  try {
    const u = new URL(base);
    if (u.protocol !== 'https:') return null;           // Stripe requires HTTPS
    if (/localhost|127\.0\.0\.1/i.test(u.hostname)) return null;
    return `${u.origin}${WEBHOOK_PATH}`;
  } catch {
    return null;
  }
}

/**
 * Ensure a webhook endpoint exists for this studio and return its signing secret.
 *
 * Idempotent: an endpoint already pointing at this URL is reused rather than duplicated
 * — duplicates mean every payment is processed twice. Stripe only reveals a signing
 * secret at creation, so when a matching endpoint already exists and we have no stored
 * secret, that is reported plainly rather than papered over.
 */
export async function ensureStripeWebhook(
  secretKey: string,
  siteUrl?: string,
): Promise<WebhookSetupResult> {
  const url = resolveWebhookUrl(siteUrl);
  if (!url) {
    return {
      ok: false,
      message:
        'Cannot create the webhook automatically: this instance has no public HTTPS address yet. ' +
        'Set your site URL first, then save these keys again.',
    };
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey, { apiVersion: '2025-08-27.basil' as any });

    const existing = await stripe.webhookEndpoints.list({ limit: 100 });
    const match = existing.data.find((e: any) => e.url === url && e.status !== 'disabled');

    if (match) {
      // Make sure it still listens for everything we handle — an endpoint created for an
      // older version of the app can be missing events added since.
      const enabled: string[] = (match as any).enabled_events || [];
      const missing = REQUIRED_WEBHOOK_EVENTS.filter((e) => !enabled.includes(e) && !enabled.includes('*'));
      if (missing.length) {
        await stripe.webhookEndpoints.update(match.id, {
          enabled_events: [...new Set([...enabled, ...REQUIRED_WEBHOOK_EVENTS])] as any,
        });
      }
      return {
        ok: true,
        existedAlready: true,
        endpointId: match.id,
        url,
        message: missing.length
          ? `A webhook for this site already existed; added the ${missing.length} event(s) it was missing. Its signing secret is only shown by Stripe at creation — if payments are not being confirmed, delete it in Stripe and save again to have a new one created.`
          : 'A webhook for this site already exists in Stripe and is listening for the right events.',
      };
    }

    const created = await stripe.webhookEndpoints.create({
      url,
      enabled_events: REQUIRED_WEBHOOK_EVENTS as any,
      description: 'TogNinja — vouchers and checkout',
    });

    const secret = (created as any).secret as string | undefined;
    if (!secret) {
      return { ok: false, endpointId: created.id, url, message: 'Stripe created the webhook but returned no signing secret.' };
    }
    return { ok: true, secret, endpointId: created.id, url, message: `Webhook created at ${url}. Payments will now be confirmed automatically.` };
  } catch (err: any) {
    const raw = String(err?.message || err);
    // The most common cause by far: a restricted key without webhook permissions.
    if (/permission|not have access|restricted/i.test(raw)) {
      return {
        ok: false,
        message: `This Stripe key cannot create webhooks (${raw}). Use a standard secret key, or add the webhook endpoint by hand in Stripe and paste its signing secret.`,
      };
    }
    return { ok: false, message: `Could not create the webhook in Stripe: ${raw}` };
  }
}
