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
  const key = platformKey();
  if (!key) {
    console.warn(`[${label}] no platform OpenAI key — platform-funded generation is unavailable`);
    return null;
  }
  const C = await ctor();
  return new C({ apiKey: key, ...options });
}

/**
 * THE PLATFORM'S KEY, from a slot the tenant cannot write.
 *
 * This function exists because reading process.env.OPENAI_API_KEY here was WRONG, and wrong in
 * the direction that costs a customer money. That variable is not the platform's — it is a
 * shared, mutable slot that the studio's own key overwrites, by two separate routes:
 *
 *   server/technical-setup-routes.ts:413  `if (openaiApiKey) process.env.OPENAI_API_KEY = ...`
 *       Unconditional, at runtime, the moment a studio saves a key in Technical Setup.
 *   server/config-reader.ts:343  hydrateEnvFromDb(), at every boot
 *       Copies studio_integrations.openai_api_key_encrypted into OPENAI_API_KEY. Its guard is
 *       `if (process.env[envName]) continue`, which only protects a slot that is ALREADY set —
 *       and an AxixOS-provisioned tenant deliberately has no OPENAI_API_KEY, so on exactly the
 *       deployments this product is sold as, the studio's key lands in the platform's slot and
 *       stays there.
 *
 * The consequence was total rather than occasional: with the gateway returning 404 today, every
 * ai.landing, ai.authority_map and ai.authority_from_crawl call falls through to the direct
 * path — so the homepage rewrite, the authority map and up to six pillar pages, the entire
 * sales pitch the platform is supposed to fund, were billed to the studio's own OpenAI account.
 * The docblock above says "Never the studio's key, even when they have one." It was not true.
 *
 * TWO SLOTS, IN ORDER:
 *   1. PLATFORM_OPENAI_API_KEY — explicit, and nothing in this codebase ever writes it. This is
 *      the one to set going forward. It mirrors what AxixOS did on their own side for exactly
 *      this reason, and the TAVILY_PLATFORM_API_KEY separation config-reader already documents.
 *   2. A snapshot of OPENAI_API_KEY taken at MODULE LOAD, which is before hydrateEnvFromDb runs
 *      (server/index.ts:397, inside async boot) and before any request can reach Technical
 *      Setup. Existing deployments keep working without a config change; a studio saving their
 *      own key afterwards cannot reach this value, because it was copied before they could.
 *
 * The live process.env.OPENAI_API_KEY is never read here again.
 */
const PLATFORM_KEY_AT_BOOT = (process.env.OPENAI_API_KEY || '').trim();

function platformKey(): string | null {
  const explicit = (process.env.PLATFORM_OPENAI_API_KEY || '').trim();
  if (explicit) return explicit;
  return PLATFORM_KEY_AT_BOOT || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE GATEWAY
// ═══════════════════════════════════════════════════════════════════════════

/** The three platform-funded jobs, by the names the AxixOS registry knows them by. */
export type PlatformPurpose = 'ai.landing' | 'ai.authority_map' | 'ai.authority_from_crawl';

/**
 * What the gateway pins server-side, mirrored here for the DIRECT path ONLY.
 *
 * Not a source of truth — GET /v1/ai/purposes is, and the gateway ignores anything we send.
 * These exist so the fallback produces the SAME output as the gateway. If the direct path kept
 * its own parameters, a studio's homepage would differ depending on whether the gateway
 * happened to be deployed, and nothing on either side would report a change.
 *
 * Two of these are deliberate changes from what the code sent before, both to match the pins:
 * the authority map was temperature 0.6 / 2200 tokens, and the crawl distil was 0.2 / 300.
 *
 * The 0.2 one is worth raising with AxixOS rather than absorbing quietly. ai.authority_from_crawl
 * is a field-extraction job — pull businessName, niche, city out of page text — and 0.7 is a
 * creative-writing temperature. Matching it here is the lesser evil, because a fallback that
 * behaves differently from the gateway is a bug you cannot see; but the pin itself is wrong for
 * the job, and it is one field on their side.
 */
const REGISTRY: Record<PlatformPurpose, { model: string; maxTokens: number; temperature: number }> = {
  'ai.landing': { model: 'gpt-4o', maxTokens: 8000, temperature: 0.8 },
  'ai.authority_map': { model: 'gpt-4o', maxTokens: 4000, temperature: 0.7 },
  'ai.authority_from_crawl': { model: 'gpt-4o', maxTokens: 4000, temperature: 0.7 },
};

/** Their 75s upstream ceiling plus room, so a slow generation is THEIR structured 504 and
 *  not our client giving up first and having to guess why. */
const GATEWAY_TIMEOUT_MS = 90_000;

/**
 * A refusal the gateway gave us, carrying its own reason.
 *
 * The whole point of the envelope is that these are eight different situations, not one. A
 * spent allowance, an unfunded platform key and a transient metering outage need different
 * words and different retry behaviour; collapsing them into "AI is not configured" tells a
 * studio something false in at least three of the cases.
 */
export class PlatformAIRefusal extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status: number;
  readonly purpose: string;
  constructor(body: any, status: number, purpose: string) {
    super(body?.message || `Platform AI refused (${body?.error || status})`);
    this.name = 'PlatformAIRefusal';
    this.code = String(body?.error || `http_${status}`);
    this.retryable = body?.retryable === true;
    this.status = status;
    this.purpose = purpose;
  }
}

