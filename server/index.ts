// Console silencing temporarily disabled for debugging
// import '../silence-console.js';

import "dotenv/config";
import { validateEnv } from "./lib/validateEnv";

// PHASE 0: Fail fast on misconfiguration before anything else runs
validateEnv();

import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import http from "node:http";
// Import routes and jobs directly to fix client database access
import { registerRoutes } from "./routes";
import { licenseEnforcement, getLicenseStatus } from "./lib/license";
// Jobs loaded conditionally below to avoid startup crashes
// import "./jobs";
import { setupVite, serveStatic, log } from "./vite";
import { seoRedirects } from "./seoRedirects";
// Mount lightweight auth routes immediately (full routes registered later lazily)
import authRoutes from './routes/auth';
// Google Calendar 2-way sync: OAuth routes and scheduler
import googleAuthRoutes from './routes/googleAuth';
import { startSyncScheduler, triggerManualSync } from './services/syncScheduler';
import { importGoogleCalendarEvents } from './services/calendarService';
import { retryFailedSchedulerSyncs } from './services/schedulerGoogleCalendar';
// Agent V2: Modern ToolBus architecture
import agentV2Routes from './routes/agent-v2';
import { requireAgentAuth } from './lib/requireAgentAuth';
import agentShadowRoutes from './routes/agent-shadow';
// Manual Pages: Squarespace-style CMS for public pages
import manualPagesRoutes from './routes/manual-pages';
import studioBrandingRoutes from './routes/studio-branding';
import contractRoutes from './routes/contracts';
import capabilityRoutes from './routes/capabilities';
import migrationRoutes from './routes/migration';
import agentHistoryRoutes from './routes/agent-history';

// Import and configure session middleware
import { sessionConfig, requireAuth } from './auth';

// Import email service for initialization
import { EnhancedEmailService } from './services/enhancedEmailService';
import { SMSService } from './services/smsService';
import { sql, eq } from 'drizzle-orm';
import { db } from './db';
import { studioConfigs, studioIntegrations, adminUsers } from '../shared/schema';

// Prevent process crashes from unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  // Don't exit the process
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
  // Don't exit the process
});

// Environment defaults (don't force production locally)
if (process.env.DEMO_MODE == null) {
  process.env.DEMO_MODE = 'false';
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const BOOT_MARK = Date.now();
console.log('[BOOT] Starting minimal server bootstrap');
const app = express();

// MODULE-LEVEL server reference to prevent garbage collection
let serverInstance: any = null;

// Behind reverse proxies (Heroku/Render/etc.) trust the first proxy so secure cookies work when appropriate
app.set('trust proxy', 1);

// Gzip/deflate compression on all responses — big win for the large JS bundle
// and JSON payloads (bandwidth + Core Web Vitals). Cheap; safe for everything.
app.use(compression());

// Rate limiting: a generous global cap (blunts scraping / DoS on the new public
// URL) plus a strict cap on auth POSTs (login/register/reset brute-force). GETs
// (incl. session checks) and Stripe webhooks are exempt so nothing legitimate breaks.
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.path === '/healthz' ||
    req.path === '/api/stripe/webhook' ||
    req.path === '/api/invoices/webhook' ||
    req.path === '/api/vouchers/stripe-webhook' ||
    // Image proxy is on the gallery render hot path (many thumbnails per page)
    // and is a cacheable read, not an abuse vector — exempt so browsing a large
    // gallery can't trip the global cap.
    req.path === '/api/proxy-image',
});
app.use(globalLimiter);

const authWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== 'POST',
});
app.use('/api/auth', authWriteLimiter);

// Increase body size limits to accommodate large image payloads (base64 encoded images can be 10MB+)
// Skip JSON body parsing for Stripe webhook endpoints — they need the raw body Buffer
// for signature verification via express.raw()
const jsonParser = express.json({ limit: '50mb' });
app.use((req, res, next) => {
  if (
    req.path === '/api/stripe/webhook' ||
    req.path === '/api/invoices/webhook' ||
    req.path === '/api/vouchers/stripe-webhook'
  ) {
    return next();
  }
  jsonParser(req, res, next);
});

// Also skip urlencoded parser for webhook endpoints to avoid any body stream interference
const urlencodedParser = express.urlencoded({ extended: false, limit: '50mb' });
app.use((req, res, next) => {
  if (
    req.path === '/api/stripe/webhook' ||
    req.path === '/api/invoices/webhook' ||
    req.path === '/api/vouchers/stripe-webhook'
  ) {
    return next();
  }
  urlencodedParser(req, res, next);
});

// Instance licence enforcement (self-host anti-piracy). No-op unless
// LICENSE_PUBLIC_KEY is set and DEMO_MODE!=='true'; then it blocks admin writes
// on a missing/invalid/expired licence while leaving the public site + reads up.
app.use(licenseEnforcement);
try {
  const _lic = getLicenseStatus();
  console.log(`🔑 Licence: ${_lic.enforced ? _lic.state.toUpperCase() : 'not enforced'}${_lic.expiresAt ? ` (expires ${_lic.expiresAt})` : ''}`);
} catch { /* never block boot on licence logging */ }

// Add CORS headers for API requests
app.use((req, res, next) => {
  // Echo back the request origin to support credentials; default to * if none
  const origin = (req.headers.origin as string) || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health & ping endpoints before anything else for diagnostics
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok-preinit', uptime: process.uptime(), bootMs: Date.now() - BOOT_MARK });
});

// ==================== FAST-PATH STRIPE WEBHOOK ====================
// Registered BEFORE session middleware and heavy init so that even during
// cold-start the server can acknowledge Stripe webhooks within milliseconds.
// The full handler in routes.ts does async processing; this early handler
// ensures we never time out during boot.
import Stripe from 'stripe';

const _earlyStripeKey = process.env.STRIPE_SECRET_KEY;
const _earlyWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
let _earlyStripe: Stripe | null = null;
if (_earlyStripeKey && _earlyStripeKey.length >= 20 && !_earlyStripeKey.includes('dummy')) {
  try { _earlyStripe = new Stripe(_earlyStripeKey, { apiVersion: '2025-08-27.basil' }); } catch {}
}

