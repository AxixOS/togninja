import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { SITE } from '../../config/site';
import { getAlternates } from '../../config/localeRoutes';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  hreflang?: Array<{
    lang: string;
    url: string;
  }>;
}

export function SEOHead({
  title,
  description,
  keywords,
  canonical,
  ogImage = `${SITE.url}/og-default.jpg`,
  ogType = 'website',
  noindex = false,
  hreflang = []
}: SEOProps) {
  const location = useLocation();

  // Always build ABSOLUTE URLs. Fall back to the canonical origin when the
  // per-tenant config hasn't populated SITE.url yet (e.g. during the build-time
  // prerender) — otherwise canonical/og:image render as RELATIVE paths and every
  // social share gets no preview image (the single highest-impact SEO bug).
  const origin = (SITE.url || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/+$/, '');
  const abs = (u?: string): string | undefined => {
    if (!u) return undefined;
    if (/^https?:\/\//i.test(u)) return u;
    return `${origin}${u.startsWith('/') ? '' : '/'}${u}`;
  };
  // Canonical URL convention: WITH trailing slash (root and file paths excepted),
  // so /preise and /preise/ consolidate to one canonical form.
  const withSlash = (p: string): string => {
    if (!p || p === '/') return '/';
    const path = p.split(/[?#]/)[0];
    if (/\.[a-z0-9]+$/i.test(path)) return path; // has a file extension
    return path.endsWith('/') ? path : `${path}/`;
  };

  // Pages that have a real, reciprocal English URL (config/localeRoutes.ts) get
  // an accurate self-canonical + de/en/x-default hreflang derived from the CURRENT
  // path — so the German and English versions each point to themselves and cross-
  // reference each other correctly.
  const alt = getAlternates(location.pathname);

  // Canonical on every page: mapped canonical → passed prop → current path,
  // always normalised to the trailing-slash convention.
  const fullCanonical = `${origin}${withSlash(alt ? alt.canonical : (canonical || location.pathname))}`;

  const ogImageAbs = abs(ogImage) || `${origin}/og-default.jpg`;

  // For unmapped pages, keep the previous safeguard: drop `/en/...` alternates
  // that don't correspond to a real route (they'd be soft-404s), and only emit
  // hreflang when ≥2 valid reciprocal URLs remain.
  const validHreflang = hreflang.filter(
    (l) => l.lang.toLowerCase() !== 'en' && !/^\/en(\/|$)/.test(l.url),
  );
  const hreflangToRender = alt ? alt.hreflang : (validHreflang.length >= 2 ? validHreflang : []);

  // Build the LocalBusiness structured data from the tenant's identity,
  // omitting any fields that aren't configured yet.
  const hasAddress =
    SITE.address.street || SITE.address.city || SITE.address.postalCode || SITE.address.country;
  const structuredData: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: SITE.name,
    image: ogImageAbs,
    '@id': origin,
    url: origin,
    priceRange: '€€',
  };
  if (SITE.phone) structuredData.telephone = SITE.phone;
  if (SITE.email) structuredData.email = SITE.email;
  if (hasAddress) {
    structuredData.address = {
      '@type': 'PostalAddress',
      ...(SITE.address.street ? { streetAddress: SITE.address.street } : {}),
      ...(SITE.address.city ? { addressLocality: SITE.address.city } : {}),
      ...(SITE.address.postalCode ? { postalCode: SITE.address.postalCode } : {}),
      ...(SITE.address.country ? { addressCountry: SITE.address.country } : {}),
    };
  }
  if (SITE.social.length) structuredData.sameAs = SITE.social;

  return (
    <Helmet>
      {/* Primary Meta Tags (no legacy meta keywords / duplicate meta title) */}
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Robots — allow large image thumbnails in search (matters for a photographer) */}
      <meta
        name="robots"
        content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}
      />

      {/* Canonical (absolute, on every page) */}
      <link rel="canonical" href={fullCanonical} />

      {/* Open Graph / Facebook — all URLs absolute */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:image" content={ogImageAbs} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:locale" content={SITE.locale} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageAbs} />

      {/* Hreflang for multilingual (only real, reciprocal URLs — see note above) */}
      {hreflangToRender.map((link) => (
        <link
          key={link.lang}
          rel="alternate"
          hrefLang={link.lang}
          href={`${origin}${withSlash(link.url)}`}
        />
      ))}

      {/* Structured Data - Local Business (per-tenant) */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}
