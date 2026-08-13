/**
 * Setup Wizard API Routes for TogNinja
 *
 * Powers the 5-phase creative onboarding wizard. All progress is persisted to
 * studio_configs.onboarding_state (jsonb) so it survives server restarts, and
 * every phase does REAL work against the database:
 *   1. Basics       - business info & branding  -> studio_configs
 *   2. Integrations - real connection status     <- studio_integrations
 *   3. Scanning     - live content analysis       (recomputed on demand)
 *   4. Fix First    - real auto-fixes             -> blog_posts / voucher_products
 *   5. Drafts       - starter content that really -> email_templates / blog_posts
 *                     publishes
 */

import { Router, Request, Response } from 'express';
import { hubIntegration } from './hub-integration';
import { db } from './db';
import { normalizeSiteLanguage, invalidateSiteLanguage, applySiteLanguageToI18n } from './lib/site-language';
import { invalidateStudioAddress } from './lib/site-address';
import {
  studioConfigs,
  studioIntegrations,
  blogPosts,
  galleries,
  galleryImages,
  voucherProducts,
  crmClients,
  crmLeads,
  crmInvoices,
  crmInvoiceItems,
  emailTemplates,
} from '../shared/schema';
import { eq, sql, count } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { runHomepagePipeline, normalizeWebsiteUrl, type HomepageGenState } from './lib/homepage-pipeline';

const router = Router();

// Setup-phase logo upload — reachable during onboarding BEFORE an admin exists,
// where the authenticated /api/files/upload returns 401. Stores to object storage
// and returns the URL for studio_configs.logo_url.
const setupLogoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
router.post('/upload-logo', setupLogoUpload.single('file'), async (req: any, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const mime = String(req.file.mimetype || '');
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(mime)) {
      return res.status(400).json({ error: 'Please upload a PNG, JPG, WebP or SVG image.' });
    }
    const { getS3Client, getS3Config, buildPublicUrl } = await import('./services/s3-storage');
    const cfg = getS3Config();
    if (!cfg.isConfigured) {
      return res.status(503).json({ error: 'File storage is not configured yet — add your storage keys first.' });
    }
    const ext = path.extname(req.file.originalname) ||
      (mime === 'image/svg+xml' ? '.svg' : mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg');
    const key = `Studio Logos/${crypto.randomUUID()}${ext}`;
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await getS3Client().send(new PutObjectCommand({
      Bucket: cfg.bucket, Key: key, Body: req.file.buffer, ContentType: mime,
    }));
    return res.json({ url: buildPublicUrl(cfg.bucket, cfg.endpoint, key) });
  } catch (e: any) {
    // Surface the underlying storage reason (bucket / keys / endpoint) instead of a
    // generic message — after a storage-config change, uploads fail here and the
    // owner needs to know WHY. Safe: only the S3 error code/name + a trimmed message,
    // never the credentials themselves.
    const reason = e?.Code || e?.name || e?.code || 'StorageError';
    const detail = e?.message ? String(e.message).replace(/\s+/g, ' ').slice(0, 180) : '';
    console.error('[setup] logo upload failed:', reason, detail || e);
    return res.status(500).json({
      error: `Logo upload failed (${reason}). Check your File storage keys, bucket and endpoint in setup.${detail ? ' — ' + detail : ''}`,
    });
  }
});

// ==================== HELPERS ====================

const hasVal = (v: any) => !!(v !== null && v !== undefined && String(v).trim() !== '');
const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slugify = (s: string) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'post';

interface OnboardingState {
  integrationsComplete: boolean;
  scanComplete: boolean;
  fixFirstComplete: boolean;
  draftsComplete: boolean;
  appliedFixes: string[];
  skippedFixes: string[];
  publishedDrafts: string[];
  skippedDrafts: string[];
}

function normalizeState(raw: any): OnboardingState {
  const s = raw || {};
  const arr = (x: any) => (Array.isArray(x) ? x : []);
  return {
    integrationsComplete: !!s.integrationsComplete,
    scanComplete: !!s.scanComplete,
    fixFirstComplete: !!s.fixFirstComplete,
    draftsComplete: !!s.draftsComplete,
    appliedFixes: arr(s.appliedFixes),
    skippedFixes: arr(s.skippedFixes),
    publishedDrafts: arr(s.publishedDrafts),
    skippedDrafts: arr(s.skippedDrafts),
  };
}

async function getConfigRow(): Promise<any | null> {
  const [c] = await db.select().from(studioConfigs).limit(1);
  return c || null;
}

async function getIntegrationsRow(): Promise<any | null> {
  const [i] = await db.select().from(studioIntegrations).limit(1);
  return i || null;
}

async function loadState(config?: any): Promise<OnboardingState> {
  const c = config !== undefined ? config : await getConfigRow();
  return normalizeState(c?.onboardingState);
}

async function patchState(patch: Partial<OnboardingState>): Promise<OnboardingState> {
  const c = await getConfigRow();
  const current = normalizeState(c?.onboardingState);
  const next = { ...current, ...patch };
  if (c) {
    await db
      .update(studioConfigs)
      .set({ onboardingState: next as any, updatedAt: new Date() })
      .where(eq(studioConfigs.id, c.id));
  }
  return next;
}

async function countRows(table: any, where?: any): Promise<number> {
  const q = db.select({ n: count() }).from(table);
  const [r] = await (where ? q.where(where) : q);
  return Number(r?.n || 0);
}

// Optional AI text generation. Uses the runtime OpenAI key when present and
// falls back cleanly to the provided text if unset or the call fails — the
// onboarding flow must never break because AI is unavailable.
async function aiText(prompt: string, fallback: string, maxTokens = 350): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return fallback;
  try {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    return r.choices?.[0]?.message?.content?.trim() || fallback;
  } catch (err) {
    console.warn('[setup] AI generation failed, using fallback:', (err as Error).message);
    return fallback;
  }
}

// Real integration status derived from the technical-setup credentials.
function computeIntegrations(integ: any) {
  const emailConnected =
    (hasVal(integ?.smtp_host) && hasVal(integ?.smtp_user)) || hasVal(integ?.brevo_api_key_encrypted);
  const stripeConnected =
    hasVal(integ?.stripe_secret_key_encrypted) || hasVal(integ?.stripe_account_id);
  const storageConnected = hasVal(integ?.storage_bucket) && hasVal(integ?.storage_access_key_id);
  const aiConnected =
    hasVal(integ?.openai_api_key_encrypted) ||
    hasVal(integ?.anthropic_api_key_encrypted) ||
    hasVal(process.env.OPENAI_API_KEY);
  const googleConnected = hasVal(integ?.google_client_id);
  const calendarConnected = hasVal(integ?.google_calendar_id);
  return {
    emailConnected,
    stripeConnected,
    storageConnected,
    aiConnected,
    googleConnected,
    calendarConnected,
    stripeMode: hasVal(integ?.stripe_secret_key_encrypted) ? 'live' : null,
  };
}