// Track whether the full route handler from routes.ts has taken over
(global as any).__fullWebhookRegistered = false;

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req: any, res: any, next: any) => {
  // Once routes.ts has registered its full handler, defer to it
  if ((global as any).__fullWebhookRegistered) return next();

  // Fast-path: verify signature and respond 200 immediately
  const startMs = Date.now();
  console.log(`🔵 [EARLY-WEBHOOK] Stripe webhook received during boot at ${new Date().toISOString()}`);

  if (!_earlyStripe || !_earlyWebhookSecret || _earlyWebhookSecret.startsWith('http')) {
    console.error('❌ [EARLY-WEBHOOK] Stripe not configured');
    return res.status(200).json({ received: true, note: 'acknowledged-during-boot' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  try {
    const event = _earlyStripe.webhooks.constructEvent(req.body, sig, _earlyWebhookSecret);
    console.log(`✅ [EARLY-WEBHOOK] Verified ${event.type} in ${Date.now() - startMs}ms — queuing for later processing`);
    // Respond immediately — event will be retried by Stripe if processing is needed
    res.status(200).json({ received: true, type: event.type, id: event.id, early: true });
  } catch (err: any) {
    console.error('❌ [EARLY-WEBHOOK] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
});
// ==================== END FAST-PATH STRIPE WEBHOOK ====================

// Session middleware must be before auth routes (still early but after healthz)
// Skip session middleware for webhook endpoints — they don't need sessions,
// and the PgStore DB pool can hang/timeout causing Stripe webhook failures
app.use((req, res, next) => {
  if (
    req.path === '/api/stripe/webhook' ||
    req.path === '/api/invoices/webhook' ||
    req.path === '/api/vouchers/stripe-webhook'
  ) {
    return next();
  }
  sessionConfig(req, res, next);
});

// Early auth routes so backend login functions even before lazy route load
app.use('/api/auth', authRoutes);
app.use('/api/auth/*', (req, _res, next) => { console.log('[AUTH-EARLY]', req.method, req.originalUrl); next(); });
// Google Calendar OAuth routes
app.use('/api/auth', googleAuthRoutes);
// Agent V2 routes (ToolBus architecture).
// Was mounted with no middleware at all, so an anonymous caller reached the studio's
// assistant and agent-v2.ts defaulted them to a writer-privileged "demo_user". Verified
// live: /api/agent/v2/stats answered 200 to a request carrying nothing.
app.use('/api/agent/v2', requireAgentAuth, agentV2Routes);
console.log('[AGENT-V2] Routes registered at /api/agent/v2 (authenticated)');

// Manual Pages CMS routes
app.use('/api/manual-pages', manualPagesRoutes);
console.log('[MANUAL-PAGES] Routes registered at /api/manual-pages');

// Studio Branding (logo, business info, colours, template) — drives public site
app.use('/api/studio', studioBrandingRoutes);

// Contracts. Studio-side routes are auth-gated inside the router; the client's signing
// page is public by necessity and authorised by an unguessable per-contract token.
app.use('/api/contracts', contractRoutes);
// What this studio can actually do. Read by the client gate so a locked feature looks and
// behaves the same everywhere instead of each screen inventing its own refusal.
app.use('/api/capabilities', capabilityRoutes);
// Where the old site pages should point once the domain moves here. Authenticated: this
// decides what every visitor and every crawler sees.
app.use('/api/migration', requireAuth, migrationRoutes);
// What the assistant has been asked. Written since it shipped, read by nobody until now.
app.use('/api/agent-history', requireAuth, agentHistoryRoutes);
console.log('[CONTRACTS] Routes registered at /api/contracts');
console.log('[STUDIO-BRANDING] Routes registered at /api/studio/branding');

// Shadow mode routes (V1 vs V2 comparison)
if (process.env.AGENT_V2_SHADOW === 'true') {
  app.use('/api/agent/shadow', agentShadowRoutes);
  console.log('[SHADOW MODE] Routes registered at /api/agent/shadow');
  console.log('[SHADOW MODE] V1 and V2 will run in parallel for comparison');
}

// Serve uploaded files statically
app.use('/uploads', express.static('public/uploads'));

// Serve blog images statically (before Vite middleware)
app.use('/blog-images', express.static('server/public/blog-images', {
  setHeaders: (res, path) => {
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
  }
}));

// Domain redirect middleware - redirect root domain to www
app.use((req, res, next) => {
  const wwwHost = process.env.CANONICAL_HOST; // e.g. 'www.newagefotografie.com'
  const bareHost = wwwHost?.replace(/^www\./, '');
  if (wwwHost && bareHost && req.headers.host === bareHost) {
    return res.redirect(301, `https://${wwwHost}${req.url}`);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Note: global error handlers already set above and do NOT exit the process

    console.log('🚀 Starting New Age Fotografie CRM server...');
    
    // ========== START LISTENING IMMEDIATELY ==========
    // Start the HTTP server FIRST so we can accept health checks and Stripe
    // webhooks (via the early fast-path handler) even while services initialize.
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
    
    console.log(`🎯 Starting HTTP server on ${host}:${port} EARLY (before full init)...`);
    serverInstance = app.listen(port, host);
    
    const attachServerHandlers = (srv: any, { reason }: { reason: string }) => {
      srv.on('listening', () => {
        const addr = srv.address();
        console.log(`✅ HTTP server LISTENING on ${host}:${port} (${reason})`);
        console.log(`🔍 Server address:`, addr);
        console.log(`🔍 Server listening:`, srv.listening);
      });

      srv.on('error', (err: any) => {
        console.error('❌ HTTP server error:', err);
        console.error('Error code:', err.code);
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${port} is already in use!`);
        }
      });

      srv.on('close', () => {
        console.warn('⚠️ Server "close" event fired - port released!');
        try {
          const addr = srv?.address?.();
          console.warn('⚠️ Close context:', { addr, listening: srv?.listening });
        } catch {}

        const allowRebind = (process.env.RETRY_LISTEN_ON_CLOSE ?? (process.env.NODE_ENV !== 'production' ? 'true' : 'false')) === 'true';
        (global as any).__rebindAttempted = (global as any).__rebindAttempted ?? false;
        if (allowRebind && !(global as any).__rebindAttempted) {
          (global as any).__rebindAttempted = true;
          console.warn('🛠️ Attempting one-shot rebind after close (dev safeguard)...');
          setTimeout(() => {
            try {
              const newSrv = app.listen(port, host);
              serverInstance = newSrv;
              (global as any).__server = newSrv;
              attachServerHandlers(newSrv, { reason: 'rebind' });
            } catch (e: any) {
              console.error('❌ Rebind attempt failed:', e?.message || e);
            }
          }, 500);
        }
      });
    };

    attachServerHandlers(serverInstance, { reason: 'initial' });
    (global as any).__server = serverInstance;
    const server = serverInstance;
    console.log(`🔧 Server object created, waiting for 'listening' event...`);
    // ========== END EARLY LISTEN ==========

    // Hydrate process.env from DB config (setup-wizard values) BEFORE services
    // initialise and routes register, so runtime code that reads process.env
    // directly (Stripe voucher checkout, OpenAI, Google OAuth, IMAP, Brevo, …)
    // picks up wizard-entered config. Env always wins → an env-configured
    // deployment is untouched. Best-effort; never blocks boot.
    // SEAL THE PLATFORM KEY FIRST, and say plainly whether there is one.
    //
    // platformOpenAI must never resolve a key a tenant can write, and hydrateEnvFromDb below
    // writes the STUDIO's stored OpenAI key into OPENAI_API_KEY whenever that slot is empty —
    // which is exactly the shape of a provisioned tenant. So the platform's key is whatever was
    // in the environment BEFORE this line, and it is captured here rather than relying on the
    // module happening to be imported before boot reached this point.
    //
    // The log matters as much as the seal. If a deployment has no platform key, site generation
    // refuses, and the studio-facing message is deliberately vague ("not switched on for this
    // instance yet") because there is nothing they can do about it. Whoever runs the instance
    // needs the specific reason, at boot, not a support ticket about a blank homepage.
    try {
      const { sealPlatformKey } = await import('./lib/openaiClient');
      const sealed = sealPlatformKey();
      console.log(sealed
        ? '🔑 Platform AI key sealed — site generation is funded'
        : '⚠️ NO PLATFORM AI KEY. Onboarding will crawl a site and then generate nothing.\n'
          + '   Set PLATFORM_OPENAI_API_KEY on this service (or OPENAI_API_KEY in its environment,\n'
          + '   not only in the database) and redeploy. A key stored only in studio_integrations is\n'
          + '   the STUDIO\'s and must not fund platform work.');
    } catch (e: any) {
      console.warn('⚠️ Could not seal the platform AI key (non-fatal):', e?.message || e);
    }

    try {
      const { config } = await import('./config-reader');
      const filled = await config.hydrateEnvFromDb();
      if (filled > 0) console.log(`🔧 Hydrated ${filled} setup-wizard config value(s) from DB into process.env`);
    } catch (e: any) {
      console.warn('⚠️ Config hydration from DB failed (non-fatal):', e?.message || e);
    }

    // Initialize services with error handling
    try {
      await EnhancedEmailService.initialize();
      console.log('✅ Email service initialized');
    } catch (error) {
      console.warn('⚠️ Email service initialization failed:', error.message);
    }

    try {
      await SMSService.initialize();
      console.log('✅ SMS service initialized');
    } catch (error) {
      console.warn('⚠️ SMS service initialization failed:', error.message);
    }

    // Skip complex database migrations for now to avoid startup issues
    try {
      // Quick database test
      await db.execute(sql`SELECT 1 as test`);
      console.log('✅ Database connection verified');

      // Schema-presence check. A brand-new instance pointed at an EMPTY database
      // (schema never created) would otherwise 500 on every data call with no
      // clue why. Detect it and print a big, actionable message. The boot
      // ALTER TABLE migrations below all assume the tables already exist, so
      // this must come first.
      try {
        const core: any = await db.execute(sql`SELECT to_regclass('public.studio_configs') AS t`);
        const hasSchema = !!((core?.rows?.[0] ?? core?.[0])?.t);
        if (!hasSchema) {
          console.error('');
          console.error('🚨 ═══════════════════════════════════════════════════════');
          console.error('🚨  DATABASE HAS NO SCHEMA — this instance will not work.');
          console.error('🚨 ═══════════════════════════════════════════════════════');
          console.error('   The database connected, but the CRM tables do not exist.');
          console.error('   You pointed the app at an EMPTY database without provisioning it.');
          console.error('');
          console.error('   Fix: run this ONCE against THIS database, then redeploy —');
          console.error('     npm run provision -- --name "Studio" --db "<this DATABASE_URL>"');
          console.error('   (creates the schema + baseline). Until then /setup and all');
          console.error('   data pages will error.');
          console.error('');
        }
      } catch (schemaCheckErr: any) {
        console.warn('⚠️ schema-presence check failed:', schemaCheckErr?.message || schemaCheckErr);
      }

      // Run gallery images migration to add size tracking
      try {
        await db.execute(sql`ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS size_bytes INTEGER DEFAULT 0`);
        await db.execute(sql`ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS content_type TEXT`);
        await db.execute(sql`ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE`);

        // A print order is now PAID before it is dispatched, so the row has to remember
        // which Stripe session paid for it. stripe_session_id is also the idempotency
        // anchor: unique, so one session can never produce two print orders however many
        // times Stripe retries the webhook.
        await db.execute(sql`ALTER TABLE print_orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT`);
        await db.execute(sql`ALTER TABLE print_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`);
        await db.execute(sql`ALTER TABLE print_orders ADD COLUMN IF NOT EXISTS currency TEXT`);
        await db.execute(sql`ALTER TABLE print_orders ADD COLUMN IF NOT EXISTS amount_charged NUMERIC`);
        try {
          await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS print_orders_stripe_session_key ON print_orders (stripe_session_id) WHERE stripe_session_id IS NOT NULL`);
        } catch (e: any) {
          console.warn('⚠️ print_orders.stripe_session_id is not unique:', e?.message);
        }
        // gallery_images.rating is TEXT, not INTEGER.
        //
        // The proofing feature — the client marking each photograph love / maybe /
        // reject — writes those three words. The column was created INTEGER, so every
        // click returned 500 (invalid input syntax for type integer: "love") and the
        // gallery showed "Failed to update rating". Nothing in the codebase ever read
        // this column as a number; the type was wrong from the start.
        //
        // Checked in JS rather than a PL/pgSQL DO block so this never rewrites the
        // table on a boot that does not need it — and because USING NULL would wipe
        // real ratings if it ran a second time.
        const ratingCol: any = await db.execute(sql`
          SELECT data_type FROM information_schema.columns
           WHERE table_name = 'gallery_images' AND column_name = 'rating'`);
        const ratingType = (ratingCol?.rows ?? ratingCol)?.[0]?.data_type;
        if (ratingType && ratingType !== 'text') {
          // USING NULL, not a cast: an integer here could only have come from a write
          // that never succeeded, so there is no meaning to preserve.
          await db.execute(sql`ALTER TABLE gallery_images ALTER COLUMN rating TYPE TEXT USING NULL`);
          console.log('✅ gallery_images.rating converted from ' + ratingType + ' to text');
        }
        console.log('✅ Gallery images size tracking migration completed');
      } catch (migrationError) {
        console.warn('⚠️ Gallery migration already applied or failed:', migrationError.message);
      }

      // Email→order attribution: campaign that drove a voucher purchase.
      try {
        await db.execute(sql`ALTER TABLE voucher_sales ADD COLUMN IF NOT EXISTS campaign_id TEXT`);
        console.log('✅ voucher_sales.campaign_id attribution column ensured');
      } catch (migrationError: any) {
        console.warn('⚠️ voucher_sales.campaign_id migration already applied or failed:', migrationError.message);
      }

      // Landing pages: analytics events table + publishing/preview columns were
      // referenced by code but had no repo migration (broke analytics + preview
      // links on any reproducibly-provisioned DB). Ensure them idempotently.
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS landing_page_events (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            landing_page_id uuid,
            event_type text NOT NULL,
            event_label text,
            event_value numeric,
            variant_key text,
            session_id text,
            visitor_id text,
            source text,
            medium text,
            campaign text,
            referrer text,
            page_path text,
            metadata_json jsonb DEFAULT '{}'::jsonb,
            occurred_at timestamptz DEFAULT now()
          )`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_lpe_page ON landing_page_events(landing_page_id)`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_lpe_occurred ON landing_page_events(occurred_at)`);
        // landing_pages / landing_page_revisions base tables — historically created by a
        // manual migration, so ABSENT on a fresh DB; the ALTERs below then failed and the
        // whole landing-page / homepage / theme feature 500'd ("relation landing_pages does
        // not exist"). Create them here so every instance has them.
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await db.execute(sql`CREATE TABLE IF NOT EXISTS landing_pages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id TEXT, title TEXT NOT NULL, slug TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
          page_type TEXT DEFAULT 'general', primary_service TEXT, target_audience TEXT,
          offer_summary TEXT, city TEXT, tone TEXT DEFAULT 'warm',
          seo_title TEXT, meta_description TEXT, hero_headline TEXT, hero_subheadline TEXT,
          cta_text TEXT DEFAULT 'Book Now', cta_action TEXT DEFAULT 'book_now',
          schema_type TEXT DEFAULT 'LocalBusiness',
          content_json JSONB DEFAULT '{}', generation_prompt_json JSONB DEFAULT '{}',
          generation_context_json JSONB DEFAULT '{}', preview_image_url TEXT, published_url TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), published_at TIMESTAMPTZ
        )`);
        await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug)`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_landing_pages_status ON landing_pages(status)`);
        await db.execute(sql`CREATE TABLE IF NOT EXISTS landing_page_revisions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
          version_number INT NOT NULL DEFAULT 1,
          content_json JSONB DEFAULT '{}', generation_context_json JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(), created_by TEXT
        )`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_lpr_page ON landing_page_revisions(landing_page_id)`);
        await db.execute(sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS preview_token TEXT`);
        await db.execute(sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS preview_token_expires_at TIMESTAMPTZ`);
        await db.execute(sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS canonical_url TEXT`);
        await db.execute(sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS noindex BOOLEAN DEFAULT FALSE`);
        // CTA voucher binding + hero media (image/video). cta_voucher_amount +
        // cta_voucher_title drive a DYNAMIC-priced voucher offer (the CTA sends
        // the customer to personalise + pay exactly this amount via Stripe).
        await db.execute(sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS cta_voucher_slug TEXT`);
        await db.execute(sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS cta_voucher_amount NUMERIC`);
        await db.execute(sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS cta_voucher_title TEXT`);
        // Studio billing identity — captured in the onboarding wizard, surfaced on
        // invoices and the ShootCleaner /studio endpoint.
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR'`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS vat_number TEXT`);
        // WHO the studio is. A page-quality audit found the site could not name a single
        // human: no field existed for a photographer's name anywhere in the product, so
        // the About page said "the photographer" and the JSON-LD had no Person at all.
        // Experience and expertise are the two things a crawl cannot reliably infer and a
        // model must never invent, so they are asked for and stored.
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS owner_name TEXT`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS owner_role TEXT`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS owner_portrait_url TEXT`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS founding_year INTEGER`);
        // [{ label, issuer?, year? }] — qualifications, memberships, insurance, awards.
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS credentials JSONB`);
        await db.execute(sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS hero_image_url TEXT`);
        await db.execute(sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS hero_video_url TEXT`);
        // Video placement: 'hero' (background, default) | 'below' | 'both'.
        await db.execute(sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS hero_video_placement TEXT`);
        // In-body video position: 'top' (below hero, default) | 'middle' | 'end'.
        await db.execute(sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS hero_video_position TEXT`);
        // CTA destination when there's no voucher: cta_action 'email'/'whatsapp'
        // uses these (fall back to the studio's contact email / phone).
        await db.execute(sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS cta_email TEXT`);
        await db.execute(sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS cta_whatsapp TEXT`);
        // Drag-to-fit hero crop: JSON {x,y,zoom} — object-position % + scale.
        await db.execute(sql`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS hero_image_position TEXT`);
        console.log('✅ landing_page_events + publishing/media/CTA columns ensured');
      } catch (migrationError: any) {
        console.warn('⚠️ landing pages migration already applied or failed:', migrationError.message);
      }

      // Per-tenant Social & Reviews credentials. Purely ADDITIVE columns, so
      // this is safe on an existing production database.
      try {
        // The studio's OWN competitor-search key. The Price Wizard read TAVILY_API_KEY
        // straight from process.env, so the only way to set one was a host environment
        // variable — which a studio who bought this product cannot reach. With no column
        // there was nowhere for their key to live even if the UI offered a box.
        await db.execute(sql`ALTER TABLE studio_integrations ADD COLUMN IF NOT EXISTS search_api_key_encrypted TEXT`);
        // Why a Price Wizard run failed. Without it "failed" is undiagnosable by anyone,
        // including whoever is trying to help.
        await db.execute(sql`ALTER TABLE price_wizard_sessions ADD COLUMN IF NOT EXISTS error_message TEXT`);
        // How many prices a suggestion was computed from. Without it the UI stated market
        // position with the same confidence for a median drawn from one quote as from
        // twenty-three — and divided by a zero range, printing "higher than Infinity% of
        // competitors".
        await db.execute(sql`ALTER TABLE price_list_suggestions ADD COLUMN IF NOT EXISTS sample_size INTEGER`);
        // The studio-level document design defaults: header image, the cover-image library,
        // and whether to prefer the client own gallery. Per-document overrides use the same
        // shape, so one merge covers both (see server/lib/documentHeader.ts).
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS document_design JSONB`);
        // The per-document override. SAME shape as the studio default above, so the merge
        // is a spread: { ...studioDefaults, ...(document.documentDesign || {}) } — exactly
        // what GalleryPage already does with cover_template, which works, so it is copied
        // rather than reinvented.
        await db.execute(sql`ALTER TABLE crm_invoices ADD COLUMN IF NOT EXISTS document_design JSONB`);
        await db.execute(sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS document_design JSONB`);
        // Which payment reminders have gone out for an invoice, so a stage is never sent
        // twice. [{ stage, at, demo }].
        await db.execute(sql`ALTER TABLE crm_invoices ADD COLUMN IF NOT EXISTS reminders_sent JSONB`);
        // Where an OLD url from the studio previous site should now point.
        //
        // Without this, pointing a domain at this product orphans every page we did not
        // rebuild — and server/vite.ts answers an unmatched path with the homepage at HTTP
        // 200, so ninety dead URLs become ninety copies of one page rather than ninety
        // honest 404s. Duplicate content at that scale can suppress a whole domain.
        await db.execute(sql`CREATE TABLE IF NOT EXISTS site_redirects (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          from_path text NOT NULL UNIQUE,
          to_path text NOT NULL,
          status integer NOT NULL DEFAULT 301,
          reason text,
          confidence text,
          approved boolean NOT NULL DEFAULT false,
          created_at timestamptz DEFAULT now()
        )`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS site_redirects_from ON site_redirects(from_path)`);
        await db.execute(sql`ALTER TABLE studio_integrations ADD COLUMN IF NOT EXISTS google_places_api_key_encrypted TEXT`);
        await db.execute(sql`ALTER TABLE studio_integrations ADD COLUMN IF NOT EXISTS google_places_place_id TEXT`);
        await db.execute(sql`ALTER TABLE studio_integrations ADD COLUMN IF NOT EXISTS pulse_api_key_encrypted TEXT`);
        await db.execute(sql`ALTER TABLE studio_integrations ADD COLUMN IF NOT EXISTS pulse_profiles JSONB`);
        await db.execute(sql`ALTER TABLE studio_integrations ADD COLUMN IF NOT EXISTS pulse_mode TEXT DEFAULT 'draft'`);
        console.log('✅ studio_integrations social/reviews columns ensured');
      } catch (migrationError: any) {
        console.warn('⚠️ social/reviews integration migration failed:', migrationError.message);
      }

      // Admin notification read/dismiss state. Notifications themselves are
      // DERIVED from live data (leads, sales, emails, questionnaires, config
      // warnings) with stable ids, so we only persist what the admin has
      // already seen or cleared.
      try {
        await db.execute(sql`CREATE TABLE IF NOT EXISTS admin_notification_state (
          id TEXT PRIMARY KEY,
          read_at TIMESTAMPTZ,
          dismissed_at TIMESTAMPTZ
        )`);
        console.log('✅ admin_notification_state table ensured');
      } catch (migrationError: any) {
        console.warn('⚠️ notification state migration failed:', migrationError.message);
      }

      // Voucher sales: store a product name resolved from Stripe when the sale
      // has no linked CRM product (e.g. in-person payment-link sales). Additive.
      try {
        await db.execute(sql`ALTER TABLE voucher_sales ADD COLUMN IF NOT EXISTS resolved_product_name TEXT`);
        // Stripe linkage + PDF columns are written via raw SQL (not declared in the
        // Drizzle schema), so a fresh DB lacks them and the sales sync fails with
        // "column stripe_session_id does not exist". Ensure they exist here.
        await db.execute(sql`ALTER TABLE voucher_sales ADD COLUMN IF NOT EXISTS stripe_session_id TEXT`);
        await db.execute(sql`ALTER TABLE voucher_sales ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT`);
        await db.execute(sql`ALTER TABLE voucher_sales ADD COLUMN IF NOT EXISTS pdf_url TEXT`);
        console.log('✅ voucher_sales.resolved_product_name column ensured');
      } catch (migrationError: any) {
        console.warn('⚠️ voucher_sales resolved_product_name migration failed:', migrationError.message);
      }

      // Blog posts: optional video (uploaded .mp4 on B2, or a YouTube/Vimeo link).
      try {
        await db.execute(sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS video_url TEXT`);
        console.log('✅ blog_posts.video_url column ensured');
      } catch (migrationError: any) {
        console.warn('⚠️ blog_posts video migration already applied or failed:', migrationError.message);
      }

      // Warm the storage-config cache (studio_integrations → env) so
      // wizard-configured Backblaze/S3 works from the first upload request.
      try {
        const { refreshStorageConfig } = await import('./services/s3-storage');
        await refreshStorageConfig();
        console.log('✅ Storage config warmed (wizard config → env fallback)');
      } catch (storageWarmErr: any) {
        console.warn('⚠️ Storage config warm failed:', storageWarmErr?.message || storageWarmErr);
      }

      // Run onboarding columns migration
      try {
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS technical_setup_complete BOOLEAN DEFAULT FALSE`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS creative_setup_complete BOOLEAN DEFAULT FALSE`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS app_url TEXT`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS frontend_url TEXT`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS public_site_base_url TEXT`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS ga4_measurement_id TEXT`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'auto'`);
        // AI homepage generation (crawl existing site -> landing page -> set as "/").
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS homepage_gen_state JSONB`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS homepage_draft_landing_id UUID`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS homepage_landing_slug TEXT`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS pricing_embed_url TEXT`);
        // Gallery soft-delete. Deleting a gallery used to run DELETE FROM galleries
        // plus its images — irreversible, with a "Trash" filter in the admin that had
        // nothing to show because nothing was ever kept.
        await db.execute(sql`ALTER TABLE galleries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
        // Which public pages this studio runs. NULL = use the language defaults in
        // shared/sitePages.ts. Disabled pages stay in the codebase as templates.
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS enabled_pages JSONB`);
        // The language the studio's public site is written in, chosen at onboarding.
        // Code already queried studio_configs.site_language in two places; the column had
        // never existed, so those queries threw on every request and their callers
        // silently fell back to defaults.
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS site_language TEXT`);
        // Whether the studio sells online. NULL = not answered = enabled, so every
        // existing studio keeps the behaviour it already has.
        await db.execute(sql`ALTER TABLE studio_integrations ADD COLUMN IF NOT EXISTS ecommerce_enabled BOOLEAN`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS shootcleaner_api_key TEXT`);
        // Authority Map — per-studio topical-cluster + internal-link structure (falls back
        // to the New Age seed in shared/authorityMap.ts when null).
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS authority_map JSONB`);
        // Site theme preset (token-based) for the public site / generated homepage.
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS site_theme_preset TEXT`);
        // How the public site is COMPOSED, separately from how it is coloured. Eight distinct
        // palettes still produced eight pages with the same bones, because the preset could
        // only ever re-skin one arrangement.
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS site_layout TEXT`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS site_theme_tokens JSONB`);
        // Studio tax settings (Studio Customization → Settings): the studio's country tax/VAT
        // rate + label, applied to invoices so a UK studio charges 20% VAT, a DE studio 19% USt.
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS default_tax_rate NUMERIC(5,2) DEFAULT 0`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS tax_label TEXT DEFAULT 'VAT'`);
        // When an invoice was paid — reconciled by ShootCleaner's GET /orders poll.
        await db.execute(sql`ALTER TABLE crm_invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`);
        // Gmail via OAuth (one-click "Connect Gmail") — the connected address + refresh token.
        await db.execute(sql`ALTER TABLE studio_integrations ADD COLUMN IF NOT EXISTS gmail_email TEXT`);
        await db.execute(sql`ALTER TABLE studio_integrations ADD COLUMN IF NOT EXISTS gmail_refresh_token_encrypted TEXT`);
        // Prodigi print fulfilment: per-tenant API key (encrypted) + sandbox/production toggle.
        await db.execute(sql`ALTER TABLE studio_integrations ADD COLUMN IF NOT EXISTS prodigi_api_key_encrypted TEXT`);
        await db.execute(sql`ALTER TABLE studio_integrations ADD COLUMN IF NOT EXISTS prodigi_environment TEXT DEFAULT 'sandbox'`);
        // Bundle fulfilment (TogNinja + ShootCleaner package delivery).
        await db.execute(sql`CREATE TABLE IF NOT EXISTS bundle_deliveries (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          token text UNIQUE NOT NULL, customer_name text, customer_email text,
          status text NOT NULL DEFAULT 'pending', instance_url text,
          shootcleaner_api_key text, shootcleaner_download_url text, stripe_session_id text, notes text,
          created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), delivered_at timestamptz
        )`);
        // Homepage & portfolio image managers (Website Studio → Customise). These were only
        // ever created ad hoc on the New Age DB; create them on every instance so a fresh
        // studio's homepage image list doesn't 500 and the managers work.
        await db.execute(sql`CREATE TABLE IF NOT EXISTS homepage_images (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          section text NOT NULL, url text NOT NULL, alt text, title text,
          sort_order integer DEFAULT 0, is_active boolean DEFAULT true,
          created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
        )`);
        await db.execute(sql`CREATE TABLE IF NOT EXISTS portfolio_images (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          category text NOT NULL, url text NOT NULL, alt text, title text, description text,
          sort_order integer DEFAULT 0, is_active boolean DEFAULT true,
          created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
        )`);
        // ShootCleaner outbound webhook (invoice.paid): where to POST + the HMAC secret.
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS shootcleaner_webhook_url TEXT`);
        await db.execute(sql`ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS shootcleaner_webhook_secret TEXT`);
        // Idempotency for outbound webhooks: stamp when a paid-invoice notice was delivered.
        // (Table is normally created lazily on first ShootCleaner call — ensure it exists.)
        await db.execute(sql`CREATE TABLE IF NOT EXISTS shootcleaner_exports (external_ref text PRIMARY KEY, entity_type text NOT NULL, entity_id text NOT NULL, created_at timestamptz DEFAULT now())`);
        await db.execute(sql`ALTER TABLE shootcleaner_exports ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ`);
        console.log('✅ Onboarding columns migration completed');
      } catch (migrationError: any) {
        console.warn('⚠️ Onboarding columns migration already applied or failed:', migrationError.message);
      }

      // Critical tables — ensured INDEPENDENTLY (each in its own try) so one failure can't
      // suppress the others. The block above bundles CREATEs behind ~25 ALTERs in a single
      // try; if an early ALTER throws on a fresh DB, those CREATEs silently never run
      // (that's why publish 500'd and homepage images showed "(0)" on new instances).
      const ensureTable = async (label: string, stmt: any) => {
        try { await db.execute(stmt); }
        catch (e: any) { console.warn(`⚠️ ensureTable [${label}] failed:`, e?.message || e); }
      };
      // Website Studio "Customise" page content (draft/published). Was only ever created by
      // an ad-hoc script on the New Age DB → publish 500'd on fresh instances. NO FK on
      // studio_id (matches the proven ad-hoc DDL) so an insert can't violate a missing
      // studio_configs row when getStudioId falls back to the canonical id.
      await ensureTable('manual_page_content', sql`CREATE TABLE IF NOT EXISTS manual_page_content (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        studio_id uuid NOT NULL,
        page_id text NOT NULL,
        language text NOT NULL DEFAULT 'de',
        draft_content jsonb DEFAULT '{}'::jsonb,
        published_content jsonb DEFAULT '{}'::jsonb,
        status text DEFAULT 'draft',
        published_at timestamptz,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        CONSTRAINT manual_page_content_unique UNIQUE (studio_id, page_id, language)
      )`);
      // Homepage & portfolio image managers — re-ensured here in case the bundled block
      // above aborted before reaching their CREATEs.
      await ensureTable('homepage_images', sql`CREATE TABLE IF NOT EXISTS homepage_images (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        section text NOT NULL, url text NOT NULL, alt text, title text,
        sort_order integer DEFAULT 0, is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
      )`);
      await ensureTable('portfolio_images', sql`CREATE TABLE IF NOT EXISTS portfolio_images (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        category text NOT NULL, url text NOT NULL, alt text, title text, description text,
        sort_order integer DEFAULT 0, is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
      )`);

      // Questionnaires / surveys — the admin Questionnaires page (templates + shareable
      // links + responses) depends on these three tables. They were ONLY created by
      // database.js's monolithic initializeDatabaseSchema(), which aborts on the first
      // failing CREATE — so on some instances the questionnaire tables (near the end)
      // never got made and the page 500'd ("Failed to fetch questionnaire responses",
      // empty template dropdown → Create Link disabled). Ensure them here, each isolated,
      // matching the columns the V2 endpoints actually query.
      await ensureTable('surveys', sql`CREATE TABLE IF NOT EXISTS surveys (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        title text NOT NULL, description text, status text DEFAULT 'active',
        pages jsonb DEFAULT '[]'::jsonb, settings jsonb DEFAULT '{}'::jsonb,
        created_by text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
      )`);
      await ensureTable('questionnaire_links', sql`CREATE TABLE IF NOT EXISTS questionnaire_links (
        token text PRIMARY KEY, client_id text, template_id text, is_used boolean DEFAULT false,
        expires_at timestamptz, created_at timestamptz DEFAULT now()
      )`);
      await ensureTable('questionnaire_responses', sql`CREATE TABLE IF NOT EXISTS questionnaire_responses (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        client_id text, token text, template_slug text, answers jsonb,
        client_name text, client_email text, submitted_at timestamptz DEFAULT now()
      )`);
      // Back-fill the columns the V2 responses endpoint reads, in case an OLDER
      // questionnaire_responses table exists without them (CREATE IF NOT EXISTS won't add
      // columns to an existing table → the responses SELECT would 500 on a missing column).
      await ensureTable('qr+client_name', sql`ALTER TABLE questionnaire_responses ADD COLUMN IF NOT EXISTS client_name text`);
      await ensureTable('qr+client_email', sql`ALTER TABLE questionnaire_responses ADD COLUMN IF NOT EXISTS client_email text`);
      await ensureTable('qr+template_slug', sql`ALTER TABLE questionnaire_responses ADD COLUMN IF NOT EXISTS template_slug text`);
      await ensureTable('qr+token', sql`ALTER TABLE questionnaire_responses ADD COLUMN IF NOT EXISTS token text`);
      await ensureTable('qr+client_id', sql`ALTER TABLE questionnaire_responses ADD COLUMN IF NOT EXISTS client_id text`);
      await ensureTable('qr+submitted_at', sql`ALTER TABLE questionnaire_responses ADD COLUMN IF NOT EXISTS submitted_at timestamptz DEFAULT now()`);
      // Seed a starter questionnaire so the template dropdown isn't empty on a fresh studio
      // (Create Link is disabled without a template). Idempotent: only when zero surveys exist.
      try {
        const sc = await db.execute(sql`SELECT COUNT(*)::int AS n FROM surveys`);
        const n = (sc.rows?.[0] as any)?.n ?? 0;
        if (!n) {
          const starterPages = JSON.stringify([{ id: 'page-1', title: 'About your shoot', questions: [
            { id: 'q1', type: 'text', title: 'What are you looking to capture?', required: true },
            { id: 'q2', type: 'text', title: 'Preferred dates / timeframe', required: false },
            { id: 'q3', type: 'text', title: 'Anything else we should know?', required: false },
          ] }]);
          await db.execute(sql`INSERT INTO surveys (title, description, status, pages, settings)
            VALUES ('Client Questionnaire', 'A starter questionnaire — edit the questions to suit your studio.', 'active', ${starterPages}::jsonb, '{}'::jsonb)`);
          console.log('✅ Seeded starter questionnaire');
        }
      } catch (e: any) { console.warn('⚠️ questionnaire seed skipped:', e?.message || e); }

      // Price List Wizard — competitor price research. These four tables had NO migration
      // in the repo (007-price-wizard-schema.sql is referenced but missing), so "New Price
      // Research" 500'd with 'relation "price_wizard_sessions" does not exist' on every
      // fresh instance. Reconstructed from the columns the routes/service actually use.
      // No FKs (defensive — an insert can't fail on a missing parent row on a partial DB).
      await ensureTable('price_wizard_sessions', sql`CREATE TABLE IF NOT EXISTS price_wizard_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text, location text, services text[] DEFAULT '{}', status text DEFAULT 'discovering',
        competitors_found integer DEFAULT 0, prices_extracted integer DEFAULT 0, suggestions_generated integer DEFAULT 0,
        created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
      )`);
      await ensureTable('competitor_research', sql`CREATE TABLE IF NOT EXISTS competitor_research (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id uuid, competitor_name text, website_url text, location text,
        status text DEFAULT 'pending', discovery_source varchar(100),
        scraped_at timestamptz, scrape_error text,
        created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
      )`);
      await ensureTable('competitor_prices', sql`CREATE TABLE IF NOT EXISTS competitor_prices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        competitor_id uuid, service_type text, package_name text, price_amount numeric,
        currency text DEFAULT 'EUR', confidence_score numeric, url_source text, deliverables text,
        created_at timestamptz DEFAULT now()
      )`);
      await ensureTable('price_list_suggestions', sql`CREATE TABLE IF NOT EXISTS price_list_suggestions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id uuid, service_type text, tier text, suggested_price numeric,
        market_min numeric, market_median numeric, market_max numeric,
        reasoning text, status text DEFAULT 'pending_review', created_at timestamptz DEFAULT now()
      )`);
      // Back-fill discovery_source on any pre-existing competitor_research table (a known
      // drift — see fix-price-wizard-schema.ts).
      await ensureTable('cr+discovery_source', sql`ALTER TABLE competitor_research ADD COLUMN IF NOT EXISTS discovery_source varchar(100)`);

      // ── Fresh-instance table audit (2026-08): these features query raw-SQL tables that had
      // NO migration anywhere in the repo and were never created at boot — they only existed
      // on the New Age DB (made by hand), so they 500 on a fresh studio. Reconstructed from
      // the exact columns each route uses. No FKs (defensive). ──
      // Gallery shop (server/routes/gallery-shop.ts) + Prodigi print (server/routes/prodigi.ts).
      // print_products is shared by both — columns unioned across the two.
      // Contracts. A template is prose with [Merge Fields]; a contract is a SNAPSHOT of
      // that template with the fields already filled, taken when it is sent — editing a
      // template later must not change what somebody already signed.
      await ensureTable('contract_templates', sql`CREATE TABLE IF NOT EXISTS contract_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL, category text DEFAULT 'general',
        body text NOT NULL, is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
      )`);
      await ensureTable('contracts', sql`CREATE TABLE IF NOT EXISTS contracts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id uuid, client_id uuid,
        title text NOT NULL, body text NOT NULL, merge_values jsonb,
        status text NOT NULL DEFAULT 'draft',
        access_token text UNIQUE,
        sent_at timestamptz, viewed_at timestamptz, signed_at timestamptz,
        expires_at timestamptz,
        created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
      )`);
      await ensureTable('contract_signers', sql`CREATE TABLE IF NOT EXISTS contract_signers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
        name text NOT NULL, email text NOT NULL, role text NOT NULL DEFAULT 'client',
        signed_at timestamptz, signature text, signed_ip text, signed_user_agent text,
        sort_order integer DEFAULT 0, created_at timestamptz DEFAULT now()
      )`);
      await ensureTable('print_products', sql`CREATE TABLE IF NOT EXISTS print_products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        studio_id uuid, sku text, name text, description text, category text,
        base_price numeric, currency text, unit text,
        width_inches numeric, height_inches numeric,
        attributes jsonb, variant_json jsonb,
        sort_order integer, is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now()
      )`);
      // A SKU identifies one Prodigi product, so it must be unique — the pricing-sheet
      // importer upserts ON CONFLICT (sku) so re-importing an updated sheet refreshes
      // prices instead of duplicating the whole catalogue. Without the index that
      // statement does not merely fail to dedupe, it throws outright.
      //
      // Guarded: if a table already holds duplicate SKUs the index cannot be created,
      // and that must not stop the server booting.
      try {
        await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS print_products_sku_key ON print_products (sku)`);
      } catch (e: any) {
        console.warn('⚠️ print_products.sku is not unique (duplicates present?) — catalogue import will insert rather than upsert:', e?.message);
      }
      await ensureTable('gallery_orders', sql`CREATE TABLE IF NOT EXISTS gallery_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        studio_id uuid, gallery_id uuid, client_id uuid,
        status text, total numeric, currency text,
        created_at timestamptz DEFAULT now()
      )`);
      await ensureTable('gallery_order_items', sql`CREATE TABLE IF NOT EXISTS gallery_order_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id uuid, product_id uuid, variant jsonb,
        qty integer, unit_price numeric, line_total numeric,
        created_at timestamptz DEFAULT now()
      )`);
      await ensureTable('print_orders', sql`CREATE TABLE IF NOT EXISTS print_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        gallery_id uuid, gallery_image_id uuid, merchant_reference text, status text,
        customer_name text, customer_email text, customer_phone text,
        shipping_line1 text, shipping_line2 text, shipping_city text, shipping_state text,
        shipping_postal_code text, shipping_country_code text,
        sku text, copies integer, sizing text, attributes jsonb, image_url text, shipping_method text,
        prodigi_order_id text, prodigi_response jsonb,
        item_cost numeric, shipping_cost numeric, total_cost numeric,
        tracking_url text, tracking_number text, carrier text,
        shipped_at timestamptz, completed_at timestamptz,
        created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
      )`);
      // Workflow Wizard (server/routes/workflow-wizard.ts). NOTE: workflow_templates + workflow_steps
      // are never inserted by the router — the feature stays empty until templates/steps are seeded
      // by another path. Creating the tables just stops the 500s; content is a separate task.
      await ensureTable('workflow_templates', sql`CREATE TABLE IF NOT EXISTS workflow_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text, category text, is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now()
      )`);
      await ensureTable('workflow_instances', sql`CREATE TABLE IF NOT EXISTS workflow_instances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id uuid, name text, description text, trigger_type text,
        trigger_conditions jsonb DEFAULT '{}'::jsonb, target_audience jsonb DEFAULT '{}'::jsonb,
        status text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
        completed_at timestamptz
      )`);
      await ensureTable('workflow_executions', sql`CREATE TABLE IF NOT EXISTS workflow_executions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id uuid, client_id uuid, status text, context jsonb DEFAULT '{}'::jsonb,
        completed_at timestamptz, created_at timestamptz DEFAULT now()
      )`);
      await ensureTable('workflow_steps', sql`CREATE TABLE IF NOT EXISTS workflow_steps (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id uuid, step_order integer, step_name text, step_type text,
        delay_amount numeric, delay_unit text, config jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now()
      )`);
      await ensureTable('workflow_step_executions', sql`CREATE TABLE IF NOT EXISTS workflow_step_executions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        execution_id uuid, step_id uuid, status text,
        created_at timestamptz DEFAULT now()
      )`);
      await ensureTable('workflow_analytics', sql`CREATE TABLE IF NOT EXISTS workflow_analytics (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id uuid, metric_name text, metric_value numeric,
        recorded_at timestamptz DEFAULT now(), created_at timestamptz DEFAULT now()
      )`);

      // Seed a single studio_configs row if none exists, so the Studio
      // Customization page (GET/PUT /api/studio/branding) and the singleton
      // LIMIT-1 reads elsewhere always have a row to read/update. Use the
      // canonical STUDIO_ID as the row id so manual_page_content rows (logo /
      // contact) — which are keyed on that same studioId and carry an FK to
      // studio_configs.id — can be written on a fresh instance.
      try {
        const scCheck = await db.execute(sql`SELECT id FROM studio_configs LIMIT 1`);
        if (!scCheck.rows?.length) {
          const canonicalStudioId = process.env.STUDIO_ID || '550e8400-e29b-41d4-a716-446655440000';
          await db.execute(sql`INSERT INTO studio_configs (id, studio_name, owner_email) VALUES (${canonicalStudioId}::uuid, 'My Studio', 'admin@localhost')`);
          console.log('✅ Seeded studio_configs singleton row');
        }
      } catch (seedError: any) {
        console.warn('⚠️ studio_configs seed skipped:', seedError.message);
      }

      // Starter Knowledge Base articles, so the customer chat assistant has something to
      // answer from on a fresh install. Genuinely useful — but the content is written in
      // GERMAN and covers Neugeborenen- and Schwangerschaftsshootings, so seeding it into
      // an English-language sports photographer's chatbot is worse than seeding nothing.
      // Only seed when the studio actually publishes in the language the articles are in.
      try {
        const { getSiteLanguage } = await import('./lib/site-language');
        const lang = await getSiteLanguage().catch(() => 'en');
        if (String(lang).slice(0, 2).toLowerCase() === 'de') {
          const { seedKnowledgeBase } = await import('./seed-knowledge-base');
          await seedKnowledgeBase();
        } else {
          console.log('[seed] Knowledge Base skipped — starter articles are German, studio language is ' + lang);
        }
      } catch (kbSeedError: any) {
        console.warn('⚠️ Knowledge Base seed skipped:', kbSeedError.message);
      }

      // The three case studies are the ORIGIN STUDIO'S OWN PORTFOLIO — German articles
      // about specific pregnancy, family and business-portrait shoots in Vienna
      // (fallstudie-schwangerschaftsshooting-wien and siblings). They are not starter
      // content, and they were re-seeded on EVERY BOOT into every tenant, so a UK sports
      // photographer's Blog list refilled with them after each restart no matter how
      // often they were deleted. That is why de-branding kept coming undone.
      //
      // Opt-in now. The Vienna deployment sets SEED_ORIGIN_CASE_STUDIES=true and keeps
      // its own work; nobody else inherits it.
      if (process.env.SEED_ORIGIN_CASE_STUDIES === 'true') {
        try {
          const { seedCaseStudies } = await import('./seed-case-studies');
          await seedCaseStudies();
        } catch (csSeedError: any) {
          console.warn('⚠️ Case-study seed skipped:', csSeedError.message);
        }
      }

      // Ensure the editable newsletter €50-voucher automation exists so signups
      // receive the real voucher (not the old generic "thanks" email).
      try {
        const { ensureNewsletterVoucherAutomation } = await import('./routes');
        await ensureNewsletterVoucherAutomation();
      } catch (nlSeedError: any) {
        console.warn('⚠️ Newsletter voucher automation seed skipped:', nlSeedError.message);
      }

      // Auto-detect: if existing instance already has key infra, mark setup complete
      // Uses raw SQL to avoid Drizzle column-mapping failures if columns don't exist yet
      try {
        // "Has this instance already been set up?" is NOT "does an admin row exist".
        //
        // The seeder created one before the buyer had typed anything, so this was true
        // on a brand-new instance — and marking onboarding complete puts every
        // POST /api/setup behind authenticateUser (server/routes.ts:2083). A studio
        // provisioned this morning could not complete the setup they had just bought,
        // and the login page helpfully pre-filled an email they had no password for.
        //
        // A studio that has told us its own name has genuinely been through Basics.
        // That is a fact about the STUDIO rather than about the auth table.
        // A NAME THE STUDIO CHOSE, not one we wrote in for them.
        //
        // The reasoning above is right and the input was wrong. scripts/init-database.ts
        // seeded businessName and studioName as "Photography Studio" when provisioning a new
        // instance, so this detector saw a name, concluded Basics had been completed, and
        // marked creative_setup_complete on a tenant nobody had opened. The /api/setup mount
        // then required authentication — which does not exist yet, because the admin account
        // is created several steps into the wizard that could no longer save anything.
        //
        // The seed is fixed, but instances provisioned before that fix already carry the row,
        // and they would be stuck forever. Excluding the placeholder by name heals them on
        // the next boot and costs a real studio nothing: "Photography Studio" is what the
        // provisioner wrote, and any studio who genuinely types it can type it again in
        // Basics, which is the step this is deciding whether to skip.
        const adminCheck = await db.execute(sql`
          SELECT EXISTS(
            SELECT 1 FROM studio_configs
             WHERE coalesce(nullif(trim(business_name), ''), nullif(trim(studio_name), '')) IS NOT NULL
               AND lower(coalesce(nullif(trim(business_name), ''), nullif(trim(studio_name), ''))) NOT IN
                   ('photography studio', 'my studio')
          ) AS has_admin`);
        const hasName = !!(adminCheck.rows?.[0] as any)?.has_admin;

        // A NAME IS NOT A FINISHED SETUP.
        //
        // This flipped creative_setup_complete the moment studio_configs held a name — and a
        // studio types their name at step 2 of 5. So a real onboarding, half done, was
        // declared finished on the next boot, and the /api/setup mount then required
        // authentication for the three steps still to come. Observed live: "Damion Mower
        // Photography" saved at Basics, redeploy, and every subsequent save returned 401 with
        // the wizard sitting on step 1.
        //
        // What this check is FOR is recognising an instance that predates the wizard entirely,
        // so its owner is not marched back through onboarding they never needed. Such an
        // instance has a business: an admin account AND real records. A wizard in progress has
        // a name and nothing else, which is exactly how the two tell apart.
        //
        // Each count is its own statement and its own catch: these tables are created at
        // different times, and a missing one must read as "no data" rather than abandoning the
        // whole check and leaving a legitimate old instance stuck in onboarding.
        const countOf = async (table: string): Promise<number> => {
          try {
            const r = await db.execute(sql.raw(`SELECT count(*)::int AS n FROM ${table}`));
            return Number((r.rows?.[0] as any)?.n ?? 0);
          } catch {
            return 0;
          }
        };

        const admins = await countOf('admin_users');
        const records =
          (await countOf('crm_clients'))
          + (await countOf('galleries'))
          + (await countOf('crm_invoices'));

        // All three, deliberately. Any two of them describe a wizard partway through.
        if (hasName && admins > 0 && records > 0) {
          // Use raw SQL to update — more reliable than Drizzle if schema is out of sync
          await db.execute(sql`
            UPDATE studio_configs 
            SET technical_setup_complete = true, creative_setup_complete = true
            WHERE id = (SELECT id FROM studio_configs LIMIT 1)
          `);
          console.log('✅ Existing instance detected (the studio has a name) — auto-marked onboarding complete');
        } else {
          // UNSTICK AN INSTANCE THAT WAS MARKED COMPLETE ON A NAME IT NEVER CHOSE.
          //
          // Excluding the placeholder above stops this happening again, and does nothing for
          // the tenants it already happened to: this branch only ever WROTE true, so a row
          // that already says true stays true and the wizard stays locked out for good.
          //
          // Clearing it needs a second fact, because a studio could legitimately be called
          // Photography Studio. No admin user is that fact: the account step is inside the
          // wizard, so an instance with no admin has certainly not completed it, whatever the
          // flag says. Both conditions together describe exactly one situation — provisioned,
          // never opened, wrongly flagged.
          try {
            // Reuses the count taken above rather than asking again.
            if (admins === 0) {
              const { rowCount } = await db.execute(sql`
                UPDATE studio_configs
                   SET creative_setup_complete = false, technical_setup_complete = false
                 WHERE creative_setup_complete = true
              `) as any;
              if (rowCount) {
                console.log(
                  '🔓 Onboarding was marked complete on a placeholder name with no admin account — '
                  + 'reopening setup. This instance was provisioned and never opened.'
                );
              }
            }
          } catch (healErr: any) {
            console.warn('⚠️ Could not check for a stuck onboarding flag:', healErr?.message || healErr);
          }
        }
      } catch (autoDetectError: any) {
        console.warn('⚠️ Onboarding auto-detect skipped:', autoDetectError.message);
      }
    } catch (error) {
      console.warn('⚠️ Database connection issue:', error.message);
    }
    
    // Register routes immediately to restore client database access
    console.log('🔄 Registering routes immediately...');
    try {
      await registerRoutes(app);
      console.log('✅ Routes registered successfully - Client database should now be accessible');
    } catch (routeError) {
      console.error('❌ Failed to register routes:', routeError.message);
      console.error('Route registration stack:', routeError.stack);
      // Continue without routes - at least serve health endpoints
    }
    
    // Manual Google Calendar sync endpoint (per-user) - does FULL import of all events
    // MUST be registered BEFORE serveStatic to avoid catch-all interference
    // Supports both session auth (requireAuth) and JWT Bearer tokens
    const manualSyncAuth = async (req: any, res: any, next: any) => {
      // Check session first
      if (req.session && req.session.userId) {
        return requireAuth(req, res, next);
      }
      // Fall back to JWT Bearer token
      const authHeader = req.headers['authorization'] as string;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const jwt = await import('jsonwebtoken');
          const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'default-secret';
          const decoded = jwt.default.verify(authHeader.substring(7), secret) as any;
          if (decoded && decoded.userId) {
            req.user = { id: decoded.userId, role: decoded.role || 'admin' };
            return next();
          }
        } catch (jwtErr) {
          console.warn('[manual-sync] JWT verification failed:', (jwtErr as any)?.message);
        }
      }
      return res.status(401).json({ success: false, error: 'Authentication required' });
    };

    app.post('/api/calendar/manual-sync', manualSyncAuth, async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });
        
        // Use full import function to get ALL events (past and future)
        const results = await importGoogleCalendarEvents(undefined, userId);

        // Also run scheduler recovery sweep to sync any failed bookings
        try {
          const recovery = await retryFailedSchedulerSyncs();
          if (recovery.retried > 0) {
            console.log(`[Manual Sync] Scheduler recovery: ${recovery.succeeded}/${recovery.retried} bookings synced to Google Calendar`);
          }
        } catch (recoveryErr: any) {
          console.warn('[Manual Sync] Scheduler recovery sweep failed:', recoveryErr.message);
        }

        res.json({ success: true, ...results });
      } catch (e: any) {
        const msg = e?.message || 'Manual sync failed';
        console.error('Manual sync error:', msg);
        // Detect invalid_grant = tokens expired, user must re-authorize
        if (msg.includes('invalid_grant')) {
          return res.status(401).json({
            success: false,
            tokenExpired: true,
            error: 'Google Calendar authorization has expired. Please disconnect and reconnect your Google Calendar in the Calendar Sync settings.',
            errors: [msg]
          });
        }
        res.status(500).json({ success: false, errors: [msg] });
      }
    });

    // Status endpoint for diagnostics
    app.get('/api/status', (_req, res) => {
      res.json({ 
        status: 'ready',
        uptime: process.uptime(),
        message: 'Client database is accessible'
      });
    });
    
    // SEO 301 redirects for pruned thin blog posts — MUST run before serveStatic's
    // SPA catch-all so /blog/<slug> redirects instead of serving the app shell.
    app.use(seoRedirects);

    // MIGRATION REDIRECTS — the studio's OLD site, after they point their domain here.
    //
    // Must run before serveStatic for the same reason as the line above, but the stakes are
    // higher: without this an orphaned URL falls through to the SPA catch-all, which answers
    // HTTP 200 with the prerendered homepage. Eighty dead pages then read to Google as
    // eighty copies of one page rather than eighty pages that have gone — duplication at a
    // scale that can suppress the whole domain.
    //
    // Only APPROVED rows are served. A saved plan changes nothing a visitor sees until a
    // human has looked at it.
    {
      let cache: Map<string, { to: string; status: number }> | null = null;
      let cachedAt = 0;
      app.use(async (req, res, next) => {
        // Never intercept the API or an asset — a redirect over /api would break the app.
        const p = (req.path || '').toLowerCase();
        if (req.method !== 'GET' || p.startsWith('/api/') || p.includes('.')) return next();
        try {
          if (!cache || Date.now() - cachedAt > 60_000) {
            const { activeRedirects } = await import('./lib/migrationPlan');
            cache = await activeRedirects();
            cachedAt = Date.now();
          }
          const key = p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
          const hit = cache.get(key);
          // A redirect onto the same path is a loop served to a crawler.
          if (hit && hit.to !== key) return res.redirect(hit.status || 301, hit.to);
        } catch { /* a redirect lookup that fails must not take the page down */ }
        next();
      });
    }

    // Keep the admin app out of search results. robots.txt disallows /admin/
    // but doesn't DEindex already-crawled URLs; X-Robots-Tag does. The SPA
    // catch-all serves index.html (title = homepage) for /admin, which the SEO
    // audit flagged as an indexed duplicate-title page.
    //
    // Same treatment for transactional / account / demo routes: they are
    // client-only, so a crawler receives the empty SPA shell (homepage title,
    // ~0 words) which reads as a thin, duplicate-title indexable page. These
    // have no business in search results, so send X-Robots-Tag: noindex. (The
    // React noindex prop can't help here — the crawler never runs the JS that
    // would render it.)
    const NOINDEX_EXACT = new Set([
      '/vouchers/success',
      '/voucher/thank-you',
      '/my-subscription',
      '/download-data',
      '/demo-success',
      '/gallery-shop-test',
      '/image-test',
      '/test-hero',
      '/storage-demo',
      '/storage-demo-index',
      '/survey-demo',
    ]);
    const noindexPath = (p: string): boolean => {
      const clean = (p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p);
      if (clean === '/admin' || clean.startsWith('/admin/')) return true;
      if (NOINDEX_EXACT.has(clean)) return true;
      // The private client-gallery area (login-gated) and per-token views must
      // not be indexed. /gallery renders behind auth — a crawler only ever gets
      // the empty shell, so keep it out of search.
      if (clean === '/gallery' || clean.startsWith('/gallery/') || clean.startsWith('/invoice/')) return true;
      // A contract signing page carries the full terms and the names of the parties, and
      // is reachable by token alone. If one of those links ever reaches a crawlable place,
      // the document must not end up in search results.
      if (clean.startsWith('/contract/')) return true;
      return false;
    };
    app.use((req, res, next) => {
      const path = (req.originalUrl || req.path).split('?')[0];
      if (noindexPath(path)) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      }
      next();
    });

    // Setup Vite BEFORE starting the server
    console.log('🔧 Setting up Vite frontend...');
    let viteReady = false;
    if (process.env.NODE_ENV === "production" && process.env.PORT) {
      console.log('📦 Production mode - serving static files from dist');
      try {
        serveStatic(app);
        console.log('✅ Static file serving configured');
        // Load the studio's address before the first request can memoise an HTML shell
        // without one. The shell is version-keyed so it would self-heal on request #2
        // anyway; this just means request #1 is not the one served address-less.
        import('./lib/site-address').then(m => m.warmStudioAddress?.()).catch(() => {});
        // Resolve pillar meta once now, so the first visitor to a pillar page does not
        // pay the cold-start cost and lose the 1.5s meta race. Never blocks boot.
        import('./vite').then(m => m.warmPillarRouteMeta?.()).catch(() => {});
      } catch (e: any) {
        console.error('❌ Failed to setup static serving:', e?.message || e);
      }
    } else {
      // Development mode - setup Vite dev server
      try {
        await setupVite(app, null as any); // Pass null for server, will be set later
        viteReady = true;
        console.log('✅ Vite dev server setup complete');
      } catch (e: any) {
        console.error('❌ Vite setup failed (development). Continuing without Vite:', e?.message || e);
      }
    }

    // Periodic self health-check to diagnose listener drops
    const HEALTHZ_URL = `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}/healthz`;
    const healthzCheck = setInterval(() => {
      try {
        const req = http.get(HEALTHZ_URL, (res) => {
          // Only log failures to keep noise low
          if (res.statusCode && res.statusCode >= 400) {
            console.warn(`[HEALTHZ] Non-200 status: ${res.statusCode}`);
          }
          // Drain response
          res.resume();
        });
        req.setTimeout(2500, () => {
          try { req.destroy(new Error('healthz timeout')); } catch {}
        });
        req.on('error', (err) => {
          console.warn(`[HEALTHZ] Request error: ${err?.message || err}`);
        });
      } catch (e: any) {
        console.warn('[HEALTHZ] Check threw:', e?.message || e);
      }
    }, 10000);

    // Keep reference to prevent GC
    (global as any).__healthzCheck = healthzCheck;

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Enhanced error logging for production debugging
      console.error('Server Error:', {
        status,
        message,
        stack: err.stack,
        url: _req.url,
        method: _req.method,
        timestamp: new Date().toISOString()
      });

      res.status(status).json({ message });
    });

    // Additional runtime info after initial async init completes
  console.log(`✅ New Age Fotografie CRM post-init. Environment: ${process.env.NODE_ENV}`);
  console.log(`Working directory: ${process.cwd()}`);
  console.log(`Demo mode: ${process.env.DEMO_MODE}`);
  console.log(`Database URL configured: ${!!process.env.DATABASE_URL}`);
  
  // Removed signal handlers to diagnose crash - server should stay alive
  console.log('🟢 Server running and ready for connections');

  // Background jobs: the legacy ./jobs bundle (daily email + IMAP) stays off to
  // avoid the old startup issues, but the blog auto-publish scheduler is a
  // focused, self-guarding module — without it, scheduled posts never go live.
  try {
    const { startBlogScheduler } = await import('./jobs/blogScheduler');
    startBlogScheduler();

    // Catches payments Stripe took that the studio never heard about, because the webhook
    // needs STRIPE_WEBHOOK_SECRET and an invoice is otherwise only marked paid when the
    // buyer browser comes back from checkout.
    const { startPaymentReconciler } = await import('./jobs/paymentReconciler');
    startPaymentReconciler();
    console.log('📝 Blog auto-publish scheduler started (hourly + boot catch-up)');
  } catch (err: any) {
    console.warn('⚠️ Failed to start blog auto-publish scheduler:', err?.message || err);
  }

  // Abandoned-checkout reminder scheduler (inert until the abandoned_checkouts
  // table exists — see server/services/abandonedCheckout.ts).
  try {
    const { startAbandonedCheckoutScheduler } = await import('./services/abandonedCheckout');
    startAbandonedCheckoutScheduler();
    console.log('🛒 Abandoned-checkout reminder scheduler started (every 15 min + boot)');
  } catch (err: any) {
    console.warn('⚠️ Failed to start abandoned-checkout scheduler:', err?.message || err);
  }

  // Start background Google Calendar sync scheduler if enabled via env
  try {
    if (process.env.GOOGLE_SYNC_ENABLED === 'true') {
      startSyncScheduler();
      console.log('📅 Google Calendar sync scheduler started');
    } else {
      console.log('📅 Google Calendar sync scheduler is disabled (GOOGLE_SYNC_ENABLED!=true)');
    }
  } catch (err: any) {
    console.warn('⚠️ Failed to start Google sync scheduler:', err?.message || err);
  }
  
  } catch (error: any) {
    console.error('❌ Failed to start server:', error?.message || error);
    console.error('Stack trace:', error?.stack || 'no stack');
    // Do not exit; leave process up so health/debug can be queried
  }
  
  console.log('✅ Async IIFE completed - server should stay alive');
})();

console.log('📍 Module loaded - keepalive will be installed');

// CRITICAL: Keep process alive AND monitor server - prevent tsx from exiting
console.log('🔒 Installing process keepalive with server monitoring...');
const KEEPALIVE_INTERVAL = Number(process.env.KEEPALIVE_INTERVAL_MS || (process.env.NODE_ENV === 'development' ? 30000 : 15000));
let __lastKeepaliveKey: string | null = null;
let __devTick = 0;
const keepalive = setInterval(() => {
  if (!serverInstance) return;
  const addr = serverInstance.address();
  const key = addr ? (typeof addr === 'string' ? addr : `${addr.address}:${addr.port}`) : 'none';
  const verbose = process.env.KEEPALIVE_VERBOSE === 'true';
  const isDev = process.env.NODE_ENV === 'development';
  __devTick++;

  if (key !== __lastKeepaliveKey) {
    if (addr) {
      console.log(`[KEEPALIVE] ✅ Server listening on ${key}`);
    } else {
      console.warn('[KEEPALIVE] ⚠️ Server instance exists but NOT listening!');
    }
    __lastKeepaliveKey = key;
    return;
  }

  if (verbose) {
    if (addr) console.log(`[KEEPALIVE] ✅ Server listening on ${key}`); else console.warn('[KEEPALIVE] ⚠️ Server instance exists but NOT listening!');
    return;
  }

  // In dev, log every ~4 minutes to show liveness without noise
  if (isDev && __devTick % 8 === 0) {
    if (addr) console.log(`[KEEPALIVE] ✅ Server listening on ${key}`); else console.warn('[KEEPALIVE] ⚠️ Server instance exists but NOT listening!');
  }
}, KEEPALIVE_INTERVAL);

// Prevent garbage collection
(global as any).__keepalive = keepalive;

console.log('✅ Keepalive installed - process should never exit');

// Additional process/signal diagnostics to detect shutdown causes
['SIGINT','SIGTERM','SIGHUP','SIGUSR2'].forEach((sig) => {
  try {
    process.on(sig as any, () => {
      console.warn(`[SIGNAL] Received ${sig}. Server listening:`, (global as any).__server?.listening);
    });
  } catch {}
});
process.on('beforeExit', (code) => {
  console.warn('[PROCESS] beforeExit code:', code);
});
process.on('exit', (code) => {
  console.warn('[PROCESS] exit code:', code);
});
process.on('uncaughtExceptionMonitor', (err) => {
  console.warn('[PROCESS] uncaughtExceptionMonitor:', err?.message || err);
});