// Central per-tenant site identity.
//
// Assembled from environment variables with NEUTRAL fallbacks (never a specific
// business). Used in two places:
//   1. Injected into index.html at serve time — <title>, OG/Twitter tags, the
//      JSON-LD LocalBusiness block, optional analytics, and the browser tab icon
//      — so crawlers and the tab strip see the tenant's brand, not a hardcoded one.
//   2. Exposed to the SPA as `window.__SITE_CONFIG__` so React chrome (Footer,
//      Header, SEO defaults) renders the tenant's identity with no flash.
//
// A blank/unconfigured instance simply omits the fields it doesn't have yet
// (empty address → no PostalAddress in JSON-LD, no GA id → no analytics script).
// A tenant is branded purely by setting env vars — no source edits.

export interface SiteIdentity {
  name: string;
  url: string;          // canonical origin, no trailing slash
  locale: string;       // og:locale, e.g. "de_AT"
  lang: string;         // <html lang>, e.g. "de"
  description: string;
  email: string;
  phone: string;
  logo: string;         // absolute or root-relative logo URL
  ogImage: string;      // social share image
  gaId: string;         // GA4 measurement id, "" to disable
  address: { street: string; city: string; postalCode: string; country: string };
  geo: { lat: string; lng: string };
  social: string[];     // schema.org sameAs
}

function env(name: string): string {
  return (process.env[name] || '').trim();
}

/**
 * True when this env var was copied out of studio_configs at boot by
 * config-reader's hydrateEnvFromDb, rather than set by an operator.
 *
 * The distinction is not academic. A studio that renames itself — or a demo
 * instance re-onboarded onto a different business — writes the new name to
 * studio_configs, but BUSINESS_NAME still holds the boot-time copy of the old
 * row, and every server-rendered page keeps announcing the previous owner. Read
 * from env rather than importing config-reader on purpose: this module has no
 * imports, which is what lets renderIndexHtml stay safe to call from the fatal
 * fallback path where a DB read must not be attempted.
 */
function isBootSnapshot(name: string): boolean {
  return (process.env.CONFIG_HYDRATED_ENV_KEYS || '').split(',').includes(name);
}

export function getSiteIdentity(): SiteIdentity {
  // Same candidate order server/vite.ts uses for sitemap <loc>s and injected
  // canonicals. The two chains had diverged — this one stopped at APP_URL, that one
  // continued to SITE_URL and RENDER_EXTERNAL_URL — so on any instance without
  // PUBLIC_SITE_URL set, the client-rendered canonical and the server-injected one
  // named different origins for the same page.
  const url = (
    env('PUBLIC_SITE_URL') || env('APP_URL') || env('SITE_URL') || env('RENDER_EXTERNAL_URL') || ''
  ).replace(/\/+$/, '');
  // Neutral default (was the NAF-specific de_AT). A studio sets SITE_LOCALE — or, once
  // onboarding captures it, the studio's country — to localise; the product default is
  // English so a non-German studio (e.g. a UK studio) isn't pushed into German.
  const locale = env('SITE_LOCALE') || 'en_US';
  return {
    name: env('BUSINESS_NAME') || 'My Studio',
    url,
    locale,
    lang: env('SITE_LANG') || locale.split(/[_-]/)[0] || 'en',
    description: env('BUSINESS_DESCRIPTION'),
    email: env('CONTACT_EMAIL') || env('SMTP_FROM'),
    phone: env('BUSINESS_PHONE'),
    logo: env('LOGO_URL'),
    ogImage: env('OG_IMAGE_URL') || `${url}/og-cover.jpg`,
    gaId: env('GA_MEASUREMENT_ID'),
    address: {
      street: env('BUSINESS_STREET'),
      city: env('BUSINESS_CITY'),
      postalCode: env('BUSINESS_POSTAL_CODE'),
      country: env('BUSINESS_COUNTRY'),
    },
    geo: { lat: env('BUSINESS_GEO_LAT'), lng: env('BUSINESS_GEO_LNG') },
    social: env('SOCIAL_LINKS').split(',').map((s) => s.trim()).filter(Boolean),
  };
}

