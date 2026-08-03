// Central, per-tenant site identity for the client.
//
// The server injects the tenant's identity into index.html as
// `window.__SITE_CONFIG__` (see server/lib/siteIdentity.ts), assembled from env
// vars / studio_config. This module reads that global once at load and exposes a
// typed `SITE` object with neutral fallbacks, so visitor-facing chrome (Footer,
// Header, SEO defaults, contact blocks) renders the tenant's brand with no flash
// and no business name hardcoded in source.

export interface SiteConfig {
  name: string;
  url: string; // canonical origin, no trailing slash
  email: string;
  phone: string;
  logo: string;
  locale: string; // e.g. "de_AT"
  lang: string; // e.g. "de"
  address: { street: string; city: string; postalCode: string; country: string };
  social: string[];
}

const injected: Partial<SiteConfig> =
  (typeof window !== 'undefined' && (window as any).__SITE_CONFIG__) || {};

export const SITE: SiteConfig = {
  name: injected.name || 'My Studio',
  url: (injected.url || '').replace(/\/+$/, ''),
  email: injected.email || '',
  phone: injected.phone || '',
  logo: injected.logo || '',
  locale: injected.locale || 'de_AT',
  lang: injected.lang || 'de',
  address: {
    street: injected.address?.street || '',
    city: injected.address?.city || '',
    postalCode: injected.address?.postalCode || '',
    country: injected.address?.country || '',
  },
  social: injected.social || [],
};

// Convenience: the studio name, always non-empty.
export const SITE_NAME = SITE.name;
// Convenience: absolute URL for a path on the tenant's site (e.g. siteUrl('/blog')).
export const siteUrl = (pathname = ''): string =>
  `${SITE.url}${pathname.startsWith('/') || pathname === '' ? pathname : `/${pathname}`}`;
