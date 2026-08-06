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
  const url = (env('PUBLIC_SITE_URL') || env('APP_URL') || '').replace(/\/+$/, '');
  const locale = env('SITE_LOCALE') || 'de_AT';
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
  const hasAddress = id.address.street || id.address.city || id.address.postalCode || id.address.country;
  if (hasAddress) {
    node.address = {
      '@type': 'PostalAddress',
      ...(id.address.street ? { streetAddress: id.address.street } : {}),
      ...(id.address.city ? { addressLocality: id.address.city } : {}),
      ...(id.address.postalCode ? { postalCode: id.address.postalCode } : {}),
      ...(id.address.country ? { addressCountry: id.address.country } : {}),
    };
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
export function renderIndexHtml(template: string): string {
  const id = getSiteIdentity();
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