// Recompute the list of "fix-first" issues live from the database. Stable ids
// let apply/skip reference them; fixed items simply disappear on the next scan.
async function computeFixFirstItems(): Promise<any[]> {
  const items: any[] = [];
  const hasAI = hasVal(process.env.OPENAI_API_KEY);

  const postsNoMeta = await countRows(
    blogPosts,
    sql`${blogPosts.metaDescription} IS NULL OR ${blogPosts.metaDescription} = ''`
  );
  if (postsNoMeta > 0) {
    items.push({
      id: 'missing_meta',
      type: 'missing_meta',
      severity: 'high',
      title: 'Missing SEO meta descriptions',
      description: `${postsNoMeta} blog post${postsNoMeta > 1 ? 's are' : ' is'} missing a meta description`,
      affected: postsNoMeta,
      autoFixAvailable: true,
    });
  }

  const productsNoDesc = await countRows(
    voucherProducts,
    sql`${voucherProducts.description} IS NULL OR ${voucherProducts.description} = ''`
  );
  if (productsNoDesc > 0) {
    items.push({
      id: 'missing_product_desc',
      type: 'missing_description',
      severity: 'medium',
      title: 'Products without descriptions',
      description: `${productsNoDesc} product${productsNoDesc > 1 ? 's need' : ' needs'} a description`,
      affected: productsNoDesc,
      autoFixAvailable: hasAI,
    });
  }

  const clientsNoEmail = await countRows(
    crmClients,
    sql`${crmClients.email} IS NULL OR ${crmClients.email} = ''`
  );
  if (clientsNoEmail > 0) {
    items.push({
      id: 'incomplete_client_emails',
      type: 'incomplete_data',
      severity: 'low',
      title: 'Clients without email addresses',
      description: `${clientsNoEmail} client${clientsNoEmail > 1 ? 's are' : ' is'} missing an email address`,
      affected: clientsNoEmail,
      autoFixAvailable: false,
    });
  }

  const config = await getConfigRow();
  const missing: string[] = [];
  if (!hasVal(config?.logoUrl)) missing.push('logo');
  if (!hasVal(config?.address)) missing.push('address');
  if (!hasVal(config?.phone)) missing.push('phone');
  if (missing.length) {
    items.push({
      id: 'config_branding',
      type: 'incomplete_data',
      severity: 'medium',
      title: 'Incomplete studio profile',
      description: `Add your ${missing.join(', ')} in Settings — it improves SEO and invoices`,
      affected: missing.length,
      autoFixAvailable: false,
    });
  }

  return items;
}

// Starter drafts personalised from the business profile. Previews are
// deterministic (fast, no AI cost on load); AI enrichment happens at publish.
function buildDrafts(config: any): any[] {
  const name = config?.businessName || config?.studioName || 'our studio';
  const tagline = config?.metaDescription || 'capturing your most precious moments';
  return [
    {
      id: 'welcome_email',
      type: 'email_template',
      title: 'Welcome Email',
      description: 'Sent to new clients when they book with you',
      category: 'welcome',
      subject: `Welcome to ${name}!`,
      previewText:
        `Hi {{firstName}},\n\n` +
        `Thank you for choosing ${name} — we're thrilled to work with you! ` +
        `We'll be in touch shortly with the next steps for your session.\n\n` +
        `If you have any questions in the meantime, just reply to this email.\n\n` +
        `Warm regards,\nThe ${name} Team`,
    },
    {
      id: 'booking_confirmation',
      type: 'email_template',
      title: 'Booking Confirmation',
      description: 'Sent automatically when a session is booked',
      category: 'booking',
      subject: `Your booking with ${name} is confirmed`,
      previewText:
        `Hi {{firstName}},\n\n` +
        `Great news — your {{sessionType}} on {{date}} at {{time}} is confirmed.\n\n` +
        `Location: {{location}}\n\n` +
        `We can't wait to see you. If anything changes, let us know.\n\n` +
        `Best,\nThe ${name} Team`,
    },
    {
      id: 'first_blog_post',
      type: 'blog_post',
      title: 'First Blog Post',
      description: 'A starter post to kick off your blog and SEO',
      category: 'general',
      subject: `Welcome to ${name}`,
      previewText:
        `Welcome to ${name}! We're a photography studio dedicated to ${tagline}.\n\n` +
        `On this blog we'll share recent sessions, behind-the-scenes stories, tips to ` +
        `prepare for your shoot, and news from the studio. We're so glad you're here — ` +
        `take a look around, and get in touch when you're ready to book.`,
    },
  ];
}

// ==================== SETUP STATUS ====================

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const config = await getConfigRow();
    const integ = await getIntegrationsRow();
    const state = await loadState(config);
    const ci = computeIntegrations(integ);

    const basicsComplete = hasVal(config?.businessName);
    const integrationsComplete = state.integrationsComplete || ci.stripeConnected;

    const phases = {
      basics: {
        complete: basicsComplete,
        // Return the FULL saved profile so returning to the step repopulates every
        // field (previously only name/timezone/currency came back, so tagline,
        // phone, website, logo etc. looked blank — "it didn't save").
        data: config
          ? {
              businessName: config.businessName,
              timezone: config.timezone,
              currency: config.currency || integ?.default_currency || 'EUR',
              vatNumber: config.vatNumber || '',
              dateFormat: config.dateFormat || 'auto',
              tagline: config.metaDescription || '',
              primaryColor: config.primaryColor || '#3B82F6',
              logoUrl: config.logoUrl || '',
              phone: config.phone || '',
              website: config.website || '',
              address: config.address || '',
              // Same round-trip reasoning as siteLanguage below: omitted, the field
              // renders blank on a revisit and Continue writes blank over a good value.
              city: config.city || '',
              // Round-trips the studio's stored language back into the form. Without it
              // the control fell back to its default and the save wrote that default
              // over the real answer, so a German studio that reopened this step was
              // silently switched to English — and since the public site now follows
              // this value, that switched its whole website too. Empty string when the
              // studio never answered, which the form must keep as "unanswered".
              siteLanguage: config.siteLanguage || '',
              latitude: config.latitude || '',
              longitude: config.longitude || '',
              facebookUrl: config.facebookUrl || '',
              instagramUrl: config.instagramUrl || '',
              twitterUrl: config.twitterUrl || '',
            }
          : null,
      },
      integrations: {
        complete: integrationsComplete,
        instagram: false,
        stripe: ci.stripeConnected,
      },
      scanning: { complete: state.scanComplete, pagesScanned: 0 },
      fixFirst: {
        complete: state.fixFirstComplete,
        itemsTotal: 0,
        itemsCompleted: state.appliedFixes.length,
      },
      drafts: {
        complete: state.draftsComplete,
        draftsGenerated: 3,
        draftsPublished: state.publishedDrafts.length,
      },
    };

    let currentStep = 'basics';
    if (basicsComplete) currentStep = 'integrations';
    if (integrationsComplete) currentStep = 'scanning';
    if (state.scanComplete) currentStep = 'fix_first';
    if (state.fixFirstComplete) currentStep = 'drafts';
    if (state.draftsComplete || config?.creativeSetupComplete) currentStep = 'complete';

    const doneCount = [
      basicsComplete,
      integrationsComplete,
      state.scanComplete,
      state.fixFirstComplete,
      state.draftsComplete,
    ].filter(Boolean).length;

    res.json({
      currentStep,
      progressPct: Math.round((doneCount / 5) * 100),
      phases,
      setupMode: !config?.creativeSetupComplete,
      demoMode: process.env.DEMO_MODE === 'true',
      features: hubIntegration.getFeatureFlags(),
    });
  } catch (error) {
    console.error('Setup status error:', error);
    res.status(500).json({ error: 'Failed to get setup status' });
  }
});

