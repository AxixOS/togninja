"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routes_1 = require("./routes");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Trust proxy for production deployment
app.set('trust proxy', true);
// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});
// Domain redirect middleware - redirect root domain to www
app.use((req, res, next) => {
    if (req.headers.host === 'newagefotografie.com') {
        return res.redirect(301, `https://www.newagefotografie.com${req.url}`);
    }
    next();
});
// API request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        if (req.path.startsWith("/api")) {
            console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
        }
    });
    next();
});
// Serve uploaded files statically
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'public/uploads')));
// Register API routes
(async () => {
    const server = await (0, routes_1.registerRoutes)(app);
    // Error handling middleware
    app.use((err, req, res, next) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        console.error('Server Error:', {
            status,
            message,
            stack: err.stack,
            url: req.url,
            method: req.method,
            timestamp: new Date().toISOString()
        });
        res.status(status).json({ message });
    });
    // Serve static files from dist/public (production build)
    const distPath = path_1.default.join(process.cwd(), 'dist/public');
    const clientPath = path_1.default.join(process.cwd(), 'client');
    if (fs_1.default.existsSync(distPath)) {
        app.use(express_1.default.static(distPath));
        // SPA fallback - serve index.html for all non-API routes
        app.get('*', (req, res) => {
            const indexPath = path_1.default.join(distPath, 'index.html');
            if (fs_1.default.existsSync(indexPath)) {
                res.sendFile(indexPath);
            }
            else {
                res.status(404).send('Frontend not built. Run npm run build first.');
            }
        });
    }
    else {
        // Development fallback - serve from client directory
        app.use(express_1.default.static(path_1.default.join(clientPath, 'public')));
        app.get('*', (req, res) => {
            const indexPath = path_1.default.join(clientPath, 'index.html');
            if (fs_1.default.existsSync(indexPath)) {
                res.sendFile(indexPath);
            }
            else {
                res.status(500).send('Client files not found. Please check your setup.');
            }
        });
    }
    // Normalize and validate PORT coming from the environment.
    // Railway requires PORT to be an integer between 0 and 65535; coerce and
    // fall back to 10000 if it's missing or invalid to avoid deploy failures.
    let port = parseInt(process.env.PORT ?? '', 10);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
        console.warn(`Invalid or missing PORT environment variable (${process.env.PORT}). Falling back to 10000.`);
        port = 10000;
    }
    process.env.PORT = String(port);
    const host = '0.0.0.0';
    server.listen(port, host, () => {
        console.log(`✅ New Age Fotografie CRM production server started on ${host}:${port}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
        console.log(`Working directory: ${process.cwd()}`);
        console.log(`Static files served from: ${fs_1.default.existsSync(distPath) ? distPath : clientPath}`);
    });
})().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
