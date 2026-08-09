import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
// viteConfig imported dynamically in setupVite to avoid production issues
import { nanoid } from "nanoid";
import { renderIndexHtml, getSiteIdentity } from "./lib/siteIdentity.js";
import { INDEXNOW_KEY, keyFileName } from "./services/indexNow.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// The origin this instance is actually served from.
//
// This was the literal string "https://www.newagefotografie.com" — so EVERY canonical
// tag and EVERY sitemap <loc> on EVERY deployment pointed at the studio the image was
// built for. On another studio's site that is not a cosmetic leak: a canonical is a
// declaration that the real version of this page lives at that other domain, i.e. the
// tenant was telling Google to credit its pages to someone else.
//
// RENDER_EXTERNAL_URL is set automatically by Render, so an instance gets this right
// with no configuration; PUBLIC_SITE_URL overrides it once a studio has its own domain.
// If nothing resolves we emit RELATIVE canonicals rather than guess a host — a relative
// canonical is valid and self-referential, which is the safe default.
const SITE_ORIGIN = String(
  process.env.PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  "",
).trim().replace(/\/+$/, "");

// Same value, under a name the sitemap handler can shadow: a <loc> must be absolute,
// so that handler falls back to the request's own host instead of a relative URL.
const MODULE_SITE_ORIGIN = SITE_ORIGIN;

// Serve /sitemap.xml dynamically: take the curated static sitemap as the base
// and inject a <url> for every PUBLISHED blog post (publishedAt <= now). This
// means scheduled posts appear in the sitemap automatically the moment they go
// live — no rebuild or manual edit needed. Falls back to the static file on any
// error so the route can never 500 the crawler.
function registerDynamicSitemap(app: Express, baseFilePath: string) {
  // IndexNow ownership-proof key file: https://<host>/<KEY>.txt must return the
  // key verbatim. Registered here (before static middleware) so it's served in
  // both dev and prod without a checked-in file that could drift from the key.
  app.get(`/${keyFileName()}`, (_req, res) => {
    res.type("text/plain").send(INDEXNOW_KEY);
  });

  app.get("/sitemap.xml", async (req, res) => {
    try {
      // A sitemap <loc> MUST be absolute, so unlike a canonical it cannot fall back to
      // a relative URL. When no origin is configured, take the one the request arrived
      // on — that is by definition the host this instance is reachable at.
      const SITE_ORIGIN = MODULE_SITE_ORIGIN ||
        `${req.protocol}://${req.get("host")}`.replace(/\/+$/, "");

      const rawBase = fs.existsSync(baseFilePath)
        ? fs.readFileSync(baseFilePath, "utf8")
        : '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>';
      // Re-brandable/re-hostable: rewrite the curated sitemap's hardcoded origin to
      // this instance's own origin so a moved or re-branded instance never emits the
      // wrong host (a mixed-host sitemap gets dropped by Google).
      let base = rawBase.replace(/https?:\/\/(www\.)?newagefotografie\.com/g, SITE_ORIGIN);

      // Drop <url> blocks for pages this studio has switched off. They 301 when
      // visited, but a sitemap is an active invitation to crawl — advertising a page
      // that only redirects wastes crawl budget and keeps the duplicate alive in the
      // index, which is the whole reason for disabling it. Best-effort: a failure
      // here must leave the sitemap intact rather than emit an empty one.
      try {
        const { SITE_PAGES, isPageEnabled } = await import("../shared/sitePages");
        const { pool } = await import("./db");
        // studio_configs has NO site_language column. Selecting it threw on every
        // request — "column site_language does not exist" — and the catch below turned
        // that into a warning nobody read, so the visibility filter had never once run
        // and every disabled page stayed in the live sitemap. Site language comes from
        // SITE_LANG, which is what the fallback already resolved to anyway.
        const { rows } = await pool.query(
          `SELECT enabled_pages FROM studio_configs LIMIT 1`,
        );
        const enabled = rows?.[0]?.enabled_pages || null;
        const lang = process.env.SITE_LANG || "en";

        const disabledLocs = SITE_PAGES
          .filter((p) => !isPageEnabled(p.id, enabled, lang))
          .map((p) => `${SITE_ORIGIN}${p.route.replace(/\/+$/, "")}`);

        for (const loc of disabledLocs) {
          // Match the whole <url>…</url> block whose <loc> is this page, with or
          // without a trailing slash.
          const re = new RegExp(
            // The escape class used to be /[.*+?^${}()|[\\]\\\\]/ — the class closes at
            // [\\], so the trailing \\\\] fell OUTSIDE it and the pattern only matched a
            // special char followed by a backslash. A URL contains no backslashes, so
            // nothing was ever escaped and the loc went into the RegExp raw.
            `\\s*<url>(?:(?!</url>)[\\s\\S])*?<loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/?</loc>[\\s\\S]*?</url>`,
            "g",
          );
          base = base.replace(re, "");
        }
      } catch (e: any) {
        console.warn("[sitemap] could not apply page visibility:", e?.message || e);
      }

      const { storage } = await import("./storage.js");
      const posts = await storage.getBlogPosts(true); // published & publishedAt <= NOW()

      const existing = new Set(
        [...base.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]),
      );

      const xmlEsc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      let hasImages = false;
      const blogUrls = posts
        .filter((p: any) => p.slug)
        .map((p: any) => {
          const loc = `${SITE_ORIGIN}/blog/${p.slug}`;
          if (existing.has(loc)) return "";
          const ts = p.updatedAt || p.publishedAt;
          const lastmod = ts ? new Date(ts).toISOString().slice(0, 10) : "";
          // Collect cover + extra images for the image sitemap extension.
          const imgs: string[] = [p.imageUrl, p.imageUrl2, p.imageUrl3].filter(Boolean);
          let imageXml = "";
          for (const u of imgs) {
            hasImages = true;
            imageXml += `    <image:image>\n      <image:loc>${xmlEsc(u)}</image:loc>\n    </image:image>\n`;
          }
          return (
            `  <url>\n    <loc>${loc}</loc>\n` +
            (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : "") +
            `    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n` +
            imageXml +
            `  </url>`
          );
        })
        .filter(Boolean)
        .join("\n");

      // The studio's own pillar pages. The curated base sitemap can only list routes
      // that exist in every deployment; pillars are generated per studio from its own
      // services, so they have to be added at request time or the pages a studio
      // builds specifically to rank never get advertised. Only PUBLISHED ones —
      // getLandingPageBySlug filters on that, matching the meta path above.
      let pillarUrls = "";
      try {
        const { getAuthorityMap } = await import("./lib/authority-map");
        const { slugify } = await import("./lib/landing-mapping");
        const neonMod: any = await import("../database.js");
        const neonDb = neonMod.default || neonMod;
        const map = await getAuthorityMap();
        const locs: string[] = [];
        for (const pillar of map?.pillars || []) {
          const href = "/" + String(pillar.href || "").replace(/^\/+|\/+$/g, "");
          if (href === "/") continue;
          const loc = `${SITE_ORIGIN}${href}`;
          if (existing.has(loc) || existing.has(`${loc}/`)) continue;
          const slug = slugify(href.replace(/^\/+/, "") || pillar.label);
          const page = typeof neonDb.getLandingPageBySlug === "function"
            ? await neonDb.getLandingPageBySlug(slug)
            : null;
          if (!page) continue;
          locs.push(
            `  <url>\n    <loc>${loc}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>`,
          );
        }
        pillarUrls = locs.join("\n");
      } catch (e: any) {
        console.warn("[sitemap] could not add pillar pages:", e?.message || e);
      }

      let xml = blogUrls
        ? base.replace("</urlset>", `${blogUrls}\n</urlset>`)
        : base;
      if (pillarUrls) xml = xml.replace("</urlset>", `${pillarUrls}\n</urlset>`);
      // Declare the image-sitemap namespace on <urlset> when we emit image tags.
      if (hasImages && !xml.includes("xmlns:image")) {
        xml = xml.replace(
          /<urlset /,
          '<urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" ',
        );
      }
      res.type("application/xml").send(xml);
    } catch (err) {
      console.error("[sitemap] dynamic generation failed, serving static:", err);
      if (fs.existsSync(baseFilePath)) {
        return res.type("application/xml").sendFile(baseFilePath);
      }
      res.status(500).send("sitemap.xml not available");
    }
  });
}