// ==================== AI HOMEPAGE GENERATION ====================
// Crawl the studio's existing website -> AI -> a DRAFT landing page the owner later
// edits + publishes + sets as their homepage. Runs on the OPEN setup surface because
// the user has no session yet during onboarding. See server/lib/homepage-pipeline.ts.

router.post('/homepage/generate', async (req: Request, res: Response) => {
  try {
    const config = await getConfigRow();
    if (!config) return res.json({ started: false, skipped: true, reason: 'no-config' });
    const website = normalizeWebsiteUrl((config as any).website || (config as any).frontendUrl || '');
    if (!website) return res.json({ started: false, skipped: true, reason: 'no-website' });

    const force = String((req.query.force ?? (req.body && req.body.force)) || '') === '1' || req.query.force === 'true';
    const current: HomepageGenState | null = (config as any).homepageGenState || null;

    // Idempotency: don't double-fire a running job unless forced.
    if (current?.status === 'running' && !force) {
      return res.json({ started: true, already: true });
    }

    // On force, delete the old draft if it's still a draft (avoids orphans).
    if (force && current?.draftId) {
      try {
        const neonDb = require('../database.js');
        const prev = await neonDb.getLandingPage(current.draftId);
        if (prev && prev.status === 'draft') await neonDb.deleteLandingPage(current.draftId);
      } catch { /* best effort */ }
    }

    // Fire-and-forget — the pipeline writes progress to homepage_gen_state.
    runHomepagePipeline(config, { force }).catch((e: any) => console.error('[setup] homepage pipeline error:', e?.message || e));
    return res.json({ started: true });
  } catch (error: any) {
    console.error('Homepage generate error:', error?.message || error);
    return res.status(500).json({ error: 'Failed to start homepage generation' });
  }
});

// Build a starter homepage from onboarding data (no crawl) + optional theme, and set it as
// "/". Open during onboarding (no admin session yet), so a new studio gets its own homepage.
router.post('/homepage/starter', async (req: Request, res: Response) => {
  try {
    const { generateStarterHomepage } = await import('./lib/starter-homepage');
    const out = await generateStarterHomepage({ themePreset: req.body?.preset });
    return res.json({ ok: true, ...out });
  } catch (error: any) {
    console.error('[setup] starter homepage failed:', error?.message || error);
    return res.status(500).json({ error: 'Failed to build homepage' });
  }
});

router.get('/homepage/status', async (_req: Request, res: Response) => {
  try {
    const config = await getConfigRow();
    const st: HomepageGenState | null = (config as any)?.homepageGenState || null;
    if (!st) {
      const hasWebsite = !!normalizeWebsiteUrl((config as any)?.website || (config as any)?.frontendUrl || '');
      return res.json({ status: 'idle', stage: null, pagesCrawled: 0, previewUrl: null, draftId: null, hasWebsite });
    }
    const previewUrl = st.slug && st.previewToken ? `/lp/${st.slug}?preview=${st.previewToken}` : null;
    return res.json({
      status: st.status,
      stage: st.stage,
      pagesCrawled: st.pagesCrawled || 0,
      previewUrl,
      draftId: st.draftId,
      slug: st.slug,
      error: st.error || null,
    });
  } catch (error: any) {
    console.error('Homepage status error:', error?.message || error);
    return res.status(500).json({ error: 'Failed to read homepage status' });
  }
});

// ==================== ONBOARDING CLIENT IMPORT ====================
// Bulk client import during onboarding. The admin CRM endpoint (/api/crm/clients)
// is auth-gated, but onboarding has no session yet — this open setup endpoint lets
// the wizard's CSV importer actually work. It's gated shut once setup completes
// (see the /api/setup mount guard), and dedupes by email so a re-run is safe.
router.post('/import-clients', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const firstName = String(b.firstName || '').trim();
    const email = String(b.email || '').trim();
    if (!firstName) return res.status(400).json({ error: 'firstName is required' });
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: `Invalid email address: ${email}` });
    }
    // Dedupe by email (case-insensitive) so importing the same list twice is a no-op.
    if (email) {
      const existing = await db
        .select({ id: crmClients.id })
        .from(crmClients)
        .where(sql`lower(${crmClients.email}) = ${email.toLowerCase()}`)
        .limit(1);
      if (existing.length) return res.json({ skipped: true, reason: 'duplicate-email', id: existing[0].id });
    }
    const [created] = await db
      .insert(crmClients)
      .values({
        firstName,
        lastName: String(b.lastName || '').trim() || '',
        email: email || null,
        phone: b.phone || null,
        address: b.address || null,
        city: b.city || null,
        state: b.state || null,
        zip: b.zip || null,
        country: b.country || null,
        company: b.company || null,
        notes: b.notes || null,
        status: b.status || 'active',
      } as any)
      .returning({ id: crmClients.id });
    return res.json({ id: created.id, created: true });
  } catch (error: any) {
    console.error('[setup] import-clients error:', error?.message || error);
    return res.status(500).json({ error: 'Failed to import client' });
  }
});

