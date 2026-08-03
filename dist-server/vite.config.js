"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const rollup_plugin_1 = __importDefault(require("@prerenderer/rollup-plugin"));
const __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
// Public routes to prerender for SEO
const publicRoutes = [
    '/',
    '/fotoshootings',
    '/kontakt',
    '/blog',
    '/warteliste',
    '/vouchers',
    '/gutscheine',
    // SEO Cornerstone Pages
    '/familienfotos-wien/',
    '/neugeborenenfotos-wien/',
    '/babyfotos-wien/',
    '/schwangerschaftsfotos-wien/',
    '/business-portrait-wien/',
    '/teamfotos-wien/',
    '/bewerbungsfotos-wien/',
    '/eventfotografie-wien/',
    '/hochzeitsfotografie-wien/',
    '/produkt-fotografie-wien/',
    '/immobilien-fotografie-wien/',
    '/studio-fotografie-wien/',
    '/familien-fotoshooting-wien/',
    '/baby-fotografie-wien/',
    // SEO Pillar Pages
    '/kinder-fotografie-wien/',
    '/portrait-fotografie-wien/',
    // Support Pages
    '/ueber-uns/',
    '/preise/',
    '/faq/',
    '/kundenstimmen/',
    '/impressum/',
    '/agb/',
    '/datenschutz/',
    // Fotoshooting Types
    '/fotoshootings/business',
    '/fotoshootings/event',
    '/fotoshootings/wedding',
    // Gutschein Pages
    '/gutschein',
    '/gutschein/family',
    '/gutschein/newborn',
    '/gutschein/maternity',
];
// FORCE CLEAN BUILD v5 - SEO Prerendering - 20260204
exports.default = (0, vite_1.defineConfig)({
    plugins: [
        (0, plugin_react_1.default)(),
        (0, rollup_plugin_1.default)({
            routes: publicRoutes,
            renderer: '@prerenderer/renderer-puppeteer',
            rendererOptions: {
                maxConcurrentRoutes: 4,
                renderAfterTime: 500,
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            },
            postProcess(renderedRoute) {
                // Clean up Vite's preload module scripts for better SEO
                renderedRoute.html = renderedRoute.html
                    .replace(/<link[^>]*?rel="modulepreload"[^>]*?>/g, '');
                return renderedRoute;
            },
        }),
    ],
    define: {
        __BUILD_VERSION__: JSON.stringify('v5-prerender-20260204')
    },
    resolve: {
        alias: {
            "@": path_1.default.resolve(__dirname, "client", "src"),
            "@shared": path_1.default.resolve(__dirname, "shared"),
        },
    },
    root: path_1.default.resolve(__dirname, "client"),
    base: "/",
    build: {
        outDir: path_1.default.resolve(__dirname, "dist"),
        emptyOutDir: true,
        chunkSizeWarningLimit: 2000,
        target: "es2020",
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    router: ['react-router-dom'],
                },
            },
        },
    },
    server: {
        port: 5173,
        host: true,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3001',
                changeOrigin: true,
            },
        },
    },
});
