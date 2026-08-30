/**
 * Technical Setup Wizard API Routes
 * 
 * Powers Stage 1 of onboarding: infrastructure & credentials.
 * 7 steps: Welcome, Domain, Email, Stripe, Storage, Extras, Security
 * 
 * All secrets are encrypted before storage using `utils/encryption.ts`.
 * The config-reader module reads them back (with decryption) at runtime.
 */

import { Router, Request, Response } from 'express';
import { db } from './db';
import {
  studioConfigs,
  studioIntegrations,
  studios,
  adminUsers,
} from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { encrypt } from './utils/encryption';
import { config } from './config-reader';
import { invalidateTransporter } from './utils/smtp-helper';

const router = Router();

// ──────────────────────────────────────────────────────────────
// GET /api/setup/technical/status
// Returns current technical setup progress
// ──────────────────────────────────────────────────────────────
/**
 * What is ACTUALLY connected, read from the database every time.
 *
 * Extracted so the bypass branch and the fresh-instance branch cannot disagree — they did,
 * and the bypass was the one that lied. A studio is far better served by "Stripe is not
 * connected" on an instance that works than by a green tick on one that cannot take a payment.
 */
async function measureSteps() {
  const [sc] = await db.select().from(studioConfigs).limit(1);

  // ASK WHAT ACTUALLY DECIDES, not two columns that look like it.
  //
  // The first version of this read studio_integrations directly, and was wrong in BOTH
  // directions on the same instance. Storage reported false on the live demo while its
  // photographs were demonstrably being served out of Backblaze — because storage is resolved
  // by getS3Config(), which reads the environment as well as the database, and this was only
  // looking at two columns. Meanwhile the same screen's banner, driven by capabilityStates(),
  // said something different again.
  //
  // Two opinions about one question is how they came to disagree, and the studio was shown
  // both at once. capabilityStates() is what the admin banner already uses and what gates the
  // features themselves, so it is the answer that is true by construction: if it says email is
  // unavailable, sending an email really will fail.
  let caps: Array<{ key: string; available: boolean }> = [];
  try {
    const { capabilityStates } = await import('./lib/capabilities');
    caps = (await capabilityStates()) as any[];
  } catch (e: any) {
    console.warn('[technical-setup] capability read failed, falling back to columns:', e?.message || e);
  }
  const can = (key: string): boolean => caps.find((c) => c.key === key)?.available ?? false;

  // Fallback only for the case above — no capability list at all.
  const [si] = caps.length ? [null as any] : await db.select().from(studioIntegrations).limit(1);

  return {
    // Not a capability: it is a field the studio types, and APP_URL from the environment
    // counts, which is how a Blueprint-provisioned instance has one without being asked.
    domain: !!(sc?.appUrl || sc?.frontendUrl || process.env.APP_URL || process.env.PUBLIC_SITE_URL),
    email: caps.length ? can('sending_email') : !!(si?.smtp_host && si?.smtp_user),
    stripe: caps.length ? can('online_payments') : !!(si?.stripe_publishable_key && si?.stripe_secret_key_encrypted),
    storage: caps.length ? can('file_storage') : !!(si?.storage_access_key_id && si?.storage_bucket),
    extras: caps.length ? can('ai_features') : !!(si?.openai_api_key_encrypted),
    security: true,
  };
}

router.get('/status', async (_req: Request, res: Response) => {
  try {
    // ── BULLETPROOF CHECK: Use raw SQL so we don't depend on Drizzle column mapping ──
    // If an admin user exists, this is an established instance → always allow through
    let hasAdmin = false;
    try {
      const adminCheck = await db.execute(sql`SELECT EXISTS(SELECT 1 FROM admin_users LIMIT 1) AS has_admin`);
      hasAdmin = !!(adminCheck.rows?.[0] as any)?.has_admin;
    } catch {
      // admin_users table might not exist on a truly fresh instance
    }

    // Environment variable override: SKIP_ONBOARDING=true bypasses wizard entirely
    if (process.env.SKIP_ONBOARDING === 'true' || hasAdmin) {
      // NO WRITE HERE ANY MORE.
      //
      // This GET used to persist technical_setup_complete = true AND creative_setup_complete
      // = true, "so this short-circuits next time". Two problems, and the second is serious.
      //
      // A GET that mutates is surprising by itself: this endpoint is polled by the admin
      // shell and by three setup screens, so merely LOOKING at a page rewrote both flags.
      //
      // And creative_setup_complete is not this endpoint's flag to set. It gates the whole
      // /api/setup mount, where true means "every mutation needs authentication". Writing it
      // from a status poll can shut a studio out of their own wizard between one page load
      // and the next, and the SKIP_ONBOARDING half of this condition makes that reachable
      // with NO admin account at all — precisely the state in which nobody can authenticate.
      // Nothing reads what this wrote: the branch answers from the condition it just
      // evaluated, so removing the write changes no behaviour here.

      console.log(`[technical-setup] Bypassing wizard (admin=${hasAdmin}, env=${process.env.SKIP_ONBOARDING})`);
      const bypassSteps = await measureSteps();
      return res.json({
        technicalSetupComplete: true,
        // TWO DIFFERENT QUESTIONS, and this answered both with the first one.
        //
        // technicalSetupComplete asks "should the wizard be shown", and no is right — a studio
        // with an admin account must not be trapped in onboarding. steps asks "what is actually
        // connected", which is not the same thing. Every one was hardcoded true, so a live
        // instance reported Stripe, SMTP and storage configured while the admin banner beside
        // it said "5 things left to connect", and the checklist showed green ticks against
        // services that had never been given a key.
        steps: bypassSteps,
        // Computed, not asserted. This said 100 while four of the six steps were false — the
        // same claim the steps themselves had just stopped making.
        progress: Math.round(
          (Object.values(bypassSteps).filter(Boolean).length / Object.keys(bypassSteps).length) * 100,
        ),
        hasStudioConfig: true,
        hasIntegrations: true,
      });
    }

    // ── Fresh instance: run detailed step checks ──
    const [sc] = await db.select().from(studioConfigs).limit(1);
    const [si] = await db.select().from(studioIntegrations).limit(1);

    // security is false here specifically: this branch is only reached when no admin exists.
    const steps = { ...(await measureSteps()), security: false };

    const completedCount = Object.values(steps).filter(Boolean).length;
    const totalSteps = Object.keys(steps).length;

    const isComplete = sc?.technicalSetupComplete ?? false;

    res.json({
      technicalSetupComplete: isComplete,
      steps,
      progress: Math.round((completedCount / totalSteps) * 100),
      hasStudioConfig: !!sc,
      hasIntegrations: !!si,
    });
  } catch (error) {
    console.error('[technical-setup] Status error:', error);
    // On ANY error, let the user through rather than trapping them in the wizard
    res.json({
      technicalSetupComplete: true,
      steps: {},
      progress: 0,
      hasStudioConfig: false,
      hasIntegrations: false,
    });
  }
});

