// Landing Page Canonical URL Builder — Phase 4

import { buildPublicLandingPageUrl } from './landingPagePublicRoute';

interface CanonicalInput {
  slug: string;
  siteBaseUrl: string;
  canonicalOverride?: string | null;
  isPreview?: boolean;
  isPublished?: boolean;
}

/**
 * Build canonical URL for a landing page.
 * - Published pages: full canonical URL
 * - Preview of published page: canonical still points to live URL
 * - Preview of draft: no canonical
 */
export function buildLandingPageCanonical(input: CanonicalInput): string | null {
  // Explicit override wins
  if (input.canonicalOverride) {
    return input.canonicalOverride;
  }

  // Draft-only preview — no canonical
  if (input.isPreview && !input.isPublished) {
    return null;
  }

  // Published pages (including preview of published) get a canonical
  if (input.isPublished || !input.isPreview) {
    return buildPublicLandingPageUrl(input.slug, input.siteBaseUrl);
  }

  return null;
}
