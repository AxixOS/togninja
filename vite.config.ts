import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import prerender from "@prerenderer/rollup-plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve the Chrome binary used by the prerenderer.
// The chrome-for-testing buildpack installs Chrome under
// `<dir>/.chrome-for-testing/chrome-linux64/chrome`. During the Heroku *build*
// that dir is the build workdir (process.cwd(), e.g. /tmp/build_xxxx) — NOT
// /app, which only exists at runtime. So we check the build workdir first, then
// /app, then an explicit env var, then PATH. Every candidate is existence-checked
// so a stale path (e.g. an /app config var at build time) is skipped. On
// Windows/local none match → undefined → Puppeteer uses its bundled Chromium.
function resolveChromePath(): string | undefined {
  const rel = ".chrome-for-testing/chrome-linux64/chrome";
  const candidates = [
    `${process.cwd()}/${rel}`,
    `/app/${rel}`,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.GOOGLE_CHROME_BIN,
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  if (process.platform !== "win32") {
    try {
      const found = execSync("command -v chrome", { encoding: "utf8" }).trim();
      if (found && existsSync(found)) return found;
    } catch {
      // chrome not on PATH (e.g. local non-Heroku build) — fall through
    }
  }
  return undefined;
}

// Public routes to prerender for SEO.
//
// UNIVERSAL ONLY. Every path here must exist on every instance, because prerendering
// writes a real HTML file into dist that gets served to crawlers.
//
// Twenty-five "…-wien/" routes and /warum-new-age-fotografie/ used to be in this list.
// They are the Vienna studio's service pages, so every buyer's build produced static
// files for services they do not offer, at URLs their app does not route — and each one
// was captured mid-load, freezing the Vienna pillar grid into the markup. A studio's own
// pillar pages come from its Authority Map at runtime and cannot be known at build time.
//
// A deployment that DOES own extra routes supplies them itself:
//   PRERENDER_EXTRA_ROUTES="/familienfotos-wien/,/babyfotos-wien/,…"
// The Vienna deployment's full list is kept in deploy/newage-prerender-routes.txt.
const extraRoutes = (process.env.PRERENDER_EXTRA_ROUTES || '')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);

const publicRoutes = [
  '/',
  '/portfolio',
  '/fotoshootings',
  '/kontakt',
  '/blog',
  '/case-studies',
  '/warteliste',
  '/vouchers',

  // English (EN) URLs — keep in sync with client/src/config/localeRoutes.ts.
  '/en/',
  '/en/case-studies/',
  '/en/pricing/',
  '/en/vouchers/',
  '/en/contact/',
  '/en/waitlist/',
  '/en/about-us/',

  // Support Pages
  '/ueber-uns/',
  '/preise/',
  '/faq/',
  '/kundenstimmen/',
  '/impressum/',
  '/agb/',
  '/datenschutz/',
  '/model-release/',
  '/calculator',
  '/galleries',

  // Fotoshooting Types
  '/fotoshootings/business',
  '/fotoshootings/event',
  '/fotoshootings/wedding',

  // Gutschein Pages (dedicated static components only — /gutschein/:slug
  // catch-all pages like baby/business are data-driven and served via
  // request-time meta injection in server/vite.ts, NOT prerendered).
  // The three child routes were deleted in the Aug 2026 de-branding and now 301
  // to /vouchers; prerendering a redirect would capture the wrong page.
  '/gutschein',

  // NOTE: blog posts are deliberately NOT prerendered anymore. The build has
  // no API/DB, so puppeteer captured "post not found" error pages (July 2026
  // SEO audit), and rendering every published post pushed the Heroku build
  // toward its 15-minute kill limit once the backlog grew. Blog posts get
  // their <title>/<meta>/canonical injected at request time from the DB
  // (server/vite.ts lookupRouteMeta) and Googlebot renders the JS content.

  ...extraRoutes,
];

// Prerendering is controlled by a single explicit opt-in: the PRERENDER env var.
// (Set as a Heroku config var AND via heroku-postbuild.) This deliberately does
// NOT key off DYNO/CI/NODE_ENV — those are set in the Heroku *build* env and were
// previously causing prerendering to be skipped in production. Local/dev builds
// omit PRERENDER for speed; production sets it so static HTML is generated.
const shouldPrerender = !!process.env.PRERENDER;

// Blog posts are no longer prerendered (see NOTE above) — the dynamic route
// discovery via prerender-blog-routes.json is intentionally not loaded. With
// the mass-published backlog it ballooned the prerender phase past Heroku's
// 15-minute build limit, and the prerendered output was error pages anyway.
const prerenderRoutes = Array.from(new Set(publicRoutes));

export default defineConfig({
  plugins: [
    react(),
    // Static prerender for SEO — only when PRERENDER is set (Chrome must be available).
    ...(shouldPrerender ? [
      prerender({
        routes: prerenderRoutes,
        renderer: '@prerenderer/renderer-puppeteer',
        rendererOptions: {
          // 1 route at a time with a generous event timeout: the build dyno's
          // shared CPU parsing the ~5MB bundle in 4 concurrent Chrome tabs blew
          // past the default 30s 'prerender-ready' wait, failing whole builds
          // ("event 'prerender-ready' did not occur within 30s").
          maxConcurrentRoutes: 1,
          renderAfterDocumentEvent: 'prerender-ready',
          timeout: 90000,
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          // Heroku: chrome-for-testing buildpack binary; local: undefined (bundled Chromium).
          executablePath: resolveChromePath(),
        },
        postProcess(renderedRoute) {
          // Clean up Vite's preload module scripts for better SEO
          renderedRoute.html = renderedRoute.html
            .replace(/<link[^>]*?rel="modulepreload"[^>]*?>/g, '');
          return renderedRoute;
        },
      }) as any,
    ] : []),
  ],
  define: {
    __BUILD_VERSION__: JSON.stringify('v5-prerender-20260204')
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  base: "/",
  build: {
    outDir: path.resolve(__dirname, "dist"),
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