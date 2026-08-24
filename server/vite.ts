import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
// viteConfig imported dynamically in setupVite to avoid production issues
import { nanoid } from "nanoid";
import { renderIndexHtml, getSiteIdentity } from "./lib/siteIdentity.js";
import { peekStudioAddress, addressVersion } from "./lib/site-address.js";
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
        // This used to select studio_configs.site_language in the same query. That column
        // did not exist, so the query threw on EVERY request and the catch below turned
        // it into a warning nobody read — the visibility filter had never once run and
        // every disabled page stayed in the live sitemap. The column now exists and is
        // set at onboarding; getSiteLanguage() resolves it with an env/English fallback.
        const { rows } = await pool.query(
          `SELECT enabled_pages FROM studio_configs LIMIT 1`,
        );
        const { getSiteLanguage } = await import("./lib/site-language");
        const lang = await getSiteLanguage();
        // Same resolution the site itself uses, so a studio that is not selling online
        // does not advertise voucher pages to crawlers that its own nav hides.
        const { applyEcommerceVisibility } = await import("../shared/sitePages");
        let ecommerceEnabled: boolean | null = null;
        try {
          const { rows: e } = await pool.query(`SELECT ecommerce_enabled FROM studio_integrations LIMIT 1`);
          ecommerceEnabled = e?.[0]?.ecommerce_enabled ?? null;
        } catch { /* column not yet created — treat as enabled */ }
        const { getExplicitSiteLanguage: chosenLang } = await import("./lib/site-language");
        const enabled = applyEcommerceVisibility(
          rows?.[0]?.enabled_pages || null, ecommerceEnabled, lang, !!(await chosenLang()),
        );

        // Disabled pages, under BOTH the canonical path (what the shipped sitemap lists)
        // and this studio's localised path, so switching a page off removes it however
        // the sitemap happens to spell it.
        const { localizePath } = await import("../shared/routeSlugs");
        const { getExplicitSiteLanguage: explicitLang } = await import("./lib/site-language");
        const disabledRouteLang = await explicitLang();
        const disabledLocs = SITE_PAGES
          .filter((p) => !isPageEnabled(p.id, enabled, lang))
          .flatMap((p) => {
            const canonical = p.route.replace(/\/+$/, "");
            const localised = disabledRouteLang
              ? localizePath(canonical, disabledRouteLang).replace(/\/+$/, "")
              : canonical;
            return canonical === localised
              ? [`${SITE_ORIGIN}${canonical}`]
              : [`${SITE_ORIGIN}${canonical}`, `${SITE_ORIGIN}${localised}`];
          });

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
        // Advertise this studio's OWN paths. The shipped sitemap lists the canonical
        // German routes; a studio whose site is in English serves those pages at
        // /contact and /pricing, and a sitemap must list the URL that actually answers,
        // not the one that redirects to it.
        // Only for a studio that explicitly chose a language — an instance that never
        // answered keeps advertising the URLs it already has indexed.
        const { getExplicitSiteLanguage } = await import("./lib/site-language");
        const routeLang = await getExplicitSiteLanguage();
        for (const { canonical, localized } of routeLang
          ? (await import("../shared/routeSlugs")).localizedRouteMap(routeLang)
          : []) {
          const from = `${SITE_ORIGIN}${canonical}`;
          const to = `${SITE_ORIGIN}${localized}`;
          // Match on the PREFIX so nested pages follow their parent:
          // /gutschein/family/ -> /gift-vouchers/family/. Anchored on "<loc>" and
          // terminated by "/" or "<" so /preise can never match inside /preise-extra.
          base = base.split(`<loc>${from}/`).join(`<loc>${to}/`);
          base = base.split(`<loc>${from}<`).join(`<loc>${to}<`);
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

// Is this path one of the studio's own pillar pages?
//
// The meta branch below is gated on a path pattern — /blog/, /gutschein/, /lp/ — and a
// pillar page lives at a path the studio chose (/boudoir-photography/), which matches
// none of them. So lookupRouteMeta was never called for pillars and the resolver inside it
// was unreachable: the pages existed, were published, appeared in the sitemap, and still
// served a shell with the site name as its title. Pillar paths cannot be a static pattern,
// so they are matched against the map. Cached, because this runs on every public request.
let pillarPathCache: { paths: Set<string>; at: number } | null = null;
const PILLAR_PATHS_TTL = 60_000;

async function isPillarPath(reqPath: string): Promise<boolean> {
  const key = "/" + String(reqPath || "").replace(/^\/+|\/+$/g, "");
  if (key === "/") return false;
  try {
    if (!pillarPathCache || Date.now() - pillarPathCache.at > PILLAR_PATHS_TTL) {
      const { getAuthorityMap } = await import("./lib/authority-map");
      const map = await getAuthorityMap();
      pillarPathCache = {
        paths: new Set((map?.pillars || []).map((p: any) => "/" + String(p.href || "").replace(/^\/+|\/+$/g, ""))),
        at: Date.now(),
      };
    }
    return pillarPathCache.paths.has(key);
  } catch {
    return false;
  }
}

/**
 * Resolve every pillar's meta once, in the background, just after boot.
 *
 * The meta branch races a hard 1.5s timeout — deliberately, because a hung lookup once
 * turned a missing blog slug into a 30s gateway timeout. But the FIRST request to a pillar
 * pays for the dynamic imports and a cold connection pool as well as the query, and loses
 * that race: the page was published, correct and healthy, and still served the bare shell.
 * A crawler that visits once sees only that.
 *
 * Warming makes the cost fall on boot instead of on a visitor. Bounded by the number of
 * pillars, entirely best-effort, and it only fills the same cache a request would.
 */
export async function warmPillarRouteMeta(): Promise<void> {
  try {
    const { getAuthorityMap } = await import("./lib/authority-map");
    const map = await getAuthorityMap();
    const paths = (map?.pillars || [])
      .map((p: any) => "/" + String(p.href || "").replace(/^\/+|\/+$/g, ""))
      .filter((p: string) => p !== "/");
    for (const p of paths.slice(0, 12)) {
      await lookupRouteMeta(p).catch(() => null);
    }
    if (paths.length) console.log(`[route-meta] warmed ${paths.length} pillar path(s)`);
  } catch (e: any) {
    console.warn("[route-meta] pillar warm-up skipped:", e?.message || e);
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
          // The studio's own priced products, read live so an existing pillar page gains a
          // price the moment one is set — no regeneration. Best-effort throughout: a
          // pricing lookup must never cost the page its meta.
          let products: any[] = [];
          let currency = 'EUR';
          try {
            if (typeof neonDb.getVoucherProducts === 'function') products = await neonDb.getVoucherProducts();
          } catch { /* no catalogue yet */ }
          try {
            const { getStudioCurrency } = await import('./lib/studio-currency');
            currency = (await getStudioCurrency()).toUpperCase();
          } catch { /* default */ }

          // Service + Offer. The visible price is only half the job: this is the half
          // Google reads for rich results and an assistant reads when it wants a number it
          // can trust. provider points at the LocalBusiness the homepage already declares,
          // so the two nodes describe one entity rather than two.
          //
          // No aggregateRating here, deliberately. Third-party ratings marked up as the
          // studio's own is against Google's guidelines and can earn a manual action — and
          // we removed the fabricated version of exactly that in v1.9.12.
          const priced = (products || []).filter((p: any) => {
            const price = Number(p.price) || 0;
            if (price <= 0) return false;
            if (p.is_active === false || p.isActive === false) return false;
            const hay = `${p.category || ''} ${p.name || ''} ${p.slug || ''}`.toLowerCase();
            const label = String(pillar.label || '').toLowerCase();
            return hay.includes(label) || label.includes(String(p.category || '').toLowerCase());
          });
          const serviceLd: any = {
            "@context": "https://schema.org",
            "@type": "Service",
            "@id": `${SITE_ORIGIN}${norm(pillar.href)}/#service`,
            name: pillar.label,
            ...(page.meta_description ? { description: String(page.meta_description).slice(0, 300) } : {}),
            serviceType: pillar.label,
            provider: { "@id": `${SITE_ORIGIN}/#business` },
            url: `${SITE_ORIGIN}${norm(pillar.href)}/`,
          };
          if (priced.length) {
            const lowest = priced.reduce((m: any, p: any) => (Number(p.price) < Number(m.price) ? p : m), priced[0]);
            serviceLd.offers = {
              "@type": "AggregateOffer",
              priceCurrency: currency,
              lowPrice: Number(lowest.price).toFixed(2),
              offerCount: priced.length,
              availability: "https://schema.org/InStock",
              url: `${SITE_ORIGIN}${norm(pillar.href)}/`,
            };
          }

          meta = {
            title: page.seo_title || page.title || pillar.label,
            description: String(page.meta_description || page.content_json?.hero?.subheadline || "").slice(0, 160),
            canonical: `${SITE_ORIGIN}${norm(pillar.href)}/`,
            bodyHtml: lpBodyHtml(page, pillarExtrasHtml({ pillar, products, currency, origin: SITE_ORIGIN }))
              + `\n<script type="application/ld+json">${JSON.stringify(serviceLd).replace(/</g, '\\u003c')}</script>`,
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
        const lang = await getStudioLang();
        meta = {
          // The STUDIO's name, not the name of the studio this product grew out of. This
          // read `| New Age Fotografie Blog` on every tenant, server-side, in the title
          // Google indexes — so one studio's blog was advertising another's brand.
          // Falls back to the bare post title when the studio has not named itself yet,
          // because a trailing " | Blog" reads like a broken template.
          title: post.seoTitle
            || (studioName ? `${post.title} | ${studioName} Blog` : String(post.title || '')),
          description: String(post.metaDescription || post.excerpt || post.title).slice(0, 160),
          canonical: `${SITE_ORIGIN}/blog/${slug}`,
          // Auto-embed JSON-LD (BlogPosting + FAQ + any ShootCleaner-supplied schema) so
          // published posts are structured-data rich for search and AI-answer citations.
          bodyHtml: blogBodyHtml(post, authority, studioName, lang, await getAuthorityMap())
            + blogJsonLd(post, studioName),
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
          const vName = await getStudioName();
          const vDe = (await getStudioLang()) === 'de';
          // Was "Fotoshooting Gutschein Wien | New Age Fotografie" for every tenant: the
          // origin studio's name, its city and its language, on a voucher sold by somebody
          // else entirely. The city is simply dropped — this file has no business guessing
          // where a studio is, and the studio's own metaTitle overrides all of it anyway.
          const vKind = vDe ? 'Fotoshooting-Gutschein' : 'Photo session gift voucher';
          meta = {
            title: v.metaTitle
              || (vName ? `${v.name} – ${vKind} | ${vName}` : `${v.name} – ${vKind}`),
            description: String(
              v.metaDescription
              || v.description
              || (vName ? `${v.name}: ${vKind} — ${vName}.` : `${v.name}: ${vKind}.`),
            ).slice(0, 160),
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

function blogBodyHtml(
  post: any,
  authority: BlogAuthority,
  studioName: string,
  lang: 'de' | 'en',
  map: any,
): string {
  const { pillar, siblings } = authority;
  const published = post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 10) : "";
  const de = lang === 'de';
  // The few strings this file writes itself. Everything else on the page comes from the
  // post or the studio's own Authority Map.
  const T = {
    publishedOn: de ? 'Veröffentlicht am' : 'Published',
    blogHome: studioName ? `${studioName} Blog` : (de ? 'Blog' : 'Blog'),
    ctaHeading: de ? 'Passendes Fotoshooting' : 'A session that fits',
    pillarSuffix: de ? 'Infos, Pakete & Beispiele' : 'details, packages and examples',
  };
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
    (published
      ? `<p class="text-sm text-gray-500 mb-6">${T.publishedOn} ${published} · <a href="/blog" class="underline">${htmlEsc(T.blogHome)}</a></p>\n`
      : "") +
    cover +
    `<div class="blog-post-content prose prose-purple max-w-none">\n${content}\n</div>\n` +
    `</article>\n` +
    (pillar
      ? `<div class="mt-10 bg-purple-50 border border-purple-100 rounded-xl p-6">\n`
        + `<h3 class="text-xl font-bold text-gray-900 mb-4">${htmlEsc(T.ctaHeading)}</h3>\n`
        + `<a href="${htmlEsc(pillar.href)}" class="block bg-purple-600 text-white font-semibold rounded-lg px-5 py-3 mb-4">→ ${htmlEsc(pillar.label)}: ${htmlEsc(T.pillarSuffix)}</a>\n`
        + `<ul class="grid sm:grid-cols-3 gap-3 mb-4">\n${siblingLinks}\n</ul>\n`
      : "") +
    // The studio's OWN conversion links, which the Authority Map has carried all along
    // and this row ignored — it spelled four German paths (/preise/, /kundenstimmen/,
    // /kontakt, /vouchers) that a studio outside the origin instance may not even have.
    // Rendered only when the studio actually has some: an empty row beats four 404s.
    (Array.isArray(map?.conversionLinks) && map.conversionLinks.length
      ? `<p class="text-gray-700">` + map.conversionLinks
          .filter((l: any) => l && l.href && l.label)
          .map((l: any) => `<a href="${htmlEsc(String(l.href))}" class="underline">${htmlEsc(String(l.label))}</a>`)
          .join(' · ') + `</p>\n`
      : "")
      // Closes the uplink card opened above, and only when it was opened.
      + (pillar ? `</div>\n` : "") +
    `</div>`
  );
}

// Studio name for JSON-LD publisher/author (multi-tenant), cached 5 min.
let _studioNameCache: { value: string; at: number } | null = null;
/**
 * The studio's site language, for the handful of strings this file renders itself.
 *
 * Everything below used to be written in German, because the studio this product grew
 * out of is Viennese. On an English studio's blog that produced "Veröffentlicht am"
 * under every headline and a "Passendes Fotoshooting" call to action beneath it.
 *
 * Cached with the same 5-minute TTL as the name: this runs on the SSR hot path, and a
 * database round trip per blog view to fetch a two-letter string would be absurd.
 */
let _studioLangCache: { value: 'de' | 'en'; at: number } | null = null;
async function getStudioLang(): Promise<'de' | 'en'> {
  if (_studioLangCache && Date.now() - _studioLangCache.at < 300_000) return _studioLangCache.value;
  let lang: 'de' | 'en' = 'en';
  try {
    const { pool } = await import("./db");
    const r = await pool.query('SELECT site_language FROM studio_configs LIMIT 1');
    lang = String(r.rows[0]?.site_language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
  } catch { /* studio_configs may not exist yet — English is the product default */ }
  _studioLangCache = { value: lang, at: Date.now() };
  return lang;
}

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

/**
 * Blocks built from LIVE data rather than from the page's stored content_json.
 *
 * Deliberate: content_json is frozen at generation time, so anything read from it is blank
 * on every pillar page already created and stays blank until that studio regenerates. The
 * Authority Map, voucher_products and studio_configs are all queryable at render time, so
 * a block fed from them improves every existing page on deploy — no regeneration, no
 * migration.
 *
 * Both blocks emit nothing when their data is absent, matching the rule the rest of this
 * function keeps: a section with no content produces no markup, never a heading over a gap.
 */
function pillarExtrasHtml(
  opts: { pillar?: any; products?: any[]; currency?: string; origin?: string } = {},
): string {
  const parts: string[] = [];
  const { pillar, products = [], currency = 'EUR', origin = '' } = opts;
  if (!pillar) return '';

  // 1. PRICE. The commonest question asked of any photographer, and the site could not
  //    answer it: no public page rendered a figure. A studio's own priced, active products
  //    for this service — never an invented number, and never an unpriced starter row.
  const forThisPillar = (products || []).filter((p: any) => {
    const price = Number(p.price) || 0;
    if (price <= 0) return false;
    if (p.is_active === false || p.isActive === false) return false;
    const hay = `${p.category || ''} ${p.name || ''} ${p.slug || ''}`.toLowerCase();
    const label = String(pillar.label || '').toLowerCase();
    // The starter products are created with category = pillar.label, so that is the exact
    // match; the looser checks catch products a studio has since renamed by hand.
    return hay.includes(label) || label.includes(String(p.category || '').toLowerCase());
  });
  if (forThisPillar.length) {
    const cheapest = forThisPillar.reduce(
      (min: any, p: any) => (Number(p.price) < Number(min.price) ? p : min),
      forThisPillar[0],
    );
    const money = (n: any) => {
      try {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(n) || 0);
      } catch {
        return `${Number(n).toFixed(2)} ${currency}`;
      }
    };
    parts.push(`<h2 class="text-2xl font-bold mt-8 mb-3">Pricing</h2>`);
    // A plain sentence before the table: this is the form an assistant quotes when asked
    // what something costs, and a table alone often is not extracted.
    parts.push(
      `<p class="text-gray-700 mb-3">${htmlEsc(String(pillar.label))} starts at ${htmlEsc(money(cheapest.price))}.</p>`,
    );
    parts.push('<ul class="list-disc pl-6 mb-3 text-gray-700">');
    for (const p of forThisPillar.slice(0, 6)) {
      const desc = String(p.description || '').replace(/<[^>]+>/g, '').trim().slice(0, 120);
      parts.push(
        `<li><strong>${htmlEsc(String(p.name))}</strong> — ${htmlEsc(money(p.price))}${desc ? ` · ${htmlEsc(desc)}` : ''}</li>`,
      );
    }
    parts.push('</ul>');
  }

  // 2. INTERNAL LINKS. The Authority Map has carried siblings and clusters per pillar all
  //    along and nothing server-rendered them, so a crawler fetching a pillar page found no
  //    route to the studio's other services or its supporting articles — the topical graph
  //    existed in the database and not in the HTML.
  const links = (arr: any[]) =>
    (Array.isArray(arr) ? arr : [])
      .filter((l: any) => l?.href && l?.label)
      .slice(0, 6)
      .map((l: any) => `<li><a class="underline" href="${htmlEsc(String(l.href))}">${htmlEsc(String(l.label))}</a></li>`)
      .join('');

  const siblingLinks = links(pillar.siblings);
  if (siblingLinks) {
    parts.push(`<h2 class="text-2xl font-bold mt-8 mb-3">Our other services</h2>`);
    parts.push(`<ul class="list-disc pl-6 mb-3 text-gray-700">${siblingLinks}</ul>`);
  }
  const clusterLinks = links(pillar.clusters);
  if (clusterLinks) {
    parts.push(`<h2 class="text-2xl font-bold mt-8 mb-3">Guides &amp; tips</h2>`);
    parts.push(`<ul class="list-disc pl-6 mb-3 text-gray-700">${clusterLinks}</ul>`);
  }

  return parts.join('\n');
}

function lpBodyHtml(page: any, extras = ''): string {
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
    // Server-rendered testimonials are the version a crawler and an LLM actually read, and
    // they were model-invented: landing-generator.ts told it to "generate believable but
    // compelling testimonials if none are provided". Fabricated quotes in crawlable HTML,
    // under a heading hardcoded in German on every studio's page.
    //
    // landing-mapping.ts now strips them before storage, so `c.testimonials` should be
    // empty for anything generated after that change. This second guard is for rows
    // written BEFORE it — a code fix does not rewrite stored JSON, and those pages are
    // live. Real reviews reach the page through the Google Places feed instead.
    const ts: any[] = [];
    if (ts.length) {
      parts.push(`<h2 class="text-2xl font-bold mt-8 mb-3">What our clients say</h2>`);
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
  // Live-data blocks (price, sibling services, supporting guides) sit before the closing
  // link row so a crawler meets the commercial facts and the topical graph in the body,
  // not after the sign-off.
  if (extras) parts.push(extras);
  parts.push(`<p class="mt-8 text-gray-700"><a href="/kontakt" class="underline">Kontakt &amp; Termin anfragen</a> · <a href="/vouchers" class="underline">Gutscheine</a> · <a href="/preise/" class="underline">Preise</a></p>`);
  return `<div class="max-w-3xl mx-auto px-4 py-12">\n${parts.join("\n")}\n</div>`;
}

// Dedicated gutschein pages (index + family/newborn/maternity) are React
// components the build-time prerender never captured with content, so crawlers
// got the empty shell with the homepage title (thin + duplicate-title, SEO
// audit "Category B"). They aren't data-driven, so serve static meta + a
// crawlable body here. Keyed by path without trailing slash.
// Every entry this map ever held was the origin studio's: four hand-written German
// blocks naming New Age Fotografie and a studio in 1050 Wien, with the three child
// routes' prose baked in. They were deleted in the Aug 2026 de-branding along with
// the pages they described; /gutschein/{family,newborn,maternity} now 301 to
// /vouchers via SEO_REDIRECTS.
//
// The map itself stays as the mechanism. A route belongs here only if it is NOT
// data-driven and so the prerender never captures it with content — otherwise
// crawlers get the empty shell carrying the homepage's title (thin + duplicate
// title). Keyed by path without trailing slash.
//
// If anything is added back: it MUST be declared after htmlEsc (a `const` above),
// because a body builder calling htmlEsc is evaluated at module load, and a `const`
// read above its own declaration throws a TDZ ReferenceError at boot. The build
// does not catch that — it crashed the dyno once.
const STATIC_ROUTE_META: Record<string, RouteMeta> = {};

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
  // Cache policy. It was inverted, and that is why a deploy could look like it had not
  // happened.
  //
  // express.static defaults every asset to `Cache-Control: public, max-age=0`, and the
  // HTML catch-all below sent no Cache-Control at all. So:
  //
  //   the FILENAME-HASHED bundles, which can never change under their own name, were
  //   revalidated on every single page load; and
  //
  //   index.html, the one document that MUST be re-fetched after a deploy because it
  //   names those hashes, had no directive — which leaves the browser free to reuse it
  //   heuristically. A returning visitor then keeps loading the OLD chunk hashes, so a
  //   shipped change is invisible to them until a hard refresh, with nothing on screen
  //   to suggest why.
  //
  // Vite emits assets as <name>-<contenthash>.<ext>, so a changed file gets a new URL.
  // That is exactly the case immutable exists for.
  const HASHED = /-[A-Za-z0-9_-]{8,}\.(?:js|css|woff2?|png|jpe?g|webp|avif|svg|gif|ico)$/;
  app.use(express.static(distPath, {
    index: false,
    setHeaders: (res, filePath) => {
      if (HASHED.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return;
      }
      // Unhashed public files (favicon.ico, site.webmanifest, robots.txt, the fonts
      // referenced by a stable name). Cacheable, but only briefly, because replacing one
      // does not change its URL — the favicon that shipped as a 16x5 sliver had to be
      // replaced in place.
      res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
    },
  }));

  // Every HTML response below is per-tenant (it carries %SITE_*% identity stamped in at
  // request time) and names the current asset hashes. It must never be served from cache
  // without asking us first. Set before the handlers run, so whichever send path the
  // catch-all takes inherits it.
  app.use((req, res, next) => {
    if (req.path.startsWith('/assets/') || req.path.startsWith('/api/')) return next();
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    next();
  });

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
  // These shells are built ONCE and held for the life of the process, so anything
  // read from the database has to tell them when it changed or it would never reach
  // a visitor until the next deploy. Worse, the very first request can land before
  // the address cache has loaded, which would pin an empty address permanently.
  // Keying each memo on the address generation fixes both: request #1 may render at
  // version 0, the background load bumps it, and request #2 rebuilds.
  let cachedIndex: string | null = null;
  let cachedIndexVersion = -1;
  const renderedIndex = (): string => {
    // Resolved here, not inside renderIndexHtml, so a database fault degrades to the
    // env-only identity instead of escaping this function — the catch below lands on
    // a raw sendFile of dist/index.html, which serves literal %SITE_*% tokens at 200.
    let studioAddress = null;
    try { studioAddress = peekStudioAddress(); } catch { /* env-only identity */ }
    const version = (() => { try { return addressVersion(); } catch { return 0; } })();
    if (cachedIndex === null || cachedIndexVersion !== version) {
      const raw = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");
      let html = renderIndexHtml(raw, studioAddress);
      try {
        // Prefer the studio's OWN name over the env one, matching what
        // renderIndexHtml just stamped — otherwise the placeholder baked into the
        // prerendered body is replaced with a different business to the one in the
        // <title> two lines above it.
        const name = (process.env.BUSINESS_NAME || '').trim() || studioAddress?.name || getSiteIdentity().name;
        if (name && name !== "My Studio") html = html.split("My Studio").join(name);
      } catch { /* identity unavailable — serve as-is */ }
      cachedIndex = html;
      cachedIndexVersion = version;
    }
    return cachedIndex;
  };

  // Shell with the prerendered homepage body stripped — for any route that
  // isn't the homepage itself (prevents the homepage-content flash).
  let cachedEmptyShell: string | null = null;
  let cachedEmptyShellVersion = -1;
  const emptiedShell = (): string => {
    const version = (() => { try { return addressVersion(); } catch { return 0; } })();
    if (cachedEmptyShell === null || cachedEmptyShellVersion !== version) {
      cachedEmptyShell = emptyHydrationRoot(renderedIndex());
      cachedEmptyShellVersion = version;
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
    // …plus the studio's own pillar paths, which are data-driven in exactly the same way
    // but cannot be expressed as a static pattern.
    if (/^\/(blog|gutschein|lp)\//.test(requestPath) || await isPillarPath(requestPath)) {
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
        // Keyed by the address generation as well as the path: this Map is never
        // cleared, so a studio saving its city would otherwise never reach these
        // snapshots for the life of the process.
        const version = (() => { try { return addressVersion(); } catch { return 0; } })();
        const cacheKey = `${version}:${prerenderedHtmlPath}`;
        let html = prerenderedCache.get(cacheKey);
        if (html === undefined) {
          html = fs.readFileSync(prerenderedHtmlPath, "utf-8");
          // Fill any %SITE_*% placeholders the prerender snapshot carried
          // through (the prerender browser sees the raw template), then stamp
          // the tenant name over the env-less "My Studio" fallback.
          let studioAddress = null;
          try { studioAddress = peekStudioAddress(); } catch { /* env-only identity */ }
          html = renderIndexHtml(html, studioAddress);
          const name = (process.env.BUSINESS_NAME || '').trim() || studioAddress?.name || getSiteIdentity().name;
          if (name && name !== "My Studio") {
            html = html.split("My Studio").join(name);
          }
          prerenderedCache.set(cacheKey, html);
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