// ==================== ONBOARDING LEAD SOURCES ====================
// Save the studio's lead-source channels during onboarding (the admin CRM endpoint
// is auth-gated). Open while onboarding is in progress; gated shut after setup.
router.post('/lead-sources', async (req: Request, res: Response) => {
  try {
    const names: string[] = Array.isArray(req.body?.names) ? req.body.names : [];
    const clean = Array.from(new Set(names.map((n) => String(n || '').trim()).filter(Boolean))).slice(0, 40);
    let added = 0;
    for (let i = 0; i < clean.length; i++) {
      try {
        await db.execute(sql`INSERT INTO lead_sources (name, is_active, sort_order) VALUES (${clean[i]}, true, ${i}) ON CONFLICT (name) DO NOTHING`);
        added++;
      } catch { /* skip a bad row, keep going */ }
    }
    return res.json({ ok: true, added });
  } catch (error: any) {
    console.error('[setup] lead-sources error:', error?.message || error);
    return res.status(500).json({ error: 'Failed to save lead sources' });
  }
});

// ==================== DEMO RESET (start over) ====================
// Wipe all test data and return the instance to a FRESH pre-onboarding state, so /setup
// runs again from scratch. HARD-GUARDED on DEMO_MODE — it can never run on a real
// customer instance. Also clears the admin + sessions (you'll create a new admin in the
// wizard) and resets the studio profile; storage/DB env creds are untouched.
router.post('/reset-demo', async (_req: Request, res: Response) => {
  if (process.env.DEMO_MODE !== 'true') {
    return res.status(403).json({ error: 'Reset is only available on demo instances (DEMO_MODE=true).' });
  }
  try {
    // Core data (CASCADE clears dependent rows: invoices/items, gallery images, sessions,
    // questionnaires, communications, etc. that reference clients/galleries).
    try {
      // voucher_products was in NEITHER truncate list, so the origin studio's own products
      // — "Familie Fotoshooting", "Neugeborenen Fotoshooting", priced in euros — survived
      // every reset and appeared on the next studio's homepage and vouchers page as its
      // own offering. A reset that leaves purchasable items behind is not a reset.
      await db.execute(sql`TRUNCATE crm_invoice_items, crm_invoices, crm_leads, crm_clients, gallery_images, galleries, voucher_sales, voucher_products, lead_sources, email_campaigns, landing_pages, blog_posts, admin_users RESTART IDENTITY CASCADE`);
    } catch (e: any) { console.warn('[reset-demo] core truncate:', e?.message); }
    // On-demand tables that may not exist yet.
    // manual_page_content, homepage_images and portfolio_images were NOT cleared, so a
    // "fresh" reset inherited the previous studio's published website copy and its
    // uploaded images — an end-to-end onboarding test then started with the last
    // tenant's homepage text still in place, which is the opposite of a clean slate.
    for (const t of ['manual_page_content', 'homepage_images', 'portfolio_images', 'ui_translations', 'i18n_settings', 'website_pages', 'crawl_jobs', 'theme_analysis', 'onboarding_sessions', 'user_sessions', 'questionnaire_responses', 'questionnaire_links', 'competitor_prices', 'price_list_suggestions', 'competitor_research', 'price_wizard_sessions', 'gallery_order_items', 'gallery_orders', 'print_orders', 'workflow_step_executions', 'workflow_executions', 'workflow_instances', 'workflow_analytics']) {
      try { await db.execute(sql.raw(`TRUNCATE ${t} RESTART IDENTITY CASCADE`)); } catch { /* skip */ }
    }
    // Reset the studio_configs singleton to blank pre-onboarding state (keep the row +
    // technical integration creds so storage keeps working).
    try { await db.execute(sql`UPDATE studio_configs SET creative_setup_complete = false, technical_setup_complete = false, onboarding_state = NULL`); } catch {}
    try { await db.execute(sql`UPDATE studio_configs SET homepage_gen_state = NULL, homepage_landing_slug = NULL, homepage_draft_landing_id = NULL, pricing_embed_url = NULL`); } catch {}
    // `city` belongs in this list for the same reason as `address`: it is now served as
    // addressLocality in the crawler-visible head, so a city left behind by a reset is
    // the previous tenant's locality published on the next tenant's pages.
    try { await db.execute(sql`UPDATE studio_configs SET business_name = NULL, logo_url = NULL, meta_description = NULL, address = NULL, city = NULL, phone = NULL, website = NULL, latitude = NULL, longitude = NULL`); } catch {}
    // Revert Authority Map to the default seed + drop ShootCleaner creds, so a fresh test
    // starts truly clean (these post-date the original reset).
    try { await db.execute(sql`UPDATE studio_configs SET authority_map = NULL, shootcleaner_api_key = NULL, shootcleaner_webhook_url = NULL, shootcleaner_webhook_secret = NULL`); } catch {}
    // Page visibility back to "use the language defaults" for the next studio.
    try { await db.execute(sql`UPDATE studio_configs SET enabled_pages = NULL, site_language = NULL`); } catch {}
    // storage_region was left behind by the credential reset below, which cleared the
    // key, secret, bucket and endpoint — a lone region is exactly the half-filled row
    // that used to get blended with env credentials.
    try { await db.execute(sql`UPDATE studio_integrations SET storage_region = NULL`); } catch {}
    invalidateSiteLanguage();
    invalidateStudioAddress();
    // Clear tenant-entered STORAGE credentials so a fresh test falls back to the instance's
    // env storage. A stale/invalid stored key (e.g. a Supabase publishable key pasted in a
    // prior run) otherwise overrides the valid env creds and fails uploads (InvalidAccessKeyId).
    try { await db.execute(sql`UPDATE studio_integrations SET storage_access_key_id = NULL, storage_secret_key_encrypted = NULL, storage_bucket = NULL, storage_endpoint = NULL`); } catch {}
    // The SMTP SERVER details are deliberately kept (infrastructure — re-entering them
    // every demo run is pointless), but the sender IDENTITY is the studio's own. Left
    // behind, a fresh wizard pre-filled the PREVIOUS studio's name in "From Name", so
    // the next tenant's emails would have gone out signed as them.
    try { await db.execute(sql`UPDATE studio_integrations SET email_from_name = NULL`); } catch {}

    // EVERY credential the wizard collects — not just storage. A reset that left SMTP,
    // Stripe and the OpenAI key behind meant the next run of the wizard opened with the
    // previous studio's settings already filled in and marked "(saved)", which is not
    // what a new customer would ever see and quietly hides whether a step actually works.
    // Listed column by column, and each in its own statement, so a column that does not
    // exist on an older instance skips itself instead of aborting the whole reset.
    const INTEGRATION_COLUMNS = [
      // Email / SMTP + IMAP + inbound
      'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass_encrypted', 'smtp_secure',
      'default_from_email', 'inbound_email_address', 'brevo_api_key_encrypted',
      'imap_host', 'imap_port', 'imap_user', 'imap_pass_encrypted', 'imap_tls',
      // Payments
      'stripe_account_id', 'stripe_publishable_key', 'stripe_secret_key_encrypted',
      'stripe_webhook_secret_encrypted', 'ecommerce_enabled',
      // AI
      'openai_api_key_encrypted', 'openai_assistant_id', 'anthropic_api_key_encrypted',
      // Google
      'google_client_id', 'google_client_secret_encrypted', 'google_calendar_id',
      'google_places_api_key_encrypted', 'google_places_place_id',
      // Messaging + fulfilment + social
      'sms_provider', 'sms_account_sid', 'sms_auth_token_encrypted', 'sms_from_number',
      'prodigi_api_key_encrypted', 'prodigi_environment',
      'pulse_api_key_encrypted', 'pulse_mode', 'pulse_profiles',
    ];
    for (const col of INTEGRATION_COLUMNS) {
      try { await db.execute(sql.raw(`UPDATE studio_integrations SET ${col} = NULL`)); } catch { /* column absent on this instance */ }
    }
    try {
      const { config } = await import('./config-reader');
      config.invalidate();
      const { invalidateStorageConfig } = await import('./services/s3-storage');
      invalidateStorageConfig();
    } catch { /* cache refresh is best-effort */ }
    return res.json({ ok: true, message: 'Demo data cleared. Open /setup to start onboarding again.' });
  } catch (error: any) {
    console.error('[reset-demo] error:', error?.message || error);
    return res.status(500).json({ error: 'Failed to reset demo data', detail: String(error?.message || error).slice(0, 200) });
  }
});

