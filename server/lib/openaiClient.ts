import type OpenAI from 'openai';

/**
 * Who pays for this call.
 *
 * The product's billing model has always been written down and almost never implemented.
 * The platform pays for the one-off site generation, so a prospective studio sees their
 * rebuilt website before they have configured anything; the studio's own key pays for
 * everything ongoing — the assistant, blog writing, translation, image analysis.
 *
 * Counted across the server: 27 OpenAI clients were constructed, 20 read
 * process.env.OPENAI_API_KEY directly, and exactly TWO resolved tenant-first. So blog
 * generation, translation, alt text and manual page writing billed the platform for the
 * life of every tenant, and a studio who entered their own key had no way to take over
 * their own spend.
 *
 * The split lived in a comment above one function. It lives here now, as two functions, so
 * that choosing wrongly requires choosing rather than forgetting — and so the move to the
 * AxixOS gateway is one change in one file rather than three.
 */

/** Extra SDK options a caller needs — retries, timeouts. Merged over the resolved key. */
type ClientOptions = Record<string, unknown>;

/** Cached only to avoid re-importing the SDK; the KEY is resolved on every call. */
let OpenAICtor: typeof OpenAI | null = null;
async function ctor(): Promise<typeof OpenAI> {
  if (!OpenAICtor) OpenAICtor = (await import('openai')).default;
  return OpenAICtor;
}

/**
 * THE STUDIO PAYS. Their stored key first, the platform's only as a fallback.
 *
 * Order matters and it used to be the wrong way round in the one place this existed.
 * OPENAI_API_KEY is set on the deployment because onboarding needs it, so reading env first
 * meant env was ALWAYS present and a tenant's own key was never reached.
 *
 * The fallback stays deliberately: a studio who has not entered a key still gets a working
 * assistant rather than a broken one. But which key paid is logged rather than silent,
 * because "the platform quietly funds the long tail of studios who never configure" is a
 * decision somebody should be able to see in the logs and price.
 */
export async function tenantOpenAI(label: string, options: ClientOptions = {}): Promise<InstanceType<typeof OpenAI> | null> {
  let key: string | undefined;
  let source: 'tenant' | 'platform' = 'tenant';

  try {
    const { config } = await import('../config-reader');
    key = (await config.get('openai_api_key')) as string;
  } catch {
    // A missing column or an unreachable database is "not configured", not a crash.
  }

  if (!key) {
    key = process.env.OPENAI_API_KEY;
    source = 'platform';
  }
  if (key && source === 'platform') {
    console.warn(`[${label}] no tenant OpenAI key — this call bills to the PLATFORM key`);
  }

  if (!key) return null;
  const C = await ctor();
  return new C({ apiKey: key, ...options });
}

/**
 * THE PLATFORM PAYS. Never the studio's key, even when they have one.
 *
 * Only for the one-off work that happens before a studio has agreed to anything: reading
 * their existing site and writing them a homepage and an authority map from it. Three call
 * sites, all inside onboarding.
 *
 * Deliberately does NOT fall back to a tenant key. If the platform has not funded this, the
 * honest outcome is "we could not generate your site" — charging a studio for the sales
 * pitch would invert the whole model.
 *
 * THIS IS THE SEAM FOR THE GATEWAY. AxixOS smarthub now exposes POST /v1/ai/complete with
 * a server-side purpose registry that pins model, max_tokens, temperature and
 * response_format, enforces a per-tenant lifetime budget, and fails closed when it cannot
 * count. When that lands, this function is what changes — and because every platform-funded
 * call already comes through here, nothing else has to.
 */
export async function platformOpenAI(label: string, options: ClientOptions = {}): Promise<InstanceType<typeof OpenAI> | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn(`[${label}] no platform OpenAI key — platform-funded generation is unavailable`);
    return null;
  }
  const C = await ctor();
  return new C({ apiKey: key, ...options });
}

/**
 * The same resolution, but throwing instead of returning null.
 *
 * For call sites that cannot sensibly carry on without a client and sit inside a handler
 * with error handling of its own. Returning null there means the next line dereferences it
 * and the studio gets "Cannot read properties of null (reading 'chat')", which is strictly
 * less useful than the OpenAI auth error the placeholder key used to produce.
 */
export async function requireTenantOpenAI(label: string, options: ClientOptions = {}) {
  const c = await tenantOpenAI(label, options);
  if (!c) throw new Error('No OpenAI key is configured. Add one in Settings to use this feature.');
  return c;
}

/** True when the platform can fund generation. For callers that check before starting. */
export function platformAiConfigured(): boolean {
  return !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
}