// Escape a value for safe interpolation into an HTML attribute / text node.
function htmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Escape a JSON string for safe embedding inside a <script> element (prevents a
// value containing "</script>" or "<!--" from breaking out of the tag).
function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function buildJsonLd(id: SiteIdentity): string {
  const node: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'PhotoStudio',
    name: id.name,
    '@id': id.url,
    url: id.url,
  };
  if (id.logo) node.image = id.logo.startsWith('http') ? id.logo : `${id.url}${id.logo}`;
  if (id.phone) node.telephone = id.phone;
  if (id.email) node.email = id.email;
  if (id.description) node.description = id.description;
  // A locality on its own is a SERVICE AREA, not an address.
  //
  // This gate was `street || city || postalCode || country`, so a studio that told us
  // only its city published a PostalAddress — a positive claim to a physical business
  // location — on every page. Plenty of photographers travel to their clients or work
  // from home; for them that claim is false, and it is not one they would ever make
  // themselves. It is the same reasoning that already stops geo being sourced from the
  // setup address a few lines down.
  //
  // A street is what distinguishes premises from a patch of the map. With one, the
  // address is real and the locality belongs inside it. Without one, the city says
  // where the studio WORKS, which is exactly what areaServed means.
  const hasPremises = !!id.address.street;
  if (hasPremises) {
    node.address = {
      '@type': 'PostalAddress',
      streetAddress: id.address.street,
      ...(id.address.city ? { addressLocality: id.address.city } : {}),
      ...(id.address.postalCode ? { postalCode: id.address.postalCode } : {}),
      ...(id.address.country ? { addressCountry: id.address.country } : {}),
    };
  }
  // Emitted as an ARRAY even with a single entry. schema.org accepts either, and a
  // studio covering several places is the common case, not the exception — the demo
  // tenant is a UK-wide wedding company that had been narrowed to one city. Keeping
  // the shape plural means adding the rest later is a data change, not a schema one.
  if (id.address.city) {
    node.areaServed = [{ '@type': 'City', name: id.address.city }];
  }
  if (id.geo.lat && id.geo.lng) {
    node.geo = { '@type': 'GeoCoordinates', latitude: id.geo.lat, longitude: id.geo.lng };
  }
  if (id.social.length) node.sameAs = id.social;
  return jsonForScript(node);
}

// Client-facing subset exposed as window.__SITE_CONFIG__.
function clientConfig(id: SiteIdentity) {
  return {
    name: id.name,
    url: id.url,
    email: id.email,
    phone: id.phone,
    logo: id.logo,
    locale: id.locale,
    lang: id.lang,
    address: id.address,
    social: id.social,
  };
}

// ── Per-tenant tab icon ─────────────────────────────────────────────────────
//
// The icon links live inside a MARKED REGION of client/index.html rather than
// behind one more %SITE_*% token, because the tenant case has to REPLACE the
// product icons, not sit beside them. A studio that declared both /favicon.svg
// (the TogNinja mark) and its own logo would get whichever the browser scored
// higher, and Chrome, Firefox and Safari all score them differently. Swapping
// the whole region is the only way to be certain which one a visitor sees.
//
// Leaving the region untouched is also the right default for the three paths
// that never reach this function: the dev server (server/vite.ts serves the raw
// template through vite.transformIndexHtml), the build-time prerender, and the
// catch-all's fatal-fallback sendFile. All three are unbranded contexts, and all
// three then serve the product icons, which is correct.
const FAVICON_OPEN = '<!--%SITE_FAVICON%-->';
const FAVICON_CLOSE = '<!--/%SITE_FAVICON%-->';

/**
 * Short stable digest of the logo URL, used as the ?v= cache buster.
 *
 * FNV-1a rather than node:crypto deliberately: this module imports nothing, and
 * that is what keeps renderIndexHtml safe to call from the fatal fallback path.
 * A tab icon needs a different string when the studio uploads a different logo,
 * not a cryptographic one — /brand-icon.png is served immutable for a day.
 *
 * Exported so server/routes/site-icons.ts derives the SAME value for its ETag as
 * the ?v= it is being asked for. Two hashes that can drift is a cache that lies.
 */