export async function setupVite(app: Express, server: Server) {
  // Dynamically import viteConfig only when needed (development mode)
  const viteConfigModule = await import("../vite.config.js");
  const viteConfig = viteConfigModule.default;

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
  };

  const vite = await createViteServer({
    ...viteConfig,
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

  // Dynamic sitemap must be registered before the Vite static/catch-all
  // middleware so it isn't shadowed by the static public/sitemap.xml.
  registerDynamicSitemap(app, path.resolve(__dirname, "..", "client", "public", "sitemap.xml"));

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip API routes - let them be handled by the API router
    if (url.startsWith('/api/')) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// ── Request-time SEO meta for data-driven routes ────────────────────────────
// Blog posts and voucher-detail pages get their <title>/<meta> from API data,
// which does NOT exist during the build-time prerender — puppeteer captured the
// "not found" error state, so crawlers saw default-title error pages. Instead,
// the server (which has the DB) injects the real title/description/canonical
// into the served HTML for these routes and bypasses the bad prerender files.
interface RouteMeta { title: string; description: string; canonical: string; bodyHtml?: string }

const routeMetaCache = new Map<string, { meta: RouteMeta | null; at: number }>();
const ROUTE_META_TTL = 5 * 60_000;

// Prerendered HTML with tenant identity stamped in, cached per file path.
const prerenderedCache = new Map<string, string>();

// Which landing page (if any) is serving "/". The CLIENT needs this at first paint:
// RootHome used to fetch /api/studio-config and render the BUILT-IN homepage while
// waiting, then swap to the landing page when the answer arrived — a full homepage
// visibly replaced by a different one on every load. Injected into the HTML so the
// client knows synchronously. Short TTL: it changes only when a studio sets/unsets
// its homepage.
let homeSlugCache: { slug: string | null; at: number } | null = null;
const HOME_SLUG_TTL = 60_000;
async function getHomepageLandingSlug(): Promise<string | null> {
  if (homeSlugCache && Date.now() - homeSlugCache.at < HOME_SLUG_TTL) return homeSlugCache.slug;
  try {
    const { pool } = await import("./db");
    const { rows } = await pool.query(`SELECT homepage_landing_slug FROM studio_configs LIMIT 1`);
    const slug = rows?.[0]?.homepage_landing_slug || null;
    homeSlugCache = { slug, at: Date.now() };
    return slug;
  } catch {
    homeSlugCache = { slug: null, at: Date.now() };
    return null;
  }
}

async function lookupRouteMeta(reqPath: string): Promise<RouteMeta | null> {
  const cached = routeMetaCache.get(reqPath);
  if (cached && Date.now() - cached.at < ROUTE_META_TTL) return cached.meta;

  let meta: RouteMeta | null = null;
  try {
    // Static dedicated pages first (gutschein index + family/newborn/maternity).
    // STATIC_ROUTE_META is a module const defined later in the file; this is a
    // function, so it only reads it at request time (after module load) — safe.
    const staticKey = (reqPath.replace(/\/+$/, "") || "/");

    // AI-generated homepage: when a studio has set a landing page as its homepage,
    // serve that page's meta + prerendered body at "/" (canonical "/", not /lp/slug)
    // so crawlers see the real homepage. Falls through to the built-in meta on any error.
    // Only "/" — the client renders the custom homepage at "/" (RootHome), while "/en"
    // renders the built-in HomePage; matching that here avoids SSR/client cloaking.
    if (staticKey === "/") {
      try {
        const homeSlug = await getHomepageLandingSlug();
        if (homeSlug) {
          const neonMod: any = await import("../database.js");
          const neonDb = neonMod.default || neonMod;
          const page = typeof neonDb.getLandingPageBySlug === "function"
            ? await neonDb.getLandingPageBySlug(homeSlug)
            : null;
          if (page) {
            meta = {
              title: page.seo_title || page.title || "Home",
              description: String(page.meta_description || page.content_json?.hero?.subheadline || page.title || "").slice(0, 160),
              canonical: `${SITE_ORIGIN}/`,
              bodyHtml: lpBodyHtml(page),
            };
            routeMetaCache.set(reqPath, { meta, at: Date.now() });
            return meta;
          }
        }
      } catch { /* fall through to the built-in homepage meta */ }
    }

    // A studio's OWN pillar pages, served at their pillar paths (/boudoir-photography/).
    // The client renders these via PillarRoute; without meta here a crawler got the
    // generic shell, so the pages a studio builds to rank would carry no title,
    // description or body. Resolved from the Authority Map, then the landing page
    // named by the same slug rule authority-scaffold uses.
    try {
      const { getAuthorityMap } = await import("./lib/authority-map");
      const map = await getAuthorityMap();
      const norm = (s: string) => "/" + String(s || "").replace(/^\/+|\/+$/g, "");
      const pillar = (map?.pillars || []).find((p: any) => norm(p.href) === norm(staticKey));
      if (pillar) {
        // The SAME slugify authority-scaffold names the page with — imported, not
        // re-implemented, so the two can never drift apart.
        const { slugify } = await import("./lib/landing-mapping");
        const slug = slugify(String(pillar.href || "").replace(/^\/+|\/+$/g, "") || pillar.label);
        const neonMod: any = await import("../database.js");
        const neonDb = neonMod.default || neonMod;
        const page = typeof neonDb.getLandingPageBySlug === "function"
          ? await neonDb.getLandingPageBySlug(slug)
          : null;
        // getLandingPageBySlug already filters to status='published', so an
        // unpublished pillar falls through to the generic shell rather than being
        // advertised to crawlers. That is the intended behaviour, not an oversight:
        // pillars are created as drafts and go live only when the studio publishes.
        if (page) {
          meta = {
            title: page.seo_title || page.title || pillar.label,
            description: String(page.meta_description || page.content_json?.hero?.subheadline || "").slice(0, 160),
            canonical: `${SITE_ORIGIN}${norm(pillar.href)}/`,
            bodyHtml: lpBodyHtml(page),
          };
          routeMetaCache.set(reqPath, { meta, at: Date.now() });
          return meta;
        }
      }
    } catch { /* fall through — a pillar lookup must never break a public page */ }

    if (STATIC_ROUTE_META[staticKey]) {
      meta = STATIC_ROUTE_META[staticKey];
      routeMetaCache.set(reqPath, { meta, at: Date.now() });
      return meta;
    }

    const blogMatch = reqPath.match(/^\/blog\/([^/]+)\/?$/);
    const voucherMatch = reqPath.match(/^\/gutschein\/([^/]+)\/?$/);

    // IMPORTANT: use the same request-time data path the dynamic sitemap uses
    // (./storage.js) — proven to work in production. An earlier version did
    // ad-hoc drizzle imports here and hung in production (30s → Heroku 503).
    if (blogMatch) {
      const slug = decodeURIComponent(blogMatch[1]);
      const { storage } = await import("./storage.js");
      // Single-row lookup (getBlogPosts(true) pulled EVERY post's full content
      // for one meta hit). Guard published + publishedAt manually.
      const post: any = await storage.getBlogPostBySlug(slug);
      const isLive = post && post.published === true &&
        (!post.publishedAt || new Date(post.publishedAt).getTime() <= Date.now());
      if (isLive) {
        const studioName = await getStudioName();
        // Resolve the studio's Authority Map for the cluster→pillar uplinks.
        const { getAuthorityMap } = await import("./lib/authority-map");
        const { pillarForTopic } = await import("../shared/authorityMap.js");
        const authority = pillarForTopic(await getAuthorityMap(), `${post.title || ""} ${post.slug || ""} ${post.excerpt || ""}`);
        meta = {
          title: post.seoTitle || `${post.title} | New Age Fotografie Blog`,
          description: String(post.metaDescription || post.excerpt || post.title).slice(0, 160),
          canonical: `${SITE_ORIGIN}/blog/${slug}`,
          // Auto-embed JSON-LD (BlogPosting + FAQ + any ShootCleaner-supplied schema) so
          // published posts are structured-data rich for search and AI-answer citations.
          bodyHtml: blogBodyHtml(post, authority) + blogJsonLd(post, studioName),
        };
      }
    } else if (voucherMatch) {
      const slug = decodeURIComponent(voucherMatch[1]);
      // Dedicated components (with their own SEO) exist for these slugs.
      if (!["family", "newborn", "maternity"].includes(slug)) {
        const { storage } = await import("./storage.js");
        const products = await storage.getVoucherProducts();
        const v: any = (products as any[]).find((p) => p.slug === slug);
        if (v) {
          meta = {
            title: v.metaTitle || `${v.name} – Fotoshooting Gutschein Wien | New Age Fotografie`,
            description: String(v.metaDescription || v.description || `${v.name}: Fotoshooting-Gutschein von New Age Fotografie Wien.`).slice(0, 160),
            canonical: `${SITE_ORIGIN}/gutschein/${slug}`,
            bodyHtml:
              `<div class="max-w-3xl mx-auto px-4 py-12">\n` +
              `<h1 class="text-3xl font-bold text-gray-900 mb-4">${htmlEsc(String(v.name || slug))}</h1>\n` +
              (v.description ? `<p class="text-gray-700 mb-6">${htmlEsc(String(v.description))}</p>\n` : "") +
              `<p class="text-gray-700"><a href="/vouchers" class="underline">Alle Gutscheine</a> · <a href="/preise/" class="underline">Preise &amp; Pakete</a> · <a href="/kontakt" class="underline">Kontakt</a></p>\n` +
              `</div>`,
          };
        }
      }
    } else {
      const lpMatch = reqPath.match(/^\/lp\/([^/]+)\/?$/);
      if (lpMatch) {
        const slug = decodeURIComponent(lpMatch[1]);
        // Same request-time accessor the dynamic sitemap uses for LPs.
        const neonMod: any = await import("../database.js");
        const neonDb = neonMod.default || neonMod;
        const page = typeof neonDb.getLandingPageBySlug === "function"
          ? await neonDb.getLandingPageBySlug(slug)
          : null;
        if (page) {
          meta = {
            title: page.seo_title || page.title || slug,
            description: String(page.meta_description || page.content_json?.hero?.subheadline || page.title || "").slice(0, 160),
            canonical: `${SITE_ORIGIN}/lp/${slug}`,
            bodyHtml: lpBodyHtml(page),
          };
        }
      }
    }
  } catch (err) {
    console.warn("[route-meta] lookup failed:", (err as any)?.message);
    return null; // don't cache transient DB errors
  }

  routeMetaCache.set(reqPath, { meta, at: Date.now() });
  return meta;
}

const htmlEsc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── Server-rendered body for data-driven routes ─────────────────────────────
// Blog posts, landing pages and voucher details only exist as client-side
// React renders — a non-JS crawler (most SEO auditors) sees an EMPTY <div
// id="root"> and flags them as zero-word dead-end pages. Build a static HTML
// version of the page body from the same DB data as the meta lookup and
// inject it into the root at serve time. The client uses createRoot().render()
// (not hydrateRoot), so React simply replaces this content on mount.

// Cluster→pillar uplinks now come from the studio's Authority Map (shared/authorityMap.ts,
// resolved via ./lib/authority-map). The New Age seed there is byte-identical to the map
// that used to live here; other studios get their own generated map.
type BlogAuthority = { pillar: { href: string; label: string }; siblings: { href: string; label: string }[] };

// Legacy posts store raw Markdown in `content` (contentHtml empty). Minimal
// conversion — headings + paragraphs — is enough for crawlable text.
function markdownishToHtml(md: string): string {
  return md.split(/\n{2,}/).map((block) => {
    const t = block.trim();
    if (!t) return "";
    const h = t.match(/^(#{1,4})\s+(.*)$/s);
    if (h) {
      const level = Math.min(h[1].length + 1, 5);
      return `<h${level}>${htmlEsc(h[2].trim())}</h${level}>`;
    }
    return `<p>${htmlEsc(t).replace(/\n/g, "<br/>")}</p>`;
  }).filter(Boolean).join("\n");
}

function blogBodyHtml(post: any, authority: BlogAuthority): string {
  const { pillar, siblings } = authority;
  const published = post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 10) : "";
  const content = post.contentHtml && String(post.contentHtml).trim()
    ? String(post.contentHtml)
    : markdownishToHtml(String(post.content || ""));
  const cover = post.imageUrl
    ? `<img src="${htmlEsc(String(post.imageUrl))}" alt="${htmlEsc(String(post.title || ""))}" class="w-full rounded-xl mb-8" />\n`
    : "";
  const siblingLinks = siblings.map((s) =>
    `<li><a href="${s.href}" class="text-purple-700 underline underline-offset-2">${htmlEsc(s.label)}</a></li>`).join("\n");
  return (
    `<div class="max-w-3xl mx-auto px-4 py-12">\n` +
    `<article>\n` +
    `<h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">${htmlEsc(String(post.title || ""))}</h1>\n` +
    (published ? `<p class="text-sm text-gray-500 mb-6">Veröffentlicht am ${published} · <a href="/blog" class="underline">New Age Fotografie Blog</a></p>\n` : "") +
    cover +
    `<div class="blog-post-content prose prose-purple max-w-none">\n${content}\n</div>\n` +
    `</article>\n` +
    `<div class="mt-10 bg-purple-50 border border-purple-100 rounded-xl p-6">\n` +
    `<h3 class="text-xl font-bold text-gray-900 mb-4">Passendes Fotoshooting</h3>\n` +
    `<a href="${pillar.href}" class="block bg-purple-600 text-white font-semibold rounded-lg px-5 py-3 mb-4">→ ${htmlEsc(pillar.label)}: Infos, Pakete &amp; Beispiele</a>\n` +
    `<ul class="grid sm:grid-cols-3 gap-3 mb-4">\n${siblingLinks}\n</ul>\n` +
    `<p class="text-gray-700">Alle <a href="/preise/" class="underline">Preise &amp; Pakete</a> · <a href="/kundenstimmen/" class="underline">Kundenstimmen</a> · <a href="/kontakt" class="underline">Termin anfragen</a> · <a href="/vouchers" class="underline">Gutscheine</a></p>\n` +
    `</div>\n` +
    `</div>`
  );
}

// Studio name for JSON-LD publisher/author (multi-tenant), cached 5 min.
let _studioNameCache: { value: string; at: number } | null = null;
async function getStudioName(): Promise<string> {
  if (_studioNameCache && Date.now() - _studioNameCache.at < 300_000) return _studioNameCache.value;
  let name = '';
  try {
    const { pool } = await import("./db"); // pool isn't a module-level import in this file
    const r = await pool.query('SELECT business_name, studio_name FROM studio_configs LIMIT 1');
    name = (r.rows[0]?.business_name || r.rows[0]?.studio_name || '').trim();
  } catch { /* studio_configs may not exist yet */ }
  _studioNameCache = { value: name, at: Date.now() };
  return name;
}

// Build JSON-LD <script> tags for a published blog post. Emits a baseline BlogPosting
// (unless ShootCleaner already supplied Article/BlogPosting), a FAQPage from the SC FAQ
// block, and any ready-made JSON-LD ShootCleaner shipped in idea_data.shootcleaner. The
// JSON is `<`-escaped so a string containing "</script>" can't break out of the tag.
function blogJsonLd(post: any, studioName: string): string {
  const scripts: string[] = [];
  const emit = (obj: any) => {
    try { scripts.push(`<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`); }
    catch { /* skip unserializable */ }
  };
  const idea = (post.ideaData || post.idea_data || {}) as any;
  const sc = (idea && idea.shootcleaner) || {};
  const explicit = Array.isArray(sc.jsonld) ? sc.jsonld : (sc.jsonld && typeof sc.jsonld === "object" ? [sc.jsonld] : []);
  const types = new Set(explicit.map((o: any) => o && o["@type"]).filter(Boolean));
  const publisher = { "@type": "Organization", name: studioName || "New Age Fotografie" };

  if (!types.has("BlogPosting") && !types.has("Article")) {
    const published = post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined;
    const modified = post.updatedAt ? new Date(post.updatedAt).toISOString() : published;
    emit({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: String(post.title || "").slice(0, 110),
      description: String(post.metaDescription || post.excerpt || "").slice(0, 300) || undefined,
      image: post.imageUrl ? [String(post.imageUrl)] : undefined,
      datePublished: published,
      dateModified: modified,
      author: publisher,
      publisher,
      mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_ORIGIN}/blog/${post.slug}` },
    });
  }

  const faq = Array.isArray(sc.faq) ? sc.faq : [];
  if (faq.length && !types.has("FAQPage")) {
    const mainEntity = faq.map((f: any) => {
      const q = f?.question ?? f?.q; const a = f?.answer ?? f?.a;
      if (!q || !a) return null;
      return { "@type": "Question", name: String(q), acceptedAnswer: { "@type": "Answer", text: String(a) } };
    }).filter(Boolean);
    if (mainEntity.length) emit({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity });
  }

  for (const o of explicit) {
    if (o && typeof o === "object") emit(o["@context"] ? o : { "@context": "https://schema.org", ...o });
  }
  return scripts.length ? `\n${scripts.join("\n")}` : "";
}

function lpBodyHtml(page: any): string {
  const c = (page.content_json || {}) as Record<string, any>;
  // content_json exists in two vocabularies (AI generation vs editor save) —
  // read both, same as the public renderer.
  const listOf = (v: any, key: string): any[] => (Array.isArray(v) ? v : Array.isArray(v?.[key]) ? v[key] : []);
  const first = (...vals: any[]) => { for (const v of vals) if (typeof v === "string" && v.trim()) return v; return ""; };
  const vis = (c.meta?.sectionVisibility || {}) as Record<string, any>;
  const show = (k: string) => vis[k] !== false;
  const parts: string[] = [];

  const hero = c.hero || {};
  if (show("hero")) {
    const h1 = first(hero.headline, page.title, page.slug);
    parts.push(`<h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-3">${htmlEsc(h1)}</h1>`);
    if (first(hero.subheadline)) parts.push(`<p class="text-lg text-gray-600 mb-6">${htmlEsc(hero.subheadline)}</p>`);
  }
  if (show("trustBar")) {
    const items = listOf(c.trustBar, "items").filter((i: any) => typeof i === "string" && i.trim());
    if (items.length) parts.push(`<p class="text-sm text-gray-500 mb-6">${items.map((i: string) => htmlEsc(i)).join(" · ")}</p>`);
  }
  if (show("problemSection") && c.problemSection) {
    const p = c.problemSection;
    const paras = listOf(p.paragraphs || p.painPoints, "items");
    if (first(p.title, p.headline)) parts.push(`<h2 class="text-2xl font-bold mt-8 mb-3">${htmlEsc(first(p.title, p.headline))}</h2>`);
    for (const para of paras) if (typeof para === "string" && para.trim()) parts.push(`<p class="text-gray-700 mb-3">${htmlEsc(para)}</p>`);
  }
  if (show("offerSection") && c.offerSection) {
    const o = c.offerSection;
    if (first(o.title, o.headline)) parts.push(`<h2 class="text-2xl font-bold mt-8 mb-3">${htmlEsc(first(o.title, o.headline))}</h2>`);
    if (first(o.intro, o.description)) parts.push(`<p class="text-gray-700 mb-3">${htmlEsc(first(o.intro, o.description))}</p>`);
    const bullets = listOf(o.bullets || o.inclusions, "items").filter((b: any) => typeof b === "string" && b.trim());
    if (bullets.length) parts.push(`<ul class="list-disc pl-6 mb-3 text-gray-700">${bullets.map((b: string) => `<li>${htmlEsc(b)}</li>`).join("")}</ul>`);
    if (first(o.price)) parts.push(`<p class="font-semibold text-gray-900 mb-2">${htmlEsc(o.price)}</p>`);
    if (first(o.urgency)) parts.push(`<p class="text-sm text-purple-700 mb-3">${htmlEsc(o.urgency)}</p>`);
  }
  if (show("benefits")) {
    for (const b of listOf(c.benefits, "items")) {
      if (b && (b.title || b.description)) parts.push(`<p class="text-gray-700 mb-2"><strong>${htmlEsc(String(b.title || ""))}</strong> ${htmlEsc(String(b.description || ""))}</p>`);
    }
  }
  if (show("whyChooseUs") && c.whyChooseUs) {
    const w = c.whyChooseUs;
    if (first(w.title, w.headline)) parts.push(`<h2 class="text-2xl font-bold mt-8 mb-3">${htmlEsc(first(w.title, w.headline))}</h2>`);
    const reasons = (Array.isArray(w.points) ? w.points : Array.isArray(w.reasons) ? w.reasons : [])
      .map((r: any) => (typeof r === "string" ? { title: r, description: "" } : r || {}));
    for (const r of reasons) {
      if (r.title || r.description) parts.push(`<p class="text-gray-700 mb-2"><strong>${htmlEsc(String(r.title || ""))}</strong> ${htmlEsc(String(r.description || ""))}</p>`);
    }
  }
  if (show("inclusions") && c.inclusions) {
    const items = listOf(c.inclusions, "items").filter((i: any) => typeof i === "string" && i.trim());
    if (first(c.inclusions.title, c.inclusions.headline)) parts.push(`<h2 class="text-2xl font-bold mt-8 mb-3">${htmlEsc(first(c.inclusions.title, c.inclusions.headline))}</h2>`);
    if (items.length) parts.push(`<ul class="list-disc pl-6 mb-3 text-gray-700">${items.map((i: string) => `<li>${htmlEsc(i)}</li>`).join("")}</ul>`);
  }
  if (show("testimonials")) {
    const ts = listOf(c.testimonials, "testimonials").filter((t: any) => t && t.quote);
    if (ts.length) {
      parts.push(`<h2 class="text-2xl font-bold mt-8 mb-3">Das sagen unsere Kunden</h2>`);
      for (const t of ts) parts.push(`<blockquote class="text-gray-700 italic mb-2">„${htmlEsc(String(t.quote))}" — ${htmlEsc(String(t.author || ""))}</blockquote>`);
    }
  }
  if (show("faq")) {
    const faqs = listOf(c.faq, "items").filter((f: any) => f && f.question);
    if (faqs.length) {
      parts.push(`<h2 class="text-2xl font-bold mt-8 mb-3">Häufige Fragen</h2>`);
      for (const f of faqs) {
        parts.push(`<p class="font-semibold text-gray-900 mb-1">${htmlEsc(String(f.question))}</p>`);
        parts.push(`<p class="text-gray-700 mb-3">${htmlEsc(String(f.answer || ""))}</p>`);
      }
    }
  }
  if (show("finalCta") && c.finalCta) {
    const fc = c.finalCta;
    if (first(fc.title, fc.headline)) parts.push(`<h2 class="text-2xl font-bold mt-8 mb-3">${htmlEsc(first(fc.title, fc.headline))}</h2>`);
    if (first(fc.body, fc.description)) parts.push(`<p class="text-gray-700 mb-3">${htmlEsc(first(fc.body, fc.description))}</p>`);
  }
  parts.push(`<p class="mt-8 text-gray-700"><a href="/kontakt" class="underline">Kontakt &amp; Termin anfragen</a> · <a href="/vouchers" class="underline">Gutscheine</a> · <a href="/preise/" class="underline">Preise</a></p>`);
  return `<div class="max-w-3xl mx-auto px-4 py-12">\n${parts.join("\n")}\n</div>`;
}

// Dedicated gutschein pages (index + family/newborn/maternity) are React
// components the build-time prerender never captured with content, so crawlers
// got the empty shell with the homepage title (thin + duplicate-title, SEO
// audit "Category B"). They aren't data-driven, so serve static meta + a
// crawlable body here. Keyed by path without trailing slash.
// NOTE: defined AFTER htmlEsc (a `const` above) — gutscheinBody calls htmlEsc,
// and STATIC_ROUTE_META evaluates gutscheinBody at module load, so this block
// MUST come after htmlEsc's initialization or it throws a TDZ ReferenceError
// on boot (a build won't catch that — it crashed the dyno once).
function gutscheinBody(h1: string, intro: string): string {
  return (
    `<div class="max-w-3xl mx-auto px-4 py-12">\n` +
    `<h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">${htmlEsc(h1)}</h1>\n` +
    `<p class="text-gray-700 mb-6 leading-relaxed">${htmlEsc(intro)}</p>\n` +
    `<ul class="list-disc pl-6 mb-6 text-gray-700">\n` +
    `<li><a href="/gutschein/family/" class="underline">Familien-Fotoshooting Gutschein</a></li>\n` +
    `<li><a href="/gutschein/newborn/" class="underline">Neugeborenen-Fotoshooting Gutschein</a></li>\n` +
    `<li><a href="/gutschein/maternity/" class="underline">Schwangerschafts-Fotoshooting Gutschein</a></li>\n` +
    `</ul>\n` +
    `<p class="text-gray-700">Alle <a href="/vouchers" class="underline">Gutscheine</a> · <a href="/preise/" class="underline">Preise &amp; Pakete</a> · <a href="/kundenstimmen/" class="underline">Kundenstimmen</a> · <a href="/kontakt" class="underline">Kontakt</a></p>\n` +
    `</div>`
  );
}
const STATIC_ROUTE_META: Record<string, RouteMeta> = {
  "/gutschein": {
    title: "Fotoshooting Gutscheine Wien verschenken | New Age Fotografie",
    description: "Verschenken Sie ein Fotoshooting in Wien: Familien-, Neugeborenen- und Schwangerschafts-Gutscheine von New Age Fotografie. Flexibel einlösbar und persönlich gestaltbar.",
    canonical: `${SITE_ORIGIN}/gutschein/`,
    bodyHtml: gutscheinBody(
      "Fotoshooting Gutscheine aus Wien verschenken",
      "Ein Fotoshooting ist ein Geschenk, das bleibt. Bei New Age Fotografie in Wien (Studio in 1050 Wien) verschenken Sie einen Gutschein für ein Familien-, Neugeborenen- oder Schwangerschafts-Shooting — flexibel einlösbar und persönlich gestaltbar.",
    ),
  },
  "/gutschein/family": {
    title: "Familien-Fotoshooting Gutschein Wien | New Age Fotografie",
    description: "Familien-Fotoshooting als Geschenk: Gutschein für ein Familienshooting in Wien bei New Age Fotografie. Bis zu 15 Personen, Tageslichtstudio in 1050 Wien, flexibel einlösbar.",
    canonical: `${SITE_ORIGIN}/gutschein/family/`,
    bodyHtml: gutscheinBody(
      "Familien-Fotoshooting Gutschein aus Wien",
      "Verschenken Sie ein entspanntes Familien-Fotoshooting in Wien. Bis zu 15 Personen (Kinder, Großeltern und Haustiere willkommen) im Tageslichtstudio in 1050 Wien. Der Gutschein ist flexibel einlösbar und kann persönlich gestaltet werden.",
    ),
  },
  "/gutschein/newborn": {
    title: "Neugeborenen-Fotoshooting Gutschein Wien | New Age Fotografie",
    description: "Neugeborenen-Shooting verschenken: Gutschein für ein Neugeborenenfoto-Shooting in Wien. Sichere, sanfte Posings im warmen Tageslichtstudio in 1050 Wien.",
    canonical: `${SITE_ORIGIN}/gutschein/newborn/`,
    bodyHtml: gutscheinBody(
      "Neugeborenen-Fotoshooting Gutschein aus Wien",
      "Ein Gutschein für ein Neugeborenen-Shooting in Wien — die ersten Tage für immer festgehalten. Sichere, sanfte Posings im warmen Tageslichtstudio (1050 Wien), ideal in den ersten 5–14 Tagen nach der Geburt.",
    ),
  },
  "/gutschein/maternity": {
    title: "Schwangerschafts-Fotoshooting Gutschein Wien | New Age Fotografie",
    description: "Babybauch-Shooting als Geschenk: Gutschein für ein Schwangerschafts-Fotoshooting in Wien bei New Age Fotografie. Elegant und entspannt im Studio in 1050 Wien.",
    canonical: `${SITE_ORIGIN}/gutschein/maternity/`,
    bodyHtml: gutscheinBody(
      "Schwangerschafts-Fotoshooting Gutschein aus Wien",
      "Verschenken Sie ein elegantes Babybauch-Shooting in Wien. Entspannte, stilvolle Schwangerschaftsfotos im Tageslichtstudio (1050 Wien) — Partner und Geschwister sind herzlich willkommen. Gutschein flexibel einlösbar.",
    ),
  },
};

// Insert static body content into the (already emptied) hydration root.
// The body is wrapped in a display:none container: non-JS crawlers still read
// the text from the HTML source (SEO intact), but browsers never PAINT it, so
// users don't see a flash of unstyled prose before React mounts. React's
// createRoot().render() replaces the whole root on mount, removing this node.
function injectBodyIntoRoot(html: string, bodyHtml: string): string {
  const openIdx = html.search(/<div id="root"[^>]*>/);
  if (openIdx === -1) return html;
  const contentStart = html.indexOf(">", openIdx) + 1;
  const hidden = `<div data-prerender-fallback aria-hidden="true" style="display:none">${bodyHtml}</div>`;
  return html.slice(0, contentStart) + hidden + html.slice(contentStart);
}

// Remove the prerendered homepage body from the SPA shell so data-driven
// routes don't flash homepage content before React renders the real page.
// Regex can't reliably find the matching close tag of a div full of nested
// divs, so walk the markup counting <div>/</div> depth instead.
function emptyHydrationRoot(html: string): string {
  const openIdx = html.search(/<div id="root"[^>]*>/);
  if (openIdx === -1) return html;
  const contentStart = html.indexOf(">", openIdx) + 1;
  let depth = 1;
  const tag = /<div\b|<\/div>/g;
  tag.lastIndex = contentStart;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(html)) !== null) {
    depth += m[0] === "</div>" ? -1 : 1;
    if (depth === 0) {
      // m.index points at the matching </div> of #root.
      return html.slice(0, contentStart) + html.slice(m.index);
    }
  }
  return html; // unbalanced markup — leave untouched
}

function injectRouteMeta(html: string, meta: RouteMeta): string {
  // dist/index.html is the PRERENDERED HOMEPAGE (the '/' route overwrites it
  // at build time), so:
  //  - tags carry attributes (e.g. <title data-rh="true">) — the regexes must
  //    tolerate them or the injection silently no-ops;
  //  - existing canonical/og tags from the homepage must be REMOVED, or the
  //    page would carry conflicting duplicates;
  //  - the homepage body must be emptied so 40 blog URLs don't serve
  //    identical homepage content to non-JS crawlers (duplicate content).
  let out = html.replace(/<title[^>]*>[^<]*<\/title>/, `<title>${htmlEsc(meta.title)}</title>`);
  out = out.replace(/<meta[^>]*name="description"[^>]*>/g, "");
  out = out.replace(/<link[^>]*rel="canonical"[^>]*>/g, "");
  out = out.replace(/<meta[^>]*property="og:(title|description|url)"[^>]*>/g, "");
  const extra =
    `<meta name="description" content="${htmlEsc(meta.description)}" />\n` +
    `    <link rel="canonical" href="${htmlEsc(meta.canonical)}" />\n` +
    `    <meta property="og:title" content="${htmlEsc(meta.title)}" />\n` +
    `    <meta property="og:description" content="${htmlEsc(meta.description)}" />`;
  return out.replace("</head>", `    ${extra}\n  </head>`);
}

export function serveStatic(app: Express) {
  // In production, dist is at the root level, not relative to server/
  const distPath = path.resolve(process.cwd(), "dist");

  const resolvePrerenderedHtmlPath = (requestPath: string) => {
    const segments = requestPath.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    const prerenderedPath = path.resolve(distPath, ...segments, "index.html");
    if (!prerenderedPath.startsWith(distPath)) return null;
    return fs.existsSync(prerenderedPath) ? prerenderedPath : null;
  };

  if (!fs.existsSync(distPath)) {
    console.error(`❌ ERROR: Could not find the build directory at: ${distPath}`);
    console.error(`Current working directory: ${process.cwd()}`);
    console.error(`__dirname: ${__dirname}`);
    // Don't throw - let the app start and show the error
    console.error("⚠️ Static files will not be served. Build the client first with: npm run build");
    return;
  }

  console.log(`✅ Serving static files from: ${distPath}`);

  // Dynamic sitemap MUST be registered before express.static — otherwise the
  // static dist/sitemap.xml is served first and the dynamic handler never runs.
  registerDynamicSitemap(app, path.resolve(distPath, "sitemap.xml"));

  // Serve static ASSETS from dist. index: false so directory index.html files
  // (the prerendered pages) do NOT get served here — they must flow through
  // the catch-all below, which stamps the tenant identity into them and
  // handles the data-driven blog/voucher routes.
  app.use(express.static(distPath, { index: false }));

  // Explicitly serve robots.txt and sitemap.xml for SEO
  app.get("/robots.txt", (_req, res) => {
    const robotsPath = path.resolve(distPath, "robots.txt");
    if (fs.existsSync(robotsPath)) {
      res.type("text/plain").sendFile(robotsPath);
    } else {
      res.status(404).send("robots.txt not found");
    }
  });

  // Per-tenant index.html: fill %SITE_*% identity placeholders once (env is
  // stable per process). A template with no placeholders passes through
  // unchanged, so this is safe on both index.html variants. Additionally
  // stamp the tenant name over the prerender-baked "My Studio" fallback
  // (dist/index.html is the prerendered homepage, rendered without env).
  let cachedIndex: string | null = null;
  const renderedIndex = (): string => {
    if (cachedIndex === null) {
      const raw = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");
      let html = renderIndexHtml(raw);
      try {
        const name = getSiteIdentity().name;
        if (name && name !== "My Studio") html = html.split("My Studio").join(name);
      } catch { /* identity unavailable — serve as-is */ }
      cachedIndex = html;
    }
    return cachedIndex;
  };

  // Shell with the prerendered homepage body stripped — for any route that
  // isn't the homepage itself (prevents the homepage-content flash).
  let cachedEmptyShell: string | null = null;
  const emptiedShell = (): string => {
    if (cachedEmptyShell === null) {
      cachedEmptyShell = emptyHydrationRoot(renderedIndex());
    }
    return cachedEmptyShell;
  };

  // fall through to index.html if the file doesn't exist
  // BUT exclude /api/* routes - those should return 404 JSON, not HTML
  app.use("*", async (req, res) => {
   try {
    // If it's an API request that wasn't handled, return JSON 404
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
    }

    // IMPORTANT: inside app.use("*") Express strips the matched mount path,
    // so req.path is always "/" here. The real request path must come from
    // req.originalUrl (query string removed). Using req.path silently broke
    // per-route logic in this handler.
    const requestPath = (req.originalUrl || "/").split("?")[0];

    // Data-driven routes (blog posts, voucher details): inject real meta from
    // the DB and serve the shell — NEVER the prerendered files for these
    // paths, which captured the build-time "not found" error state (the
    // prerenderer has no API/DB). Even on a lookup miss the shell is better
    // than a prerendered error page.
    //
    // BULLETPROOF: the lookup races a hard 1.5s timeout and the whole branch
    // is wrapped — under NO circumstances may a meta lookup hang or 500 a
    // public page (a hung lookup previously turned /blog/<missing-slug> into
    // a 30s Heroku H12 → 503).
    if (/^\/(blog|gutschein|lp)\//.test(requestPath)) {
      let meta: RouteMeta | null = null;
      let diag = "miss";
      try {
        meta = await Promise.race([
          lookupRouteMeta(requestPath),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500).unref?.()),
        ]);
        diag = meta ? "hit" : "miss";
      } catch (err) {
        diag = "error";
        console.warn("[route-meta] branch failed:", (err as any)?.message);
      }
      try {
        res.setHeader("X-Route-Meta", diag);
        // ALWAYS empty the hydration root for data-driven routes — the shell
        // is the prerendered HOMEPAGE, and serving its body caused a visible
        // homepage flash before React rendered the actual page (worst on
        // /lp/<slug> "View Live"). Meta is additionally injected on a hit,
        // and the static body (real crawlable content) goes into the emptied
        // root; React's createRoot().render() replaces it on mount.
        let html = emptiedShell();
        if (meta) {
          html = injectRouteMeta(html, meta);
          if (meta.bodyHtml) {
            html = injectBodyIntoRoot(html, meta.bodyHtml);
            res.setHeader("X-Route-Body", "hit");
          }
        }
        return res.status(200).type("html").send(html);
      } catch {
        return res.status(200).type("html").send(renderedIndex());
      }
    }

    const prerenderedHtmlPath = resolvePrerenderedHtmlPath(requestPath);
    if (prerenderedHtmlPath) {
      // The prerender browser has no env/window.__SITE_CONFIG__, so pages
      // whose Helmet titles interpolate SITE.name bake the neutral fallback
      // "My Studio" into the static HTML. Stamp the real tenant identity in
      // at serve time (cached per path).
      try {
        let html = prerenderedCache.get(prerenderedHtmlPath);
        if (html === undefined) {
          html = fs.readFileSync(prerenderedHtmlPath, "utf-8");
          // Fill any %SITE_*% placeholders the prerender snapshot carried
          // through (the prerender browser sees the raw template), then stamp
          // the tenant name over the env-less "My Studio" fallback.
          html = renderIndexHtml(html);
          const name = getSiteIdentity().name;
          if (name && name !== "My Studio") {
            html = html.split("My Studio").join(name);
          }
          prerenderedCache.set(prerenderedHtmlPath, html);
        }
        return res.status(200).type("html").send(html);
      } catch {
        return res.sendFile(prerenderedHtmlPath);
      }
    }

    // Homepage when the studio has set a landing page AS its homepage: the body
    // baked into dist/index.html is the BUILT-IN homepage, i.e. the wrong page
    // entirely. It rendered first and was then replaced by React with the real
    // homepage — a visible flash of another studio's content on every load, and
    // the wrong content for crawlers. lookupRouteMeta("/") already resolves the
    // custom homepage; it was simply never consulted for "/" (only /blog|/gutschein|/lp
    // reached it), so the branch was dead. Same 1.5s race + total isolation as
    // that branch: a slow or broken lookup must never delay or break "/".
    if (requestPath === "/") {
      try {
        const [homeMeta, homeSlug] = await Promise.all([
          Promise.race([
            lookupRouteMeta("/"),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500).unref?.()),
          ]),
          Promise.race([
            getHomepageLandingSlug(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500).unref?.()),
          ]),
        ]);

        // Tell the client which homepage to render BEFORE it mounts, so RootHome does
        // not paint the built-in homepage and then replace it with the landing page.
        // JSON.stringify also escapes the value safely for inline script context.
        const slugScript =
          `<script>window.__HOMEPAGE_LANDING_SLUG__=${JSON.stringify(homeSlug ?? null)}</script>`;
        const withSlug = (html: string) => html.replace("</head>", `${slugScript}</head>`);

        // Only divert when there IS a custom homepage body. With none, fall through
        // to the prerendered built-in homepage exactly as before.
        if (homeMeta?.bodyHtml) {
          let html = injectRouteMeta(emptiedShell(), homeMeta);
          html = injectBodyIntoRoot(html, homeMeta.bodyHtml);
          res.setHeader("X-Route-Meta", "home-custom");
          return res.status(200).type("html").send(withSlug(html));
        }
        return res.status(200).type("html").send(withSlug(renderedIndex()));
      } catch (err) {
        console.warn("[route-meta] homepage branch failed:", (err as any)?.message);
      }
    }

    // For all other requests (frontend routes), serve the SPA with identity
    // injected. dist/index.html is the PRERENDERED HOMEPAGE, so every
    // non-homepage route served from it flashed homepage content until React
    // rendered (reported on /cart after the landing-page CTA, /contact, …).
    // Serve the emptied shell everywhere except "/" itself.
    res.status(200).type("html").send(
      requestPath === "/" ? renderedIndex() : emptiedShell()
    );
   } catch (fatal) {
    // Last-resort guard: this handler must NEVER leave a request hanging
    // (an unhandled async throw here previously meant no response at all →
    // 30s Heroku H12 → "Application Error" on public pages).
    console.error("[serveStatic] catch-all failed:", (fatal as any)?.message);
    try {
      res.status(200).type("html").sendFile(path.resolve(distPath, "index.html"));
    } catch {
      res.status(500).send("Server error");
    }
   }
  });
}
