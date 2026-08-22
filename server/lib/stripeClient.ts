// Resolve the Stripe client when a request needs it, not when the module loads.
//
// THIS WAS STOPPING EVERY PAYMENT ON A WIZARD-ONBOARDED TENANT.
//
// server/routes.ts builds its Stripe client at module scope:
//
//     const stripeSecretKey = process.env.STRIPE_SECRET_KEY;   // routes.ts:1236
//     ...
//     stripe = new Stripe(stripeSecretKey, ...)                // routes.ts:1243
//
// and server/index.ts:15 imports routes STATICALLY. So that runs before
// index.ts:380 calls hydrateEnvFromDb(), which is what copies the studio's saved
// credentials out of the database into process.env.
//
// A studio that entered its Stripe key in the setup wizard has it in
// studio_integrations.stripe_secret_key_encrypted and NOT in the environment. The
// module-level client is therefore null for the entire life of the process, and all four
// guarded paths — invoice payment links, checkout creation, and the webhook itself —
// answer 503 "Payment service not configured". Verified on this instance: the key is
// present in the database, ecommerce_enabled is true, and the boot log still reads
// "⚠️ STRIPE_SECRET_KEY missing - Stripe disabled".
//
// Nothing surfaces that. Stripe records a delivery failure; the studio sees an order that
// never completes.
//
// config-reader documents this exact trap in its own header (config-reader.ts:307-310:
// "it cannot help module-level constants in statically-imported modules ... e.g. the
// top-level Stripe client in routes.ts"). It was a known limitation nobody had closed.
//
// Resolving lazily fixes vouchers, invoices and print orders together, because they all
// go through the same client and the same webhook.
import Stripe from 'stripe';
import { config } from '../config-reader';

// Pinned to match the client routes.ts already constructs, so behaviour cannot diverge
// depending on which one happened to resolve first.
const API_VERSION = '2025-08-27.basil' as const;

let cached: Stripe | null = null;
let resolvedFor: string | null = null;

const looksLikePlaceholder = (key: string) =>
  key.includes('dummy') || key.includes('xxx') || key.length < 20;

/**
 * The Stripe client, or null when this studio genuinely has no key.
 *
 * Checks the environment first — an operator-set key must win over a stale database row,
 * which is the same precedence hydrateEnvFromDb uses — then falls back to the studio's
 * saved credentials.
 */
export async function getStripe(): Promise<Stripe | null> {
  let key = (process.env.STRIPE_SECRET_KEY || '').trim();

  if (!key) {
    try {
      key = String((await config.get('stripe_secret_key')) || '').trim();
      // Put it back into the environment so anything else reading process.env directly
      // this request — and there is a lot of it — sees the same key.
      if (key) process.env.STRIPE_SECRET_KEY = key;
    } catch {
      // Best-effort: a database hiccup must not turn into an unhandled rejection inside
      // a webhook handler that Stripe is waiting on.
      return cached;
    }
  }

  if (!key || looksLikePlaceholder(key)) return null;
  if (cached && resolvedFor === key) return cached;

  try {
    cached = new Stripe(key, { apiVersion: API_VERSION });
    resolvedFor = key;
    return cached;
  } catch (err) {
    console.warn('[stripe] could not construct a client:', (err as Error)?.message);
    return null;
  }
}

/**
 * The webhook signing secret.
 *
 * Same problem, same shape: STRIPE_WEBHOOK_SECRET is read at request time in the handler,
 * but only ever from process.env, so a studio whose secret lives in the database fails
 * signature verification on every event.
 */
export async function getStripeWebhookSecret(): Promise<string | null> {
  const fromEnv = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  if (fromEnv) return fromEnv;
  try {
    const fromDb = String((await config.get('stripe_webhook_secret')) || '').trim();
    if (fromDb) {
      process.env.STRIPE_WEBHOOK_SECRET = fromDb;
      return fromDb;
    }
  } catch { /* fall through */ }
  return null;
}

/** Forget the cached client — for after the studio changes its key in the wizard. */
export function resetStripeClient(): void {
  cached = null;
  resolvedFor = null;
}