export function shortHash(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * The studio's own icon links, or null to keep the product ones.
 *
 * Every href points at /brand-icon.png (server/routes/site-icons.ts), never at
 * the stored logo URL: the stored file is whatever the studio happened to upload
 * — the demo row is a 500x472 WebP on a Supabase bucket. Safari will not render a
 * WebP favicon, a raw remote href turns every page load into a third-party request
 * from the studio's own domain, and a non-square source scaled to a target WIDTH is
 * exactly the sliver that made the shipped icons blank. The route squares it and
 * re-encodes to PNG on our own origin.
 *
 * No SVG link in this branch: /favicon.svg IS the TogNinja mark, and a browser that
 * prefers SVG would show it instead of the studio's logo.
 */
function tenantFaviconLinks(id: SiteIdentity, eol: string): string | null {
  const logo = (id.logo || '').trim();
  if (!logo) return null;
  const v = shortHash(logo);
  const href = (extra: string) => htmlEscape(`/brand-icon.png?v=${v}${extra}`);
  return [
    `<link rel="icon" href="${href('')}" sizes="any" type="image/png">`,
    `<link rel="icon" href="${href('&s=32')}" sizes="32x32" type="image/png">`,
    `<link rel="apple-touch-icon" href="${href('&s=180&flat=1')}">`,
  ].join(`${eol}    `);
}

/**
 * Swap the marked icon region for `block`, or strip just the markers when it is
 * null. indexOf/slice rather than String.replace because a `$&` or `$$` arriving
 * through a logo URL would be read as a backreference in the replacement.
 *
 * A template WITHOUT the markers comes back untouched. That is the safe
 * degradation — the product icons stay and a tenant's icon is merely missed. The
 * alternative, appending the tenant links wherever <head> can be found, would emit
 * two competing icon sets: the exact failure the region exists to prevent.
 */
function applyFaviconRegion(html: string, block: string | null): string {
  const start = html.indexOf(FAVICON_OPEN);
  if (start < 0) return html;
  const end = html.indexOf(FAVICON_CLOSE, start);
  if (end < 0) return html;
  const inner = html.slice(start + FAVICON_OPEN.length, end);
  const replacement = block === null ? inner.trim() : block;
  return html.slice(0, start) + replacement + html.slice(end + FAVICON_CLOSE.length);
}

/**
 * Replace the %SITE_*% placeholders in an index.html template with the current
 * tenant identity. Safe to run on any HTML string; unknown placeholders are left
 * untouched and a template with no placeholders is returned unchanged.
 */
export function renderIndexHtml(
  template: string,
  studioAddress?: { name?: string; street?: string; city?: string; postalCode?: string; logo?: string } | null,
): string {
  const base = getSiteIdentity();
  // The studio's stored address, overlaid on the env-derived identity.
  //
  // Resolved by the CALLER (server/vite.ts) rather than read here, deliberately:
  // getSiteIdentity() is a pure process.env read that cannot throw, and this function
  // is called outside a try on the hot serve path. A DB read in here would turn a
  // transient database fault into an untokenised HTML shell — literal %SITE_JSONLD%
  // inside a JSON-LD script, no window.__SITE_CONFIG__ — served with HTTP 200 on
  // every route. Passing a snapshot in keeps that path failing closed to env-only.
  //
  // Env wins per field, so an operator override in the deploy environment stays
  // authoritative and matches what /api/studio-config reports.
  //
  // NOT sourced from the studio record, on purpose:
  //   country — shared/schema.ts defaults it to "Austria" and nothing writes it, so
  //     reading it would stamp addressCountry: Austria onto a Brighton studio: a new
  //     de-localisation bug wearing a fix's clothes.
  //   geo — latitude/longitude are filled from a Google Maps link during setup, which
  //     for a home-based photographer is a home address. Publishing GeoCoordinates on
  //     every page is a decision for the studio, not a side effect of adding a city.
  const id: SiteIdentity = studioAddress
    ? {
        ...base,
        // The studio's own name beats the neutral placeholder, and it also beats a
        // BUSINESS_NAME that config-reader copied out of this same table at boot —
        // otherwise a stale snapshot outranks the row it was copied from, and a
        // studio that renames itself sees nothing until the service restarts. An
        // operator who actually set BUSINESS_NAME on the deployment still wins.
        // Observed live: after re-onboarding the demo, studio_configs said "DM
        // Photography" and all eight rendered routes said "Big Day Productions".
        name: (isBootSnapshot('BUSINESS_NAME') ? (studioAddress.name || env('BUSINESS_NAME'))
                                               : (env('BUSINESS_NAME') || studioAddress.name))
              || base.name,
        // The studio's uploaded logo. Drives the per-tenant tab icon below and the
        // JSON-LD `image` property, which until now could never be emitted at all:
        // logo_url has a DB_FIELD_MAP entry in config-reader but NO ENV_MAP entry, so
        // hydrateEnvFromDb skips it and LOGO_URL is never set from the row. Plain
        // env-wins, with no isBootSnapshot() dance, precisely because of that — there
        // is no boot copy of this value that could outrank the row it came from.
        logo: base.logo || (studioAddress.logo || '').trim(),
        address: {
          street: base.address.street || (studioAddress.street || ''),
          city: base.address.city || (studioAddress.city || ''),
          postalCode: base.address.postalCode || (studioAddress.postalCode || ''),
          country: base.address.country,
        },
      }
    : base;
  const ga = id.gaId
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id.gaId)}"></script>\n` +
      `    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(id.gaId)});</script>`
    : '';
  const replacements: Record<string, string> = {
    '%SITE_NAME%': htmlEscape(id.name),
    '%SITE_URL%': htmlEscape(id.url),
    '%SITE_LANG%': htmlEscape(id.lang),
    '%SITE_LOCALE%': htmlEscape(id.locale),
    '%SITE_DESCRIPTION%': htmlEscape(id.description),
    '%SITE_OG_IMAGE%': htmlEscape(id.ogImage),
    '%SITE_GA%': ga,
    '%SITE_JSONLD%': buildJsonLd(id),
    '%SITE_CONFIG_JSON%': jsonForScript(clientConfig(id)),
  };
  let out = template;
  for (const [token, value] of Object.entries(replacements)) {
    out = out.split(token).join(value);
  }
  // A region, not a token — see applyFaviconRegion. The EOL is detected from the
  // template because client/index.html is CRLF while the prerendered snapshots that
  // also flow through here are not; emitting the wrong one mixes line endings into
  // a file the next patch script will try to match against.
  const eol = out.includes('\r\n') ? '\r\n' : '\n';
  out = applyFaviconRegion(out, tenantFaviconLinks(id, eol));
  return out;
}