// ==================== DEMO DATA SEED ====================
// Populate a fresh instance with realistic sample data (clients + paid invoices +
// leads) so a demo CRM shows no blanks and lifetime-value / revenue / top-clients /
// lead-source analytics all render. Open during onboarding (gated shut after setup
// completes). Idempotent: skips if demo rows already exist unless ?force=1. Demo rows
// use clientId 'DEMO-####' + invoiceNumber 'DEMO-####' so they're easy to remove.
router.post('/seed-demo', async (req: Request, res: Response) => {
  try {
    const force = String((req.query.force ?? (req.body && req.body.force)) || '') === '1' || req.query.force === 'true';
    const already = await db.select({ id: crmClients.id }).from(crmClients).where(sql`client_id LIKE 'DEMO-%'`).limit(1);
    if (already.length && !force) return res.json({ alreadySeeded: true });

    const firstNames = ['Emma', 'Liam', 'Sophie', 'Lukas', 'Marie', 'Paul', 'Anna', 'Max', 'Léa', 'Hugo', 'Lucía', 'Mateo', 'Chloé', 'Louis', 'Sofía', 'Diego', 'Laura', 'Felix', 'Julia', 'Noah'];
    const lastNames = ['Müller', 'Schmidt', 'Dubois', 'García', 'Rossi', 'Novak', 'Smith', 'Wagner', 'Martin', 'López', 'Weber', 'Bernard', 'Fernández', 'Fischer', 'Moreau', 'Romero', 'Becker', 'Laurent', 'Sánchez', 'Hoffmann'];
    const places = [
      { city: 'Vienna', country: 'Austria', state: 'Wien', zp: '10' },
      { city: 'Berlin', country: 'Germany', state: 'Berlin', zp: '10' },
      { city: 'Paris', country: 'France', state: 'Île-de-France', zp: '75' },
      { city: 'Madrid', country: 'Spain', state: 'Madrid', zp: '28' },
      { city: 'Munich', country: 'Germany', state: 'Bavaria', zp: '80' },
      { city: 'Lyon', country: 'France', state: 'Rhône', zp: '69' },
      { city: 'Barcelona', country: 'Spain', state: 'Catalonia', zp: '08' },
      { city: 'Hamburg', country: 'Germany', state: 'Hamburg', zp: '20' },
    ];
    const streets = ['Hauptstraße', 'Rue de la Paix', 'Calle Mayor', 'Bahnhofstraße', 'Avenue Victor Hugo', 'Gran Vía', 'Lindenweg', 'Rue Lafayette', 'Kirchgasse', 'Paseo del Prado'];
    const companies = ['Aurora Studios', 'Meridian GmbH', 'Bright Media', 'Nord Consulting', 'Lumière SARL', 'Vista Group', 'Kernel Labs', 'Atlas Ventures'];
    const sources = ['Google', 'Instagram', 'Facebook', 'Referral', 'Website', 'Newsletter', 'Walk-in'];
    const sessionTypes = [
      { name: 'Family Photoshoot', price: 299 }, { name: 'Newborn Session', price: 399 },
      { name: 'Maternity Session', price: 249 }, { name: 'Business Portrait', price: 199 },
      { name: 'Wedding Coverage', price: 1200 }, { name: 'Event Photography', price: 650 },
      { name: 'Baby (3-12mo)', price: 279 }, { name: 'Team Photos', price: 450 },
    ];
    const pick = <T,>(arr: T[], i: number): T => arr[((i % arr.length) + arr.length) % arr.length];
    const rnd = (n: number) => Math.floor(Math.random() * n);
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    let clients = 0, invoices = 0, leads = 0, revenue = 0;

    for (let i = 0; i < 100; i++) {
      const fn = pick(firstNames, i * 7 + 3);
      const ln = pick(lastNames, i * 3 + 1);
      const place = pick(places, i);
      const [client] = await db.insert(crmClients).values({
        firstName: fn,
        lastName: ln,
        clientId: `DEMO-${String(i + 1).padStart(4, '0')}`,
        email: `${fn}.${ln}${i}`.toLowerCase().replace(/[^a-z0-9.]/g, '') + '@example.com',
        phone: `+43 1 ${String(2000000 + ((i * 137) % 7000000)).slice(0, 7)}`,
        address: `${1 + rnd(200)} ${pick(streets, i)}`,
        city: place.city,
        state: place.state,
        zip: `${place.zp}${String(100 + rnd(899))}`,
        country: place.country,
        company: i % 3 === 0 ? pick(companies, i) : null,
        leadSource: pick(sources, i),
        status: 'active',
        notes: `Sample client — ${pick(sessionTypes, i).name} customer.`,
      } as any).returning({ id: crmClients.id });
      clients++;

      // ~70% of clients have 1-3 paid invoices (drives revenue + lifetime value).
      if (i % 10 < 7) {
        const numInv = 1 + rnd(3);
        for (let j = 0; j < numInv; j++) {
          const st = pick(sessionTypes, i + j * 3);
          const subtotal = st.price;
          const tax = Math.round(subtotal * 0.2 * 100) / 100;
          const total = Math.round((subtotal + tax) * 100) / 100;
          const issue = new Date(Date.now() - (30 + rnd(400)) * 86400000);
          const due = new Date(issue.getTime() + 30 * 86400000);
          const [inv] = await db.insert(crmInvoices).values({
            invoiceNumber: `DEMO-${String(invoices + 1).padStart(4, '0')}`,
            clientId: client.id,
            issueDate: iso(issue),
            dueDate: iso(due),
            subtotal: String(subtotal),
            taxAmount: String(tax),
            total: String(total),
            paidAmount: String(total),
            currency: 'EUR',
            status: 'paid',
            documentType: 'invoice',
          } as any).returning({ id: crmInvoices.id });
          await db.insert(crmInvoiceItems).values({
            invoiceId: inv.id, description: st.name, quantity: '1', unitPrice: String(subtotal), taxRate: '20',
          } as any);
          invoices++;
          revenue += total;
        }
      }
    }

    // A handful of open leads across sources so New Leads / Lead Sources aren't blank.
    for (let i = 0; i < 18; i++) {
      const fn = pick(firstNames, i * 5 + 2);
      const ln = pick(lastNames, i * 2 + 4);
      const st = pick(sessionTypes, i);
      await db.insert(crmLeads).values({
        name: `${fn} ${ln}`,
        email: `${fn}.${ln}.lead${i}`.toLowerCase().replace(/[^a-z0-9.]/g, '') + '@example.com',
        phone: `+43 660 ${String(1000000 + ((i * 211) % 8000000)).slice(0, 7)}`,
        company: i % 4 === 0 ? pick(companies, i) : null,
        message: `Interested in a ${st.name}. Please get in touch about availability and pricing.`,
        source: pick(sources, i),
        status: pick(['new', 'contacted', 'qualified', 'new', 'new'], i),
        priority: pick(['low', 'medium', 'high', 'medium'], i),
        value: String(st.price),
      } as any);
      leads++;
    }

    // Three sample galleries with visibly different cover templates so studios can
    // see the possibilities. Images are reliable external placeholders (picsum).
    const galleryDefs = [
      {
        title: 'Sample — Family Session', slug: 'sample-family-session', seed: 'famgal',
        cover: { templateId: 'classic-center', textPosition: 'center', textAlignment: 'center', overlay: 'dark', titleSize: 'large', showSubtitle: true, showButton: true, buttonStyle: 'outline', fontStyle: 'elegant', imageStyle: 'full', subtitle: 'A warm family shoot' },
      },
      {
        title: 'Sample — Wedding Highlights', slug: 'sample-wedding-highlights', seed: 'weddgal',
        cover: { templateId: 'magazine-left', textPosition: 'bottom-left', textAlignment: 'left', overlay: 'gradient', titleSize: 'xlarge', showSubtitle: true, showButton: false, buttonStyle: 'solid', fontStyle: 'serif', imageStyle: 'full', subtitle: 'The big day' },
      },
      {
        title: 'Sample — Newborn Studio', slug: 'sample-newborn-studio', seed: 'newborngal',
        cover: { templateId: 'minimal-top', textPosition: 'top', textAlignment: 'center', overlay: 'light', titleSize: 'medium', showSubtitle: false, showButton: true, buttonStyle: 'outline', fontStyle: 'modern', imageStyle: 'framed', subtitle: '' },
      },
    ];
    let galleryCount = 0;
    for (const g of galleryDefs) {
      const existsG = await db.select({ id: galleries.id }).from(galleries).where(eq(galleries.slug, g.slug)).limit(1);
      let galleryId: string;
      if (existsG.length) {
        galleryId = existsG[0].id;
      } else {
        const [row] = await db.insert(galleries).values({
          title: g.title,
          slug: g.slug,
          description: 'A sample gallery to preview what your client galleries can look like.',
          coverImage: `https://picsum.photos/seed/${g.seed}-cover/1200/800`,
          coverTemplate: g.cover as any,
          isPublic: true,
          status: 'ACTIVE',
        } as any).returning({ id: galleries.id });
        galleryId = row.id;
        galleryCount++;
      }
      // Add a handful of images if the gallery has none.
      const imgCount = await countRows(galleryImages, eq(galleryImages.galleryId, galleryId));
      if (imgCount === 0) {
        for (let k = 0; k < 8; k++) {
          await db.insert(galleryImages).values({
            galleryId,
            filename: `${g.seed}-${k + 1}.jpg`,
            url: `https://picsum.photos/seed/${g.seed}-${k + 1}/1200/800`,
            title: `Sample photo ${k + 1}`,
            sortOrder: k,
            contentType: 'image/jpeg',
          } as any);
        }
      }
    }

    return res.json({ seeded: true, clients, invoices, leads, galleries: galleryCount, revenue: Math.round(revenue) });
  } catch (error: any) {
    console.error('[setup] seed-demo error:', error?.message || error);
    return res.status(500).json({ error: 'Failed to seed demo data', detail: String(error?.message || error).slice(0, 200) });
  }
});

