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
import {
  studioConfigs,
  studioIntegrations,
  blogPosts,
  galleryImages,
  voucherProducts,
  crmClients,
  emailTemplates,
} from '../shared/schema';
import { eq, sql, count } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

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
      features: hubIntegration.getFeatureFlags(),
    });
  } catch (error) {
    console.error('Setup status error:', error);
    res.status(500).json({ error: 'Failed to get setup status' });
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
      phone,
      website,
      latitude,
      longitude,
      facebookUrl,
      instagramUrl,
      twitterUrl,
      vatNumber,
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
      phone: phone || null,
      website: website || null,
      latitude: latitude || null,
      longitude: longitude || null,
      facebookUrl: facebookUrl || null,
      instagramUrl: instagramUrl || null,
      twitterUrl: twitterUrl || null,
      currency: currency || 'EUR',
      vatNumber: vatNumber || null,
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