/** True when the gateway has a key to present. Not whether it is deployed — see below. */
function gatewayKey(): string | null {
  const k = (process.env.AXIXOS_INTERNAL_API_KEY || '').trim();
  return k || null;
}

export interface PlatformCompletion {
  /** The raw string the model produced. Unparsed, exactly as the SDK returns it. */
  content: string;
  model: string;
  usage: any;
  /** Present only through the gateway, and null for a console key with no tenant to bill. */
  quota: { budget: number; used: number; remaining: number } | null;
  via: 'gateway' | 'openai';
}

/**
 * Run one platform-funded generation, through the gateway when it is there.
 *
 * THE SEAM. Every platform-funded call comes through here, which is what makes the gateway a
 * change to one function rather than to three generators.
 *
 * Falls back to a direct OpenAI call when the gateway is absent, per the agreed contract —
 * self-hosted installs and local development have no AxixOS key and must keep working.
 *
 * The 404 case is the one worth explaining. /v1/ai/complete is built but not yet merged on
 * AxixOS's side, so today a valid key gets a 404 from a service that is otherwise healthy.
 * Treating that as a refusal would break generation on the demo instance the moment this
 * ships, to no purpose — so a 404 falls through to the direct path exactly as a missing key
 * does, and says so once in the log. When they merge, the same code starts using the gateway
 * with no deploy on our side.
 */
