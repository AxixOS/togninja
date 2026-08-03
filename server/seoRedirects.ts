import type { Request, Response, NextFunction } from "express";

/**
 * 301 redirects for pruned thin blog posts → the most relevant pillar/cluster.
 *
 * These six posts are ~150-word stubs that can't rank and dilute topical focus.
 * Rather than delete (which leaves 404s), we 301 them so any indexed URL or
 * inbound link passes its authority up to a strong page. One stub
 * (outfit-fotoshooting-tipps) is consolidated into its stronger sibling article.
 *
 * Key = request path WITHOUT trailing slash. Edit freely as content is pruned;
 * remove an entry to "un-redirect" a post. Also unpublish these in the admin
 * blog manager so they stop appearing in the /blog index.
 */
export const SEO_REDIRECTS: Record<string, string> = {
  "/blog/wandbild-fallstudie-wohnzimmer": "/familienfotos-wien/",
  "/blog/gute-retusche-vs-ueberretusche": "/studio-fotografie-wien/",
  "/blog/outfit-fotoshooting-tipps": "/blog/die-besten-outfits-fuer-familienfotos-in-wien",
  "/blog/warum-familienfotos-wertvoller-werden": "/familienfotos-wien/",
  "/blog/mehrgenerationen-familienfotos-fallstudie": "/familienfotos-wien/",
  "/blog/wer-kann-beim-fotoshooting-dabei-sein": "/familienfotos-wien/",

  // July 2026 SEO audit: duplicate pages splitting authority + dead routes.
  // Duplicate real-estate page (non-hyphenated variant was never a real route
  // component; all authority belongs on the hyphenated cornerstone page).
  "/immobilienfotografie-wien": "/immobilien-fotografie-wien/",
  // Duplicate pricing page: /preise has ~22 internal inbound links vs 4 —
  // consolidate on /preise so one pricing page ranks instead of neither.
  "/fotoshooting-preise-wien": "/preise/",
  // Dead routes that were linked internally but never defined in the router —
  // crawlers saw the SPA shell with the homepage's title (duplicate-title set).
  "/termin-planen": "/warteliste",
  "/paar-fotoshooting-wien": "/portrait-fotografie-wien/",
  // /galerie renders the SAME component as /galleries — a duplicate that only
  // served the empty shell (homepage title) to crawlers. Consolidate on the
  // prerendered /galleries page.
  "/galerie": "/galleries",
};

export function seoRedirects(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "GET" && req.method !== "HEAD") return next();

  // 1) Curated pruned-content redirects.
  const path = req.path.replace(/\/+$/, "") || "/";
  const target = SEO_REDIRECTS[path];
  if (target) return res.redirect(301, target);

  // 2) Canonical URL convention: 301 to the trailing-slash form. Skip the root,
  //    API routes, and any path with a file extension (assets, sitemap.xml, the
  //    IndexNow key .txt, etc.). Preserves the query string. Runs before the
  //    static/SPA handlers so it never loops.
  const raw = req.path;
  // Data-driven detail routes canonicalise WITHOUT a trailing slash (their
  // canonical tags + sitemap entries are slash-less), so never add one to them.
  const noSlashDetail = /^\/(blog|gutschein|lp)\/.+/.test(raw);
  if (
    raw !== "/" &&
    !raw.endsWith("/") &&
    !raw.startsWith("/api") &&
    !noSlashDetail &&
    !/\.[a-z0-9]+$/i.test(raw)
  ) {
    const qIdx = req.originalUrl.indexOf("?");
    const query = qIdx >= 0 ? req.originalUrl.slice(qIdx) : "";
    return res.redirect(301, `${raw}/${query}`);
  }

  next();
}
