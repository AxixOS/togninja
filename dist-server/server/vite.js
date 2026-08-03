"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
exports.setupVite = setupVite;
exports.serveStatic = serveStatic;
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const vite_1 = require("vite");
const vite_config_1 = __importDefault(require("../vite.config"));
const nanoid_1 = require("nanoid");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const viteLogger = (0, vite_1.createLogger)();
function log(message, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app, server) {
    const serverOptions = {
        middlewareMode: true,
        hmr: { server },
    };
    const vite = await (0, vite_1.createServer)({
        ...vite_config_1.default,
        configFile: false,
        customLogger: {
            ...viteLogger,
            error: (msg, options) => {
                viteLogger.error(msg, options);
                // Don't crash server on Vite errors - just log them
                // process.exit(1);
            },
        },
        server: serverOptions,
        appType: "custom",
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
        const url = req.originalUrl;
        // Skip API routes - let them be handled by the API router
        if (url.startsWith('/api/')) {
            return next();
        }
        try {
            const clientTemplate = path_1.default.resolve(__dirname, "..", "client", "index.html");
            // always reload the index.html file from disk incase it changes
            let template = await fs_1.default.promises.readFile(clientTemplate, "utf-8");
            template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${(0, nanoid_1.nanoid)()}"`);
            const page = await vite.transformIndexHtml(url, template);
            res.status(200).set({ "Content-Type": "text/html" }).end(page);
        }
        catch (e) {
            vite.ssrFixStacktrace(e);
            next(e);
        }
    });
}
function serveStatic(app) {
    const distPath = path_1.default.resolve(__dirname, "..", "dist");
    if (!fs_1.default.existsSync(distPath)) {
        throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
    }
    // Serve static files from dist
    app.use(express_1.default.static(distPath));
    // Explicitly serve robots.txt and sitemap.xml for SEO
    app.get("/robots.txt", (_req, res) => {
        const robotsPath = path_1.default.resolve(distPath, "robots.txt");
        if (fs_1.default.existsSync(robotsPath)) {
            res.type("text/plain").sendFile(robotsPath);
        }
        else {
            res.status(404).send("robots.txt not found");
        }
    });
    app.get("/sitemap.xml", (_req, res) => {
        const sitemapPath = path_1.default.resolve(distPath, "sitemap.xml");
        if (fs_1.default.existsSync(sitemapPath)) {
            res.type("application/xml").sendFile(sitemapPath);
        }
        else {
            res.status(404).send("sitemap.xml not found");
        }
    });
    // fall through to index.html if the file doesn't exist
    // BUT exclude /api/* routes - those should return 404 JSON, not HTML
    app.use("*", (req, res) => {
        // If it's an API request that wasn't handled, return JSON 404
        if (req.originalUrl.startsWith('/api/')) {
            return res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
        }
        // For all other requests (frontend routes), serve the SPA
        res.sendFile(path_1.default.resolve(distPath, "index.html"));
    });
}