// ──────────────────────────────────────────────────────────────
// Helper: ensure studio_configs row exists
// ──────────────────────────────────────────────────────────────
async function ensureStudioConfig(): Promise<string> {
  const [existing] = await db.select().from(studioConfigs).limit(1);
  if (existing) return existing.id;

  const [created] = await db.insert(studioConfigs).values({
    studioName: 'My Studio',
    ownerEmail: 'admin@localhost',
  }).returning({ id: studioConfigs.id });
  return created.id;
}

// Helper: ensure studio_integrations row exists
async function ensureIntegrations(): Promise<string> {
  const [existing] = await db.select().from(studioIntegrations).limit(1);
  if (existing) return existing.id;

  // Need a studio first
  let [studio] = await db.select().from(studios).limit(1);
  if (!studio) {
    [studio] = await db.insert(studios).values({
      name: 'Default Studio',
      slug: 'default',
    }).returning();
  }

  const [created] = await db.insert(studioIntegrations).values({
    studioId: studio.id,
  }).returning({ id: studioIntegrations.id });
  return created.id;
}

// ──────────────────────────────────────────────────────────────
// POST /api/setup/technical/domain — Step 2: Domain & URLs
// ──────────────────────────────────────────────────────────────
router.post('/domain', async (req: Request, res: Response) => {
  try {
    const { appUrl, frontendUrl, publicSiteBaseUrl } = req.body;

    if (!appUrl && !frontendUrl) {
      return res.status(400).json({ error: 'At least one URL is required' });
    }

    const scId = await ensureStudioConfig();
    await db.update(studioConfigs).set({
      appUrl: appUrl || null,
      frontendUrl: frontendUrl || null,
      publicSiteBaseUrl: publicSiteBaseUrl || frontendUrl || null,
    }).where(eq(studioConfigs.id, scId));

    config.invalidate();
    res.json({ success: true });
  } catch (error) {
    console.error('[technical-setup] Domain save error:', error);
    res.status(500).json({ error: 'Failed to save domain settings' });
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/setup/technical/email — Step 3: SMTP + IMAP
// ──────────────────────────────────────────────────────────────
router.post('/email', async (req: Request, res: Response) => {
  try {
    const {
      smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure,
      fromEmail, fromName,
      imapHost, imapPort, imapUser, imapPass, imapTls,
      brevoApiKey,
    } = req.body;

    if (!smtpHost || !smtpUser) {
      return res.status(400).json({ error: 'SMTP host and user are required' });
    }

    const siId = await ensureIntegrations();
    
    const updateData: Record<string, any> = {
      smtp_host: smtpHost,
      smtp_port: parseInt(smtpPort) || 587,
      smtp_user: smtpUser,
      smtp_secure: smtpSecure === true || smtpSecure === 'true',
      default_from_email: fromEmail || smtpUser,
      email_from_name: fromName || null,
    };

    if (smtpPass) {
      updateData.smtp_pass_encrypted = encrypt(smtpPass);
    }

    // IMAP (optional)
    if (imapHost) {
      updateData.imap_host = imapHost;
      updateData.imap_port = parseInt(imapPort) || 993;
      updateData.imap_user = imapUser || smtpUser;
      updateData.imap_tls = imapTls !== false;
      if (imapPass) {
        updateData.imap_pass_encrypted = encrypt(imapPass);
      }
    }

    // Brevo (optional)
    if (brevoApiKey) {
      updateData.brevo_api_key_encrypted = encrypt(brevoApiKey);
    }

    await db.update(studioIntegrations).set(updateData).where(eq(studioIntegrations.id, siId));

    config.invalidate();
    invalidateTransporter(); // drop the cached SMTP transporter so new creds apply now
    res.json({ success: true });
  } catch (error) {
    console.error('[technical-setup] Email save error:', error);
    res.status(500).json({ error: 'Failed to save email settings' });
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/setup/technical/stripe — Step 4: Payments
// ──────────────────────────────────────────────────────────────
router.post('/stripe', async (req: Request, res: Response) => {
  try {
    const { publishableKey, secretKey, webhookSecret, skipEcommerce } = req.body;

    // Turning the shop back ON without re-entering keys. The wizard's opt-out is not a
    // one-way door: a studio that said no at onboarding and later wants to sell must be
    // able to reverse it from Settings → Payments, using the keys it may already have.
    if (req.body.enableEcommerce === true && !publishableKey && !secretKey) {
      const siId = await ensureIntegrations();
      await db.update(studioIntegrations)
        .set({ ecommerce_enabled: true } as any)
        .where(eq(studioIntegrations.id, siId));
      config.invalidate();
      const [row] = await db.select().from(studioIntegrations).where(eq(studioIntegrations.id, siId)).limit(1);
      const hasKeys = !!(row as any)?.stripe_secret_key_encrypted;
      return res.json({
        success: true,
        ecommerceEnabled: true,
        message: hasKeys
          ? 'Online payments are back on. Vouchers and checkout are visible again.'
          : 'Online payments are on, but no Stripe keys are saved yet — add them below before taking a payment.',
      });
    }

    // A studio that is not selling online should not be forced through Stripe at all.
    // Recorded explicitly so the wizard can stop asking AND the voucher shop can be
    // switched off — an opt-out that only skipped the gate would leave a shop on the
    // site that cannot take money.
    if (skipEcommerce) {
      const siId = await ensureIntegrations();
      await db.update(studioIntegrations)
        .set({ ecommerce_enabled: false } as any)
        .where(eq(studioIntegrations.id, siId));
      config.invalidate();
      return res.json({
        success: true,
        ecommerceEnabled: false,
        message: 'Online payments are off. Vouchers and checkout are hidden from your site; you can turn them on later in Settings → Payments.',
      });
    }

    if (!publishableKey || !secretKey) {
      return res.status(400).json({ error: 'Publishable key and secret key are required' });
    }

    const siId = await ensureIntegrations();
    const updateData: Record<string, any> = {
      stripe_publishable_key: publishableKey,
      stripe_secret_key_encrypted: encrypt(secretKey),
      ecommerce_enabled: true,
    };
    if (webhookSecret) {
      updateData.stripe_webhook_secret_encrypted = encrypt(webhookSecret);
    }

    // Create the webhook FOR them. Asking a photographer to paste a signing secret meant
    // leaving the wizard for Stripe's dashboard to fetch a value whose purpose they could
    // not judge — and skipping it failed silently, surfacing later as a voucher paid for
    // and never fulfilled. The secret key entered above is enough to do it over the API.
    let webhook: any = null;
    if (!webhookSecret) {
      const { ensureStripeWebhook } = await import('./services/stripeWebhookSetup.js');
      webhook = await ensureStripeWebhook(secretKey);
      if (webhook.ok && webhook.secret) {
        updateData.stripe_webhook_secret_encrypted = encrypt(webhook.secret);
      }
    }

    await db.update(studioIntegrations).set(updateData).where(eq(studioIntegrations.id, siId));

    config.invalidate();
    res.json({
      success: true,
      ecommerceEnabled: true,
      ...(webhook ? { webhook: { ok: webhook.ok, message: webhook.message, url: webhook.url } } : {}),
    });
  } catch (error) {
    console.error('[technical-setup] Stripe save error:', error);
    res.status(500).json({ error: 'Failed to save Stripe settings' });
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/setup/technical/prodigi — Prodigi print fulfilment (per-tenant key)
// ──────────────────────────────────────────────────────────────
router.post('/prodigi', async (req: Request, res: Response) => {
  try {
    const { apiKey, environment } = req.body;
    const siId = await ensureIntegrations();
    const updateData: Record<string, any> = {};
    // Only overwrite the key when the user actually typed a new one (masked otherwise).
    if (apiKey) updateData.prodigi_api_key_encrypted = encrypt(apiKey);
    if (environment !== undefined) {
      updateData.prodigi_environment = String(environment).toLowerCase() === 'production' ? 'production' : 'sandbox';
    }
    if (Object.keys(updateData).length > 0) {
      await db.update(studioIntegrations).set(updateData).where(eq(studioIntegrations.id, siId));
    }
    config.invalidate();
    res.json({ success: true });
  } catch (error) {
    console.error('[technical-setup] Prodigi save error:', error);
    res.status(500).json({ error: 'Failed to save Prodigi settings' });
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/setup/technical/storage — Step 5: File Storage
// ──────────────────────────────────────────────────────────────
router.post('/storage', async (req: Request, res: Response) => {
  try {
    // Trim every field — pasted creds routinely carry a trailing space/newline, and a
    // bucket like "Onboarding " fails with a misleading NoSuchBucket ("Bucket not found").
    const t = (v: any) => (typeof v === 'string' ? v.trim() : v);
    const provider = t(req.body.provider), accessKeyId = t(req.body.accessKeyId), secretKey = t(req.body.secretKey);
    const bucket = t(req.body.bucket), endpoint = t(req.body.endpoint), region = t(req.body.region);

    if (!accessKeyId || !bucket) {
      return res.status(400).json({ error: 'Access key and bucket are required' });
    }

    // Reject a region that contradicts the endpoint HERE too, not only on Test
    // Connection. Testing was optional, so a studio could save a mismatched pair, skip
    // the test and discover it later as uploads failing with an error that never
    // mentions the region.
    const { describeRegionMismatch } = await import('./services/s3-storage');
    const regionProblem = describeRegionMismatch(endpoint, region);
    if (regionProblem) {
      return res.status(400).json({ error: 'Region mismatch', message: regionProblem });
    }

    const siId = await ensureIntegrations();
    // Store a clean, absolute endpoint. Owners paste bare hosts (Supabase or
    // Backblaze B2) without a scheme; normalise on save so the stored value is
    // valid, not just corrected on read. Provider-agnostic — covers B2 too.
    const { normalizeEndpoint } = await import('./services/s3-storage');
    const updateData: Record<string, any> = {
      storage_provider: provider || 'backblaze',
      storage_access_key_id: accessKeyId,
      storage_bucket: bucket,
      storage_endpoint: normalizeEndpoint(endpoint) || null,
      storage_region: region || null,
    };
    if (secretKey) {
      updateData.storage_secret_key_encrypted = encrypt(secretKey);
    }

    await db.update(studioIntegrations).set(updateData).where(eq(studioIntegrations.id, siId));

    config.invalidate();
    // Refresh the storage client cache so uploads use the new creds immediately.
    try {
      const { invalidateStorageConfig } = await import('./services/s3-storage');
      invalidateStorageConfig();
    } catch { /* best effort */ }
    res.json({ success: true });
  } catch (error) {
    console.error('[technical-setup] Storage save error:', error);
    // Surface the real reason — a generic message hid why saves 500 (e.g. a missing
    // ENCRYPTION_KEY breaking encrypt(), or a missing studio_integrations column).
    res.status(500).json({ error: `Failed to save storage settings: ${(error as Error)?.message || String(error)}` });
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/setup/technical/extras — Step 6: AI, Google, Analytics, SMS
// ──────────────────────────────────────────────────────────────
router.post('/extras', async (req: Request, res: Response) => {
  try {
    const {
      openaiApiKey, openaiAssistantId,
      anthropicApiKey,
      googleClientId, googleClientSecret, googleCalendarId,
      ga4MeasurementId, metaPixelId, pricingEmbedUrl,
      smsProvider, smsAccountSid, smsAuthToken, smsFromNumber,
      // Social & Reviews — each studio connects its OWN accounts here.
      googlePlacesApiKey, googlePlacesPlaceId,
      pulseApiKey, pulseProfiles, pulseMode,
      // Price Wizard competitor search. Optional — the platform key covers a studio who
      // never sets one; setting one moves them onto their own quota.
      searchApiKey,
    } = req.body;

    // Update studio_integrations
    const siId = await ensureIntegrations();
    const siUpdate: Record<string, any> = {};

    if (openaiApiKey) siUpdate.openai_api_key_encrypted = encrypt(openaiApiKey);
    if (openaiAssistantId) siUpdate.openai_assistant_id = openaiAssistantId;
    // Make new keys live immediately for env-reading features (agent, autoblog,
    // AI scans) without waiting for a restart to re-hydrate env from the DB.
    if (openaiApiKey) process.env.OPENAI_API_KEY = openaiApiKey;
    if (anthropicApiKey) process.env.ANTHROPIC_API_KEY = anthropicApiKey;
    if (anthropicApiKey) siUpdate.anthropic_api_key_encrypted = encrypt(anthropicApiKey);
    if (googleClientId) siUpdate.google_client_id = googleClientId;
    if (googleClientSecret) siUpdate.google_client_secret_encrypted = encrypt(googleClientSecret);
    if (googleCalendarId) siUpdate.google_calendar_id = googleCalendarId;
    if (smsProvider) siUpdate.sms_provider = smsProvider;
    if (smsAccountSid) siUpdate.sms_account_sid = smsAccountSid;
    if (smsAuthToken) siUpdate.sms_auth_token_encrypted = encrypt(smsAuthToken);
    if (smsFromNumber) siUpdate.sms_from_number = smsFromNumber;

    // Social & Reviews (per-tenant). Secrets encrypted at rest like the rest.
    // Only overwrite when the studio actually typed a new one — the field is masked on
    // load, so an untouched form must not blank a key they already have.
    if (searchApiKey) siUpdate.search_api_key_encrypted = encrypt(searchApiKey);
    if (googlePlacesApiKey) siUpdate.google_places_api_key_encrypted = encrypt(googlePlacesApiKey);
    if (googlePlacesPlaceId !== undefined) siUpdate.google_places_place_id = googlePlacesPlaceId || null;
    // Saving a key with no place id leaves reviews still off, and a place id is not
    // something a photographer can look up — Google does not show it anywhere. Resolve
    // it from the studio's own name and address, which onboarding already captured.
    // Best effort: never block the save, and never guess when Google is ambiguous.
    //
    // NOT when one is already stored. Onboarding now reads the place id straight out of the
    // Google Maps link the studio pastes, which is exact. Text Search is a guess from a name
    // and an address — a good one, and conservative, but it accepts a single candidate, and a
    // single WRONG candidate would replace a definitively correct id with another business's.
    // Falling back to a guess over a known answer is the wrong direction.
    const storedPlaceId = await (async () => {
      try {
        const existing = await config.get('google_places_place_id');
        return existing ? String(existing).trim() : '';
      } catch { return ''; }
    })();
    const resolvePlacesAfterSave = !!googlePlacesApiKey && !googlePlacesPlaceId && !storedPlaceId;
    if (pulseApiKey) siUpdate.pulse_api_key_encrypted = encrypt(pulseApiKey);
    if (pulseMode) siUpdate.pulse_mode = String(pulseMode).toLowerCase();
    if (pulseProfiles && typeof pulseProfiles === 'object') {
      // Keep only non-empty platform → account-id pairs.
      const cleaned = Object.fromEntries(
        Object.entries(pulseProfiles as Record<string, unknown>)
          .filter(([, v]) => v != null && String(v).trim())
          .map(([k, v]) => [String(k).toLowerCase(), String(v).trim()]),
      );
      siUpdate.pulse_profiles = Object.keys(cleaned).length ? cleaned : null;
    }

    if (Object.keys(siUpdate).length > 0) {
      await db.update(studioIntegrations).set(siUpdate).where(eq(studioIntegrations.id, siId));
    }

    let placesNote: string | undefined;
    if (resolvePlacesAfterSave) {
      config.invalidate(); // the key was only just written; the resolver has to read it
      try {
        const { resolvePlaceIdFromStudio } = await import('./services/googleReviews.js');
        const found = await resolvePlaceIdFromStudio();
        if ('placeId' in found) {
          await db.update(studioIntegrations)
            .set({ google_places_place_id: found.placeId } as any)
            .where(eq(studioIntegrations.id, siId));
          placesNote = `Live Google reviews connected to "${found.name}".`;
        } else {
          placesNote = found.error;
        }
      } catch (e: any) {
        placesNote = `Could not identify your Google listing automatically: ${e?.message || e}`;
      }
    }

    /**
     * What Google actually publishes for them, now that there is a key to ask with.
     *
     * The address the studio typed during setup comes from their own website, and their own
     * website is frequently behind: the listing this was built against says
     * "Đà Nẵng 51314" where their about page still says "Hoi An", because the province was
     * merged. Google's version is the one their clients are navigating by.
     *
     * OFFERED, NEVER APPLIED. It is returned as a note for the studio to act on, because the
     * two can legitimately differ — a studio-only entrance, a unit number Google drops — and
     * silently rewriting an address that goes onto invoices is not a thing to do on their
     * behalf. Whole block is best-effort: no key, no listing or a refused request all just
     * mean no note.
     */
    let addressNote: string | undefined;
    if (googlePlacesApiKey) {
      config.invalidate();
      try {
        const { getPlaceProfile } = await import('./services/googleReviews.js');
        const profile = await getPlaceProfile();
        if (profile?.address) {
          const stored = String((await config.get('address')) || '').trim();
          const flatten = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '');
          if (!stored) {
            addressNote = `Google lists your address as "${profile.address}".`;
          } else if (flatten(stored) !== flatten(profile.address)) {
            addressNote = `Google lists your address as "${profile.address}", which differs from the one on file ("${stored}"). Google's is what clients searching for you will see.`;
          }
        }
      } catch (e: any) {
        console.warn('[technical-setup] place profile lookup failed:', e?.message || e);
      }
    }

    // Update studio_configs for analytics
    const scId = await ensureStudioConfig();
    const scUpdate: Record<string, any> = {};
    if (ga4MeasurementId !== undefined) scUpdate.ga4MeasurementId = ga4MeasurementId || null;
    if (metaPixelId !== undefined) scUpdate.metaPixelId = metaPixelId || null;
    if (pricingEmbedUrl !== undefined) scUpdate.pricingEmbedUrl = pricingEmbedUrl || null;

    if (Object.keys(scUpdate).length > 0) {
      await db.update(studioConfigs).set(scUpdate).where(eq(studioConfigs.id, scId));
    }

    config.invalidate();
    // placesNote reports whether live reviews actually got connected. Saving an API key
    // and hearing only "saved" left a studio believing reviews were on when the place id
    // was still missing and the section rendered nothing.
    res.json({ success: true, ...(placesNote ? { placesNote } : {}), ...(addressNote ? { addressNote } : {}) });
  } catch (error) {
    console.error('[technical-setup] Extras save error:', error);
    res.status(500).json({ error: 'Failed to save extra settings' });
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/setup/technical/security — Step 7: Admin account
// ──────────────────────────────────────────────────────────────
router.post('/security', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if admin already exists
    const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash(password, 12);

    if (existing) {
      await db.update(adminUsers).set({
        passwordHash: hash,
        firstName: firstName || existing.firstName,
        lastName: lastName || existing.lastName,
      }).where(eq(adminUsers.id, existing.id));
    } else {
      await db.insert(adminUsers).values({
        email,
        passwordHash: hash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'admin',
        status: 'active',
      });
    }

    // Also set as ownerEmail on studioConfigs
    const scId = await ensureStudioConfig();
    await db.update(studioConfigs).set({
      ownerEmail: email,
      email: email,
    }).where(eq(studioConfigs.id, scId));

    config.invalidate();

    // Sign the new owner in straight away. They have just chosen this password, two steps
    // before the wizard ends; making them type it again at a login screen is asking them
    // to prove they are the person who has been configuring the studio for ten minutes.
    // Same session field the login route sets, so nothing about auth diverges.
    let signedIn = false;
    try {
      const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
      if (user?.id && req.session) {
        (req.session as any).userId = user.id;
        await new Promise<void>((resolve) => req.session.save(() => resolve()));
        signedIn = true;
      }
    } catch (e: any) {
      // Never fail account creation because the session could not be established — the
      // account exists and the login page still works.
      console.warn('[technical-setup] auto sign-in after admin creation failed:', e?.message || e);
    }

    res.json({ success: true, signedIn });
  } catch (error) {
    console.error('[technical-setup] Security save error:', error);
    res.status(500).json({ error: 'Failed to save security settings' });
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/setup/technical/complete — Mark technical setup done
// ──────────────────────────────────────────────────────────────
router.post('/complete', async (req: Request, res: Response) => {
  try {
    const scId = await ensureStudioConfig();
    await db.update(studioConfigs).set({
      technicalSetupComplete: true,
    }).where(eq(studioConfigs.id, scId));

    config.invalidate();
    res.json({ success: true, nextStep: '/setup' });
  } catch (error) {
    console.error('[technical-setup] Complete error:', error);
    res.status(500).json({ error: 'Failed to mark setup complete' });
  }
});

// ══════════════════════════════════════════════════════════════
// TEST CONNECTION ENDPOINTS
// ══════════════════════════════════════════════════════════════

// POST /api/setup/test/smtp — Send a test email
router.post('/test/smtp', async (req: Request, res: Response) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpSecure, fromEmail, toEmail } = req.body;

    // The password field shows "(saved)" and is NOT resent by the client once stored, so
    // fall back to the decrypted saved password — otherwise Test authenticates with a blank
    // password and fails even though the saved config is correct.
    let smtpPass = req.body.smtpPass;
    if (!smtpPass) {
      try { const { config } = await import('./config-reader'); smtpPass = await config.get('smtp_pass'); } catch { /* ignore */ }
    }

    if (!smtpHost || !smtpUser || !smtpPass) {
      return res.status(400).json({ error: 'SMTP host, user, and password are required' });
    }

    const port = parseInt(smtpPort) || 587;
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport({
      host: smtpHost,
      port,
      // Port 465 is implicit TLS — force secure so a toggle left off doesn't fail the handshake.
      secure: smtpSecure === true || smtpSecure === 'true' || port === 465,
      auth: { user: smtpUser, pass: smtpPass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    await transport.verify();

    // Send a test email if toEmail provided
    if (toEmail) {
      await transport.sendMail({
        from: fromEmail || smtpUser,
        to: toEmail,
        subject: '✅ TogNinja Setup — Email Test Successful',
        text: 'This is a test email from your TogNinja installation. SMTP is configured correctly!',
        html: '<h2>✅ Email Configuration Successful</h2><p>Your SMTP settings are working correctly. This email was sent as part of the TogNinja onboarding setup.</p>',
      });
    }

    res.json({ success: true, message: toEmail ? 'Test email sent' : 'SMTP connection verified' });
  } catch (error) {
    console.error('[test-smtp]', error);
    res.status(400).json({
      success: false,
      // Both fields: the wizard renders `message`, so sending only `error` showed a
      // red cross with no reason at all — nothing a studio could act on.
      error: `SMTP test failed: ${(error as Error).message}`,
      message: `SMTP test failed: ${(error as Error).message}`,
    });
  }
});

// POST /api/setup/test/stripe — Verify Stripe keys
router.post('/test/stripe', async (req: Request, res: Response) => {
  try {
    const { secretKey } = req.body;
    
    if (!secretKey) {
      return res.status(400).json({ error: 'Secret key is required' });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey, { apiVersion: '2025-08-27.basil' as any });

    // Try to fetch account info to verify the key works
    const account = await stripe.accounts.retrieve();

    res.json({
      success: true,
      message: 'Stripe connection verified',
      accountId: account.id,
      businessName: account.business_profile?.name || account.settings?.dashboard?.display_name || null,
    });
  } catch (error) {
    console.error('[test-stripe]', error);
    res.status(400).json({
      success: false,
      error: `Stripe test failed: ${(error as Error).message}`,
    });
  }
});

// POST /api/setup/test/prodigi — Verify a Prodigi API key against the chosen environment.
// Any authenticated call validates the key: GET /orders returns 200 for a valid key, 401 for
// a bad one. Uses the key from the body if provided (unsaved), else the stored one.
router.post('/test/prodigi', async (req: Request, res: Response) => {
  try {
    let { apiKey, environment } = req.body;
    if (!apiKey) {
      try { apiKey = await config.get('prodigi_api_key'); } catch { /* ignore */ }
    }
    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'Prodigi API key is required' });
    }
    const env = String(environment || (await config.get('prodigi_environment')) || 'sandbox').toLowerCase();
    const baseUrl = env === 'production'
      ? 'https://api.prodigi.com/v4.0'
      : 'https://api.sandbox.prodigi.com/v4.0';
    const resp = await fetch(`${baseUrl}/orders?top=1`, { headers: { 'X-API-Key': apiKey } });
    if (resp.status === 401 || resp.status === 403) {
      return res.status(400).json({ success: false, error: 'Invalid API key for the selected environment.' });
    }
    if (!resp.ok) {
      return res.status(400).json({ success: false, error: `Prodigi returned HTTP ${resp.status}.` });
    }
    return res.json({ success: true, message: `Prodigi key verified (${env}).`, environment: env });
  } catch (error) {
    console.error('[test-prodigi]', error);
    return res.status(400).json({ success: false, error: `Prodigi test failed: ${(error as Error).message}` });
  }
});

// POST /api/setup/test/storage — Verify S3-compatible storage
router.post('/test/storage', async (req: Request, res: Response) => {
  // Trim to match the save path — otherwise a pasted trailing space makes Test fail
  // with NoSuchBucket even though the credentials are correct.
  const t = (v: any) => (typeof v === 'string' ? v.trim() : v);
  const accessKeyId = t(req.body.accessKeyId), secretKey = t(req.body.secretKey);
  const bucket = t(req.body.bucket), endpoint = t(req.body.endpoint), region = t(req.body.region);

  // Declared OUTSIDE the try because the catch needs explainStorageError, and a binding
  // introduced inside a try block is not in scope in its own catch. esbuild transpiles
  // without resolving identifiers, so that would have built clean and thrown at runtime
  // on the one path nobody exercises — the failure path.
  const { describeRegionMismatch, normalizeEndpoint, isUsableEndpoint, describeLikelyBucketId, explainStorageError } =
    await import('./services/s3-storage');

  try {
    if (!accessKeyId || !secretKey || !bucket) {
      return res.status(400).json({ error: 'Access key, secret key, and bucket are required' });
    }

    // Same check the save handler applies — one implementation, so the two can never
    // give different answers about the same pair of values.
    const hostRegion = String(endpoint || '').match(/s3[.-]([a-z]{2}-[a-z]+-\d+)\./i)?.[1];

    // Say this before spending a round trip on it. Backblaze's own answer to a bucket ID
    // in the key field is "The AWS Access Key Id you provided does not exist in our
    // records" — accurate, and it sends people looking for a key problem.
    const bucketIdProblem = describeLikelyBucketId(accessKeyId);
    if (bucketIdProblem) {
      return res.status(400).json({ success: false, error: 'Bucket ID in the key field', message: bucketIdProblem });
    }

    const regionProblem = describeRegionMismatch(endpoint, region);
    if (regionProblem) {
      return res.status(400).json({ success: false, error: 'Region mismatch', message: regionProblem });
    }

    // Backblaze displays its endpoint WITHOUT a scheme — "s3.eu-central-003.backblazeb2.com"
    // — so that is what gets pasted. The save path normalised it; this one handed it to the
    // AWS SDK raw, which threw "Invalid URL" and reported it as a failed storage test on
    // input that was entirely correct. Normalise here too, and say so plainly if what is
    // left still is not a usable address.
    const normalizedEndpoint = normalizeEndpoint(endpoint);
    if (endpoint && !isUsableEndpoint(normalizedEndpoint)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid endpoint',
        message: `"${endpoint}" is not a valid endpoint address. Copy the Endpoint shown on your bucket, e.g. s3.eu-central-003.backblazeb2.com.`,
      });
    }

    const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const client = new S3Client({
      // With no Region typed, take it from the endpoint — the endpoint already names it,
      // and asking for it twice is how the two came to disagree in the first place.
      region: region || hostRegion || 'us-east-1',
      endpoint: normalizedEndpoint || undefined,
      credentials: {
        accessKeyId,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
    });

    const result = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      MaxKeys: 1,
    }));

    res.json({
      success: true,
      message: `Connected to bucket "${bucket}"`,
      objectCount: result.KeyCount ?? 0,
    });
  } catch (error) {
    console.error('[test-storage]', error);
    // Was the provider's raw wording. "The AWS Access Key Id you provided does not exist
    // in our records" never mentions that the key is for one region and the endpoint for
    // another, which is what it usually means. explainStorageError names the bucket, the
    // endpoint and the fix — and takes the values being TESTED, not the saved ones, which
    // during onboarding are empty or still the previous tenant's.
    const message = explainStorageError(error, { accessKeyId, bucket, endpoint });
    res.status(400).json({ success: false, error: message, message });
  }
});

// POST /api/setup/test/openai — Verify OpenAI key
router.post('/test/openai', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey });

    // Simple model list to verify the key
    const models = await openai.models.list();
    const hasGpt4 = models.data.some(m => m.id.includes('gpt-4'));

    res.json({
      success: true,
      message: 'OpenAI connection verified',
      modelsAvailable: models.data.length,
      hasGpt4,
    });
  } catch (error) {
    console.error('[test-openai]', error);
    res.status(400).json({
      success: false,
      error: `OpenAI test failed: ${(error as Error).message}`,
    });
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/setup/technical/current — Get saved values (masked)
// For pre-filling form fields when returning to a step
// ──────────────────────────────────────────────────────────────
router.get('/current', async (_req: Request, res: Response) => {
  try {
    const [sc] = await db.select().from(studioConfigs).limit(1);
    const [si] = await db.select().from(studioIntegrations).limit(1);

    // WHO IS ASKING.
    //
    // The route's own auth gate falls through to "no admins yet -> allow onboarding",
    // which is right for a genuinely fresh install and wrong for the state this instance
    // was in: credentials configured, admin_users empty after a reset. An anonymous
    // caller then read the SMTP host and username, the storage access key id, bucket and
    // endpoint, and the owner's email — the identifier half of every credential the
    // studio owns. The secret halves were always masked, so this is a target list rather
    // than a break-in, which is exactly what a credential-stuffing or support-desk
    // social-engineering attempt needs.
    //
    // An identified caller sees the real values, because an admin needs to know what is
    // configured. Everyone else sees the same shape with the identifiers blanked, so the
    // wizard still renders on a genuinely fresh install where there is nothing to leak.
    const identified = !!(_req as any).user?.id || !!(_req as any).session?.userId;
    const ident = (val: string | null | undefined): string => {
      const v = val || '';
      if (identified || !v) return v;
      return '••••••••';
    };

    // Mask sensitive values: show first 4 and last 4 chars
    const mask = (val: string | null | undefined): string | null => {
      if (!val) return null;
      if (val.length <= 10) return '••••••••';
      return val.slice(0, 4) + '••••••••' + val.slice(-4);
    };

    res.json({
      domain: {
        appUrl: sc?.appUrl || '',
        frontendUrl: sc?.frontendUrl || '',
        publicSiteBaseUrl: sc?.publicSiteBaseUrl || '',
      },
      email: {
        smtpHost: ident(si?.smtp_host),
        smtpPort: si?.smtp_port || 587,
        smtpUser: ident(si?.smtp_user),
        smtpPassSet: !!si?.smtp_pass_encrypted,
        smtpSecure: si?.smtp_secure || false,
        fromEmail: ident(si?.default_from_email),
        fromName: si?.email_from_name || '',
        imapHost: ident(si?.imap_host),
        imapPort: si?.imap_port || 993,
        imapUser: ident(si?.imap_user),
        imapPassSet: !!si?.imap_pass_encrypted,
        imapTls: si?.imap_tls ?? true,
        brevoKeySet: !!si?.brevo_api_key_encrypted,
      },
      stripe: {
        publishableKey: si?.stripe_publishable_key || '',
        secretKeySet: !!si?.stripe_secret_key_encrypted,
        secretKeyMasked: mask(si?.stripe_secret_key_encrypted ? 'sk_****' : null),
        webhookSecretSet: !!si?.stripe_webhook_secret_encrypted,
      },
      prodigi: {
        apiKeySet: !!si?.prodigi_api_key_encrypted,
        environment: si?.prodigi_environment || 'sandbox',
      },
      storage: {
        provider: si?.storage_provider || 'backblaze',
        accessKeyId: ident(si?.storage_access_key_id),
        secretKeySet: !!si?.storage_secret_key_encrypted,
        bucket: ident(si?.storage_bucket),
        endpoint: ident(si?.storage_endpoint),
        region: si?.storage_region || '',
      },
      extras: {
        openaiKeySet: !!si?.openai_api_key_encrypted,
        openaiAssistantId: si?.openai_assistant_id || '',
        anthropicKeySet: !!si?.anthropic_api_key_encrypted,
        searchKeySet: !!si?.search_api_key_encrypted,
        googleClientId: ident(si?.google_client_id),
        googleClientSecretSet: !!si?.google_client_secret_encrypted,
        googleCalendarId: si?.google_calendar_id || '',
        // When the host provides a SHARED Google OAuth app via env, studios don't need to
        // create their own — the wizard hides the technical Client ID/Secret fields and
        // they just click "Connect Google Calendar" after login.
        googleOAuthManaged: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim()),
        // Live-reviews state, so Settings → Google can show what is already configured
        // instead of an empty form that looks unset.
        googlePlacesApiKeySet: !!si?.google_places_api_key_encrypted,
        googlePlacesPlaceId: si?.google_places_place_id || '',
        // Whether the studio sells online. NULL = never answered = on, matching every
        // studio configured before the question existed.
        ecommerceEnabled: si?.ecommerce_enabled !== false,
        ga4MeasurementId: sc?.ga4MeasurementId || '',
        metaPixelId: sc?.metaPixelId || '',
        pricingEmbedUrl: sc?.pricingEmbedUrl || '',
        pulseKeySet: !!si?.pulse_api_key_encrypted,
        pulseMode: si?.pulse_mode || 'draft',
        smsProvider: si?.sms_provider || '',
        smsAccountSid: si?.sms_account_sid || '',
        smsAuthTokenSet: !!si?.sms_auth_token_encrypted,
        smsFromNumber: si?.sms_from_number || '',
      },
      security: {
        adminCount: (await db.select({ count: sql<number>`count(*)` }).from(adminUsers))[0]?.count || 0,
        ownerEmail: sc?.ownerEmail || '',
      },
    });
  } catch (error) {
    console.error('[technical-setup] Current config error:', error);
    res.status(500).json({ error: 'Failed to fetch current config' });
  }
});

export default router;
