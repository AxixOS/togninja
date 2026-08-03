// Landing Page Public Route Helpers — Phase 4

const LP_BASE_PATH = '/lp';

/** Build a relative public path for a landing page */
export function buildPublicLandingPagePath(slug: string): string {
  return `${LP_BASE_PATH}/${slug}`;
}

/** Build a full absolute public URL for a landing page */
export function buildPublicLandingPageUrl(slug: string, siteBaseUrl: string): string {
  const base = siteBaseUrl.replace(/\/+$/, '');
  return `${base}${LP_BASE_PATH}/${slug}`;
}

/** Normalize a slug for public route matching (lowercase, trim slashes) */
export function normalizePublicSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}