// ==================== PHASE 1: BASICS ====================

router.post('/basics', async (req: Request, res: Response) => {
  try {
    const {
      businessName,
      businessType,
      timezone,
      currency,
      dateFormat,
      logo,
      primaryColor,
      tagline,
      address,
      city,
      phone,
      website,
      latitude,
      longitude,
      facebookUrl,
      instagramUrl,
      twitterUrl,
      vatNumber,
      siteLanguage,
    } = req.body;

    if (!businessName || !businessType || !timezone) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: businessName, businessType, timezone' });
    }

    const businessInfo = {
      businessName,
      businessType,
      timezone,
      siteLanguage: normalizeSiteLanguage(siteLanguage) || 'en',
      currency: currency || 'EUR',
      dateFormat: dateFormat || 'auto',
      logo: logo || null,
      primaryColor: primaryColor || '#3B82F6',
      tagline: tagline || '',
      address: address || null,
      phone: phone || null,
      website: website || null,
      latitude: latitude || null,
      longitude: longitude || null,
      facebookUrl: facebookUrl || null,
      instagramUrl: instagramUrl || null,
      twitterUrl: twitterUrl || null,
    };

    const fields = {
      businessName,
      timezone,
      dateFormat: dateFormat || 'auto',
      primaryColor: primaryColor || '#3B82F6',
      logoUrl: logo || null,
      metaDescription: tagline || '',
      address: address || null,
      // `|| undefined`, NOT `|| null`: drizzle drops an undefined key from the SET
      // clause, so a form that submits nothing leaves the stored value alone. The
      // adjacent `address || null` does the opposite and NULLs a studio's address
      // every time someone reopens this step — and the wizard invites exactly that
      // ("click any completed step to go back — nothing is lost"). City now feeds the
      // served JSON-LD, so inheriting that behaviour would publish the wipe.
      city: (typeof city === 'string' && city.trim()) ? city.trim().slice(0, 80) : undefined,
      phone: phone || null,
      website: website || null,
      latitude: latitude || null,
      longitude: longitude || null,
      facebookUrl: facebookUrl || null,
      instagramUrl: instagramUrl || null,
      twitterUrl: twitterUrl || null,
      currency: currency || 'EUR',
      vatNumber: vatNumber || null,
      // The studio's own site language. Page visibility, generated copy and locale
      // defaults all key off this; before it was captured here they keyed off SITE_LANG,
      // a deploy-time variable the buyer never sees.
      siteLanguage: normalizeSiteLanguage(siteLanguage) || undefined,
      updatedAt: new Date(),
    };

    const existing = await getConfigRow();
    if (existing) {
      await db.update(studioConfigs).set(fields).where(eq(studioConfigs.id, existing.id));
    } else {
      await db.insert(studioConfigs).values({
        studioName: businessName,
        ownerEmail: 'setup@togninja.com',
        ...fields,
      } as any);
    }
    // Page visibility and the sitemap read the language on the very next request, and
    // the PUBLIC site reads i18n_settings — a different table that nothing kept in step.
    invalidateSiteLanguage();
    invalidateStudioAddress();
    { const code = normalizeSiteLanguage(siteLanguage); if (code) await applySiteLanguageToI18n(code); }

    res.json({ success: true, nextStep: 'integrations', businessInfo });
  } catch (error) {
    console.error('Basics save error:', error);
    res.status(500).json({ error: 'Failed to save business information' });
  }
});

