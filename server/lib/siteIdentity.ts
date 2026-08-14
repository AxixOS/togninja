// Central per-tenant site identity.
//
// Assembled from environment variables with NEUTRAL fallbacks (never a specific
// business). Used in two places:
//   1. Injected into index.html at serve time — <title>, OG/Twitter tags, the
//      JSON-LD LocalBusiness block, optional analytics — so crawlers see the
//      tenant's brand, not a hardcoded one.
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

/**
 * Replace the %SITE_*% placeholders in an index.html template with the current
 * tenant identity. Safe to run on any HTML string; unknown placeholders are left
 * untouched and a template with no placeholders is returned unchanged.
 */
export function renderIndexHtml(template: string, studioAddress?: { name?: string; street?: string; city?: string; postalCode?: string } | null): string {
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
        // The studio's own name beats the neutral placeholder, but NOT an explicit
        // BUSINESS_NAME: an operator override stays authoritative, same rule as the
        // address below. Without this a buyer completed onboarding and every page
        // title, og:site_name and JSON-LD still named whatever the deploy env said —
        // which on a reused instance is the previous tenant, and on a fresh one is
        // "My Studio". The name was in the database the whole time.
        name: env('BUSINESS_NAME') || studioAddress.name || base.name,
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
  return out;
}
