"use strict";
// Console silencing temporarily disabled for debugging
// import '../silence-console.js';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const node_http_1 = __importDefault(require("node:http"));
// Import routes and jobs directly to fix client database access
const routes_1 = require("./routes");
require("./jobs");
const vite_1 = require("./vite");
// Mount lightweight auth routes immediately (full routes registered later lazily)
const auth_1 = __importDefault(require("./routes/auth"));
// Google Calendar 2-way sync: OAuth routes and scheduler
const googleAuth_1 = __importDefault(require("./routes/googleAuth"));
const syncScheduler_1 = require("./services/syncScheduler");
const calendarService_1 = require("./services/calendarService");
const schedulerGoogleCalendar_1 = require("./services/schedulerGoogleCalendar");
// Agent V2: Modern ToolBus architecture
const agent_v2_1 = __importDefault(require("./routes/agent-v2"));
const agent_shadow_1 = __importDefault(require("./routes/agent-shadow"));
// Manual Pages: Squarespace-style CMS for public pages
const manual_pages_1 = __importDefault(require("./routes/manual-pages"));
// Import and configure session middleware
const auth_2 = require("./auth");
// Import email service for initialization
const enhancedEmailService_1 = require("./services/enhancedEmailService");
const smsService_1 = require("./services/smsService");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("./db");
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
const app = (0, express_1.default)();
// MODULE-LEVEL server reference to prevent garbage collection
let serverInstance = null;
// Behind reverse proxies (Heroku/Render/etc.) trust the first proxy so secure cookies work when appropriate
app.set('trust proxy', 1);
// Increase body size limits to accommodate large image payloads (base64 encoded images can be 10MB+)
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: false, limit: '50mb' }));
// Add CORS headers for API requests
app.use((req, res, next) => {
    // Echo back the request origin to support credentials; default to * if none
    const origin = req.headers.origin || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    }
    else {
        next();
    }
});
// Health & ping endpoints before anything else for diagnostics
app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok-preinit', uptime: process.uptime(), bootMs: Date.now() - BOOT_MARK });
});
// Session middleware must be before auth routes (still early but after healthz)
app.use(auth_2.sessionConfig);
// Early auth routes so backend login functions even before lazy route load
app.use('/api/auth', auth_1.default);
app.use('/api/auth/*', (req, _res, next) => { console.log('[AUTH-EARLY]', req.method, req.originalUrl); next(); });
// Google Calendar OAuth routes
app.use('/api/auth', googleAuth_1.default);
// Agent V2 routes (ToolBus architecture)
app.use('/api/agent/v2', agent_v2_1.default);
console.log('[AGENT-V2] Routes registered at /api/agent/v2');
// Manual Pages CMS routes
app.use('/api/manual-pages', manual_pages_1.default);
console.log('[MANUAL-PAGES] Routes registered at /api/manual-pages');
// Shadow mode routes (V1 vs V2 comparison)
if (process.env.AGENT_V2_SHADOW === 'true') {
    app.use('/api/agent/shadow', agent_shadow_1.default);
    console.log('[SHADOW MODE] Routes registered at /api/agent/shadow');
    console.log('[SHADOW MODE] V1 and V2 will run in parallel for comparison');
}
// Serve uploaded files statically
app.use('/uploads', express_1.default.static('public/uploads'));
// Serve blog images statically (before Vite middleware)
app.use('/blog-images', express_1.default.static('server/public/blog-images', {
    setHeaders: (res, path) => {
        if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        }
        else if (path.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        }
    }
}));
// Domain redirect middleware - redirect root domain to www
app.use((req, res, next) => {
    if (req.headers.host === 'newagefotografie.com') {
        return res.redirect(301, `https://www.newagefotografie.com${req.url}`);
    }
    next();
});
app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse = undefined;
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
            (0, vite_1.log)(logLine);
        }
    });
    next();
});
(async () => {
    try {
        // Note: global error handlers already set above and do NOT exit the process
        console.log('🚀 Starting New Age Fotografie CRM server...');
        // Initialize services with error handling
        try {
            await enhancedEmailService_1.EnhancedEmailService.initialize();
            console.log('✅ Email service initialized');
        }
        catch (error) {
            console.warn('⚠️ Email service initialization failed:', error.message);
        }
        try {
            await smsService_1.SMSService.initialize();
            console.log('✅ SMS service initialized');
        }
        catch (error) {
            console.warn('⚠️ SMS service initialization failed:', error.message);
        }
        // Skip complex database migrations for now to avoid startup issues
        try {
            // Quick database test
            await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT 1 as test`);
            console.log('✅ Database connection verified');
            // Run gallery images migration to add size tracking
            try {
                await db_1.db.execute((0, drizzle_orm_1.sql) `ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS size_bytes INTEGER DEFAULT 0`);
                await db_1.db.execute((0, drizzle_orm_1.sql) `ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS content_type TEXT`);
                console.log('✅ Gallery images size tracking migration completed');
            }
            catch (migrationError) {
                console.warn('⚠️ Gallery migration already applied or failed:', migrationError.message);
            }
        }
        catch (error) {
            console.warn('⚠️ Database connection issue:', error.message);
        }
        // Register routes immediately to restore client database access
        console.log('🔄 Registering routes immediately...');
        try {
            await (0, routes_1.registerRoutes)(app);
            console.log('✅ Routes registered successfully - Client database should now be accessible');
        }
        catch (routeError) {
            console.error('❌ Failed to register routes:', routeError.message);
            console.error('Route registration stack:', routeError.stack);
            // Continue without routes - at least serve health endpoints
        }
        // Manual Google Calendar sync endpoint (per-user) - does FULL import of all events
        // MUST be registered BEFORE serveStatic to avoid catch-all interference
        app.post('/api/calendar/manual-sync', auth_2.requireAuth, async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId)
                    return res.status(401).json({ error: 'Not authenticated' });
                // Use full import function to get ALL events (past and future)
                const results = await (0, calendarService_1.importGoogleCalendarEvents)(undefined, userId);
                // Also run scheduler recovery sweep to sync any failed bookings
                try {
                    const recovery = await (0, schedulerGoogleCalendar_1.retryFailedSchedulerSyncs)();
                    if (recovery.retried > 0) {
                        console.log(`[Manual Sync] Scheduler recovery: ${recovery.succeeded}/${recovery.retried} bookings synced to Google Calendar`);
                    }
                } catch (recoveryErr) {
                    console.warn('[Manual Sync] Scheduler recovery sweep failed:', recoveryErr?.message);
                }
                res.json({ success: true, ...results });
            }
            catch (e) {
                console.error('Manual sync error:', e?.message || e);
                res.status(500).json({ success: false, errors: [e?.message || 'Manual sync failed'] });
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
        // Setup Vite BEFORE starting the server
        console.log('🔧 Setting up Vite frontend...');
        let viteReady = false;
        if (process.env.NODE_ENV === "production" && process.env.PORT) {
            console.log('📦 Production mode - serving static files from dist');
            try {
                (0, vite_1.serveStatic)(app);
                console.log('✅ Static file serving configured');
            }
            catch (e) {
                console.error('❌ Failed to setup static serving:', e?.message || e);
            }
        }
        else {
            // Development mode - setup Vite dev server
            try {
                await (0, vite_1.setupVite)(app, null); // Pass null for server, will be set later
                viteReady = true;
                console.log('✅ Vite dev server setup complete');
            }
            catch (e) {
                console.error('❌ Vite setup failed (development). Continuing without Vite:', e?.message || e);
            }
        }
        // Start listening ASAP - SYNCHRONOUS direct call
        const port = parseInt(process.env.PORT || '3001', 10);
        const host = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
        console.log(`🎯 Creating HTTP server on ${host}:${port}...`);
        // Direct synchronous listen - no await, no promises
        serverInstance = app.listen(port, host);
        // Event handlers
        const attachServerHandlers = (srv, { reason }) => {
            srv.on('listening', () => {
                const addr = srv.address();
                console.log(`✅ HTTP server LISTENING on ${host}:${port} (${reason})`);
                console.log(`🔍 Server address:`, addr);
                console.log(`🔍 Server listening:`, srv.listening);
            });
            srv.on('error', (err) => {
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
                }
                catch { }
                const allowRebind = (process.env.RETRY_LISTEN_ON_CLOSE ?? (process.env.NODE_ENV !== 'production' ? 'true' : 'false')) === 'true';
                global.__rebindAttempted = global.__rebindAttempted ?? false;
                if (allowRebind && !global.__rebindAttempted) {
                    global.__rebindAttempted = true;
                    console.warn('🛠️ Attempting one-shot rebind after close (dev safeguard)...');
                    setTimeout(() => {
                        try {
                            const newSrv = app.listen(port, host);
                            serverInstance = newSrv;
                            global.__server = newSrv;
                            attachServerHandlers(newSrv, { reason: 'rebind' });
                        }
                        catch (e) {
                            console.error('❌ Rebind attempt failed:', e?.message || e);
                        }
                    }, 500);
                }
            });
        };
        attachServerHandlers(serverInstance, { reason: 'initial' });
        // Also keep in global for extra safety
        global.__server = serverInstance;
        const server = serverInstance; // For compatibility with code below
        console.log(`🔧 Server object created, waiting for 'listening' event...`);
        // Periodic self health-check to diagnose listener drops
        const HEALTHZ_URL = `http://${host}:${port}/healthz`;
        const healthzCheck = setInterval(() => {
            try {
                const req = node_http_1.default.get(HEALTHZ_URL, (res) => {
                    // Only log failures to keep noise low
                    if (res.statusCode && res.statusCode >= 400) {
                        console.warn(`[HEALTHZ] Non-200 status: ${res.statusCode}`);
                    }
                    // Drain response
                    res.resume();
                });
                req.setTimeout(2500, () => {
                    try {
                        req.destroy(new Error('healthz timeout'));
                    }
                    catch { }
                });
                req.on('error', (err) => {
                    console.warn(`[HEALTHZ] Request error: ${err?.message || err}`);
                });
            }
            catch (e) {
                console.warn('[HEALTHZ] Check threw:', e?.message || e);
            }
        }, 10000);
        // Keep reference to prevent GC
        global.__healthzCheck = healthzCheck;
        app.use((err, _req, res, _next) => {
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
        // Start background Google Calendar sync scheduler if enabled via env
        try {
            if (process.env.GOOGLE_SYNC_ENABLED === 'true') {
                (0, syncScheduler_1.startSyncScheduler)();
                console.log('📅 Google Calendar sync scheduler started');
            }
            else {
                console.log('📅 Google Calendar sync scheduler is disabled (GOOGLE_SYNC_ENABLED!=true)');
            }
        }
        catch (err) {
            console.warn('⚠️ Failed to start Google sync scheduler:', err?.message || err);
        }
    }
    catch (error) {
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
let __lastKeepaliveKey = null;
let __devTick = 0;
const keepalive = setInterval(() => {
    if (!serverInstance)
        return;
    const addr = serverInstance.address();
    const key = addr ? (typeof addr === 'string' ? addr : `${addr.address}:${addr.port}`) : 'none';
    const verbose = process.env.KEEPALIVE_VERBOSE === 'true';
    const isDev = process.env.NODE_ENV === 'development';
    __devTick++;
    if (key !== __lastKeepaliveKey) {
        if (addr) {
            console.log(`[KEEPALIVE] ✅ Server listening on ${key}`);
        }
        else {
            console.warn('[KEEPALIVE] ⚠️ Server instance exists but NOT listening!');
        }
        __lastKeepaliveKey = key;
        return;
    }
    if (verbose) {
        if (addr)
            console.log(`[KEEPALIVE] ✅ Server listening on ${key}`);
        else
            console.warn('[KEEPALIVE] ⚠️ Server instance exists but NOT listening!');
        return;
    }
    // In dev, log every ~4 minutes to show liveness without noise
    if (isDev && __devTick % 8 === 0) {
        if (addr)
            console.log(`[KEEPALIVE] ✅ Server listening on ${key}`);
        else
            console.warn('[KEEPALIVE] ⚠️ Server instance exists but NOT listening!');
    }
}, KEEPALIVE_INTERVAL);
// Prevent garbage collection
global.__keepalive = keepalive;
console.log('✅ Keepalive installed - process should never exit');
// Additional process/signal diagnostics to detect shutdown causes
['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGUSR2'].forEach((sig) => {
    try {
        process.on(sig, () => {
            console.warn(`[SIGNAL] Received ${sig}. Server listening:`, global.__server?.listening);
        });
    }
    catch { }
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