export async function platformComplete(
  purpose: PlatformPurpose,
  messages: Array<{ role: string; content: string }>,
): Promise<PlatformCompletion> {
  const spec = REGISTRY[purpose];
  const key = gatewayKey();

  if (key) {
    const base = (process.env.AXIXOS_API_BASE || 'https://axixos-intelligence.onrender.com').replace(/\/+$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);
    try {
      const res = await fetch(`${base}/v1/ai/complete`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-axixos-api-key': key },
        // messages and an ADVISORY model, and nothing else. max_tokens, temperature and
        // response_format are validation errors here, not ignored fields — the registry owns
        // every parameter that costs money, which is the property that makes it a budget.
        body: JSON.stringify({ purpose, messages, model: spec.model }),
      });

      if (res.ok) {
        const body: any = await res.json();
        return {
          content: String(body?.content ?? ''),
          model: String(body?.model || spec.model),
          usage: body?.usage ?? null,
          quota: body?.quota ?? null,
          via: 'gateway',
        };
      }

      if (res.status === 404) {
        console.warn(`[${purpose}] gateway not deployed yet (404) — falling back to a direct OpenAI call`);
      } else {
        const body: any = await res.json().catch(() => ({}));
        throw new PlatformAIRefusal(body, res.status, purpose);
      }
    } catch (e: any) {
      if (e instanceof PlatformAIRefusal) throw e;
      // A network failure or our own 90s abort. Falling back is right: the direct path may
      // well work, and refusing because a partner was unreachable helps nobody.
      console.warn(`[${purpose}] gateway unreachable (${e?.name === 'AbortError' ? 'timeout' : e?.message}) — falling back`);
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Direct, with the registry's parameters so both paths agree ──
  const openai = await platformOpenAI(purpose);
  if (!openai) throw new NoOpenAIError();
  const completion = await openai.chat.completions.create({
    model: spec.model,
    messages: messages as any,
    temperature: spec.temperature,
    max_tokens: spec.maxTokens,
    response_format: { type: 'json_object' },
  });
  return {
    content: completion.choices[0]?.message?.content || '',
    model: completion.model,
    usage: completion.usage,
    quota: null,
    via: 'openai',
  };
}

/**
 * The platform cannot generate right now. Never the studio's fault, and never their fix.
 *
 * Defined HERE, next to the code that throws it, and re-exported from landing-generator so
 * every existing importer keeps working.
 *
 * It was briefly a second class that set `this.name = 'NoOpenAIError'` so the name-based
 * branches in routes.ts would keep matching. That worked for those, and silently broke the two
 * `instanceof NoOpenAIError` checks — including authority-scaffold's, which aborts a per-pillar
 * loop precisely so that N pillars do not each make a doomed call. A class lying about its name
 * satisfies whichever half of your codebase asks the question the way you happened to test.
 *
 * The default message names no environment variable. That string is echoed to the browser by
 * two routes, and OPENAI_API_KEY means nothing to a photographer with no shell on the host.
 */
export class NoOpenAIError extends Error {
  constructor(message = 'Site generation is not available on this instance yet') {
    super(message);
    this.name = 'NoOpenAIError';
  }
}

/**
 * Parse what a model returned as JSON, without assuming it obeyed.
 *
 * The old line was `JSON.parse(completion.choices[0]?.message?.content || '{}')`, unguarded.
 * It survived only because response_format: json_object was set on every call; anything that
 * relaxed or lost that — including moving to a gateway whose published registry does not list
 * response_format among the pinned fields — turns a code-fenced reply into a thrown SyntaxError
 * halfway through onboarding, surfacing as a generic 500.
 */
export function parseModelJson(raw: string, label: string): any {
  const text = String(raw || '').trim();
  if (!text) throw new Error(`${label} returned nothing to parse`);
  // ```json … ``` despite every prompt saying not to. Cheaper to accept than to re-run.
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const body = fenced ? fenced[1] : text;
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${label} returned text that is not JSON: ${body.slice(0, 120)}…`);
  }
}

/**
 * The resolved KEY rather than a client, for callers that speak HTTP directly.
 *
 * Not every call site uses the SDK. Large parts of this server call api.openai.com with a bare
 * fetch and an `Authorization: Bearer ...` header — the Assistants API flows in autoblog and
 * routes, mostly, because the SDK's assistants surface kept changing. v1.9.153 swept for
 * `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })` and declared the server clean; it never
 * looked for those, and a Bearer header is exactly as much a billing decision as a constructor.
 *
 * Same order as tenantOpenAI: the studio's stored key first, the platform's only as a fallback,
 * and it says which one paid. Returns null when neither exists, so a caller can refuse honestly
 * instead of sending the string "Bearer undefined" — which is what a provisioned tenant, having
 * deliberately no OPENAI_API_KEY, sends today.
 */
export async function tenantOpenAIKey(label: string): Promise<string | null> {
  let key: string | undefined;
  try {
    const { config } = await import('../config-reader');
    key = (await config.get('openai_api_key')) as string;
  } catch {
    // A missing column or an unreachable database is "not configured", not a crash.
  }
  if (key) return key;

  const platform = process.env.OPENAI_API_KEY;
  if (platform) {
    console.warn(`[${label}] no tenant OpenAI key — this call bills to the PLATFORM key`);
    return platform;
  }
  return null;
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

/**
 * Can the platform fund generation at all? THE one definition.
 *
 * For callers that want to check before doing expensive preparatory work — reading the
 * database, distilling a crawl — rather than discovering it after.
 *
 * It has to answer the same question platformOpenAI() answers, because a pre-flight gate that
 * disagrees with the call it guards is worse than no gate: it refuses work the call would have
 * done, or waves through work the call then refuses, and either way the reason is invisible.
 * landing-generator's hasOpenAI() used to be a second, independent copy of this. The two
 * agreed only because they happened to read the same variable — and the AxixOS Blueprint stops
 * writing OPENAI_API_KEY to provisioned tenants, which is exactly the change that would have
 * pulled them apart, with the gate refusing before the gateway was ever reached.
 *
 * So: when platformOpenAI() learns about the gateway, this changes with it, in this file.
 */
export function platformAiConfigured(): boolean {
  // EITHER route counts. A provisioned tenant has an AxixOS key and deliberately no
  // OPENAI_API_KEY, so checking only the latter would refuse before the gateway was tried —
  // which is the precise failure this function was rewritten to remove.
  //
  // platformKey(), not process.env.OPENAI_API_KEY: this must agree with what platformOpenAI
  // will actually resolve, and the live variable is one a studio's own key overwrites. Reading
  // it here would report the platform funded when only the studio is.
  return !!(gatewayKey() || platformKey());
}