// ==================== PHASE 2: INTEGRATIONS ====================

router.get('/integrations', async (_req: Request, res: Response) => {
  try {
    const integ = await getIntegrationsRow();
    const ci = computeIntegrations(integ);
    res.json({
      // Rendered by the wizard:
      instagram: { connected: false, accounts: [] },
      google: { connected: ci.googleConnected, email: null },
      calendar: { connected: ci.calendarConnected, provider: ci.calendarConnected ? 'google' : null },
      stripe: { connected: ci.stripeConnected, mode: ci.stripeMode },
      // Extra real status (from technical setup) for completeness:
      email: { connected: ci.emailConnected },
      storage: { connected: ci.storageConnected },
      ai: { connected: ci.aiConnected },
    });
  } catch (error) {
    console.error('Integrations fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

router.post('/integrations/complete', async (_req: Request, res: Response) => {
  try {
    const integ = await getIntegrationsRow();
    const ci = computeIntegrations(integ);
    const connected: string[] = [];
    if (ci.stripeConnected) connected.push('stripe');
    if (ci.emailConnected) connected.push('email');
    if (ci.storageConnected) connected.push('storage');
    if (ci.aiConnected) connected.push('ai');
    if (ci.googleConnected) connected.push('google');
    if (ci.calendarConnected) connected.push('calendar');

    await patchState({ integrationsComplete: true });

    res.json({ success: true, nextStep: 'scanning', integrationsConnected: connected });
  } catch (error) {
    console.error('Integrations complete error:', error);
    res.status(500).json({ error: 'Failed to complete integrations phase' });
  }
});

// ==================== PHASE 3: SCANNING ====================

router.post('/scanning/start', async (_req: Request, res: Response) => {
  try {
    // Synchronous scan — kick off + report ready. Results are recomputed live in
    // /scanning/status so nothing depends on in-memory state.
    const scanId = `scan_${Date.now()}`;
    res.json({ success: true, scanId, status: 'complete', message: 'Scan completed successfully.' });
  } catch (error) {
    console.error('Scan start error:', error);
    res.status(500).json({ error: 'Failed to start scan' });
  }
});

router.get('/scanning/status/:scanId', async (req: Request, res: Response) => {
  try {
    const { scanId } = req.params;
    const items = await computeFixFirstItems();
    const [blog, gallery, products, clients] = await Promise.all([
      countRows(blogPosts),
      countRows(galleryImages),
      countRows(voucherProducts),
      countRows(crmClients),
    ]);

    res.json({
      scanId,
      status: 'complete',
      results: {
        pagesScanned: blog + gallery + products + clients,
        issuesFound: items.length,
        suggestionsGenerated: items.filter((i) => i.autoFixAvailable).length,
        contentBreakdown: { blogPosts: blog, galleryImages: gallery, products, clients },
        // IMPORTANT: the wizard reads results.fixFirstItems — always include it.
        fixFirstItems: items.map((i) => ({
          id: i.id,
          type: i.type,
          severity: i.severity,
          title: i.title,
          description: i.description,
        })),
      },
    });
  } catch (error) {
    console.error('Scan status error:', error);
    res.status(500).json({ error: 'Failed to get scan status' });
  }
});

router.post('/scanning/complete', async (_req: Request, res: Response) => {
  try {
    await patchState({ scanComplete: true });
    res.json({ success: true, nextStep: 'fix_first' });
  } catch (error) {
    console.error('Scanning complete error:', error);
    res.status(500).json({ error: 'Failed to complete scanning phase' });
  }
});

// ==================== PHASE 4: FIX FIRST ====================

router.get('/fix-first/items', async (_req: Request, res: Response) => {
  try {
    const state = await loadState();
    const fresh = await computeFixFirstItems();
    const items = fresh
      .filter((i) => !state.skippedFixes.includes(i.id))
      .map((i) => ({
        ...i,
        impact:
          i.severity === 'high'
            ? 'SEO improvement'
            : i.severity === 'medium'
              ? 'User experience'
              : 'Data quality',
        timeEstimate: i.autoFixAvailable ? '1 min' : '5 min',
        status: state.appliedFixes.includes(i.id) ? 'completed' : 'pending',
      }));

    res.json({
      items,
      totalCount: fresh.length,
      completedCount: state.appliedFixes.length,
      canSkip: true,
    });
  } catch (error) {
    console.error('Fix-first items error:', error);
    res.status(500).json({ error: 'Failed to get fix-first items' });
  }
});

router.post('/fix-first/apply/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    let applied = false;
    let fixedCount = 0;

    if (itemId === 'missing_meta') {
      const posts = await db
        .select()
        .from(blogPosts)
        .where(sql`${blogPosts.metaDescription} IS NULL OR ${blogPosts.metaDescription} = ''`)
        .limit(50);
      for (const post of posts) {
        const source =
          post.excerpt ||
          (post.content ? String(post.content).replace(/<[^>]+>/g, ' ') : '') ||
          post.title ||
          '';
        const meta = source.replace(/\s+/g, ' ').trim().slice(0, 155);
        if (meta) {
          await db.update(blogPosts).set({ metaDescription: meta }).where(eq(blogPosts.id, post.id));
          fixedCount++;
        }
      }
      applied = true;
    } else if (itemId === 'missing_product_desc') {
      const products = await db
        .select()
        .from(voucherProducts)
        .where(sql`${voucherProducts.description} IS NULL OR ${voucherProducts.description} = ''`)
        .limit(20);
      for (const p of products) {
        const fallback = `${p.name} — a professional photography experience from our studio. Get in touch to learn more or book your session.`;
        const desc = await aiText(
          `Write a warm, concise 1–2 sentence description for a photography-studio product called "${p.name}"${p.category ? ` in the "${p.category}" category` : ''}. No hashtags, no quotes.`,
          fallback,
          120
        );
        await db.update(voucherProducts).set({ description: desc }).where(eq(voucherProducts.id, p.id));
        fixedCount++;
      }
      applied = true;
    }

    const state = await loadState();
    await patchState({ appliedFixes: Array.from(new Set([...state.appliedFixes, itemId])) });

    res.json({
      success: true,
      itemId,
      status: applied ? 'completed' : 'manual',
      fixedCount,
      message: applied
        ? `Fixed ${fixedCount} item${fixedCount === 1 ? '' : 's'}`
        : 'This one needs a quick manual step in Settings',
    });
  } catch (error) {
    console.error('Fix apply error:', error);
    res.status(500).json({ error: 'Failed to apply fix' });
  }
});

router.post('/fix-first/skip/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const state = await loadState();
    await patchState({ skippedFixes: Array.from(new Set([...state.skippedFixes, itemId])) });
    res.json({ success: true, itemId, status: 'skipped' });
  } catch (error) {
    console.error('Fix skip error:', error);
    res.status(500).json({ error: 'Failed to skip fix' });
  }
});

router.post('/fix-first/complete', async (_req: Request, res: Response) => {
  try {
    await patchState({ fixFirstComplete: true });
    res.json({ success: true, nextStep: 'drafts' });
  } catch (error) {
    console.error('Fix-first complete error:', error);
    res.status(500).json({ error: 'Failed to complete fix-first phase' });
  }
});

// ==================== PHASE 5: DRAFTS ====================

router.get('/drafts', async (_req: Request, res: Response) => {
  try {
    const config = await getConfigRow();
    const state = await loadState(config);
    const drafts = buildDrafts(config).map((d) => ({
      id: d.id,
      type: d.type,
      title: d.title,
      description: d.description,
      previewText: d.previewText,
      status: state.publishedDrafts.includes(d.id)
        ? 'published'
        : state.skippedDrafts.includes(d.id)
          ? 'skipped'
          : 'draft',
      generatedAt: new Date().toISOString(),
    }));

    res.json({
      drafts,
      totalCount: drafts.length,
      publishedCount: drafts.filter((d) => d.status === 'published').length,
    });
  } catch (error) {
    console.error('Drafts fetch error:', error);
    res.status(500).json({ error: 'Failed to get drafts' });
  }
});

router.post('/drafts/:draftId/publish', async (req: Request, res: Response) => {
  try {
    const { draftId } = req.params;
    const { content } = req.body;
    const config = await getConfigRow();
    const draft = buildDrafts(config).find((d) => d.id === draftId);
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    const body = hasVal(content) ? String(content) : draft.previewText;
    const html = `<div style="font-family:sans-serif;line-height:1.6">${escapeHtml(body).replace(/\n/g, '<br>')}</div>`;

    if (draft.type === 'email_template') {
      await db.insert(emailTemplates).values({
        name: draft.title,
        category: draft.category || 'general',
        description: draft.description,
        subject: draft.subject || draft.title,
        previewText: draft.previewText.slice(0, 140),
        htmlContent: html,
        textContent: body,
      } as any);
    } else if (draft.type === 'blog_post') {
      const title = `Welcome to ${config?.businessName || config?.studioName || 'our studio'}`;
      const slug = `${slugify(title)}-${Date.now().toString(36)}`;
      await db.insert(blogPosts).values({
        title,
        slug,
        content: body,
        contentHtml: `<p>${escapeHtml(body).replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>')}</p>`,
        excerpt: body.replace(/\s+/g, ' ').trim().slice(0, 160),
        status: 'DRAFT',
        published: false,
      } as any);
    }

    const state = await loadState();
    await patchState({ publishedDrafts: Array.from(new Set([...state.publishedDrafts, draftId])) });

    res.json({ success: true, draftId, status: 'published' });
  } catch (error) {
    console.error('Draft publish error:', error);
    res.status(500).json({ error: 'Failed to publish draft' });
  }
});

router.post('/drafts/:draftId/skip', async (req: Request, res: Response) => {
  try {
    const { draftId } = req.params;
    const state = await loadState();
    await patchState({ skippedDrafts: Array.from(new Set([...state.skippedDrafts, draftId])) });
    res.json({ success: true, draftId, status: 'skipped' });
  } catch (error) {
    console.error('Draft skip error:', error);
    res.status(500).json({ error: 'Failed to skip draft' });
  }
});

// ==================== COMPLETE SETUP ====================

router.post('/complete', async (_req: Request, res: Response) => {
  try {
    await patchState({ draftsComplete: true });

    // Persist the completion flag so the wizard doesn't reappear after restart.
    const config = await getConfigRow();
    if (config) {
      await db
        .update(studioConfigs)
        .set({ creativeSetupComplete: true, updatedAt: new Date() })
        .where(eq(studioConfigs.id, config.id));
    }

    // NO starter landing page. Finishing onboarding used to auto-generate one and point
    // "/" at it, so the first thing a new studio saw was a single scrolling page titled
    // "Our Studio" with placeholder service cards — no navigation, no pillar pages, no
    // contact page — while the real site, seeded with the copy just crawled from their
    // own website, sat unserved behind it.
    //
    // The built-in template IS the website. It has the navigation and the pages, and
    // onboarding writes the studio's own copy into it. A studio that still wants a
    // single-page site can build a landing page and set it as its homepage by hand.

    if (hubIntegration.isConfigured()) {
      await hubIntegration.completeOnboarding();
    }

    res.json({
      success: true,
      message: 'Setup complete! Your studio management system is ready.',
      redirectTo: '/admin/dashboard',
    });
  } catch (error) {
    console.error('Setup complete error:', error);
    res.status(500).json({ error: 'Failed to complete setup' });
  }
});

export default router;
