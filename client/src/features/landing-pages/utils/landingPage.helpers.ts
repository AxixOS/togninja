import type { LandingPageStatus, LandingPageRecord, LandingPageListItem } from '../types/landingPage.types';

/** Convert a title to a URL-safe slug */
export function slugifyLandingPageTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

/** Human-readable status label */
export function formatLandingPageStatus(status: LandingPageStatus): string {
  const labels: Record<LandingPageStatus, string> = {
    draft: 'Draft',
    published: 'Published',
    archived: 'Archived',
  };
  return labels[status] ?? status;
}

/** Map status to a badge tone for design system */
export function getLandingPageStatusTone(status: LandingPageStatus): 'default' | 'success' | 'warning' | 'muted' {
  switch (status) {
    case 'published': return 'success';
    case 'draft': return 'warning';
    case 'archived': return 'muted';
    default: return 'default';
  }
}

/** Build the full public URL for a landing page */
export function buildLandingPagePublishedUrl(slug: string, basePath = '/lp'): string {
  return `${basePath}/${slug}`;
}

/** Get a display title, falling back to slug or 'Untitled' */
export function getLandingPageDisplayTitle(page: Pick<LandingPageRecord, 'title' | 'slug'>): string {
  return page.title || page.slug || 'Untitled Landing Page';
}

/** Map a full record to a slimmed-down list item */
export function mapLandingPageToListItem(page: LandingPageRecord): LandingPageListItem {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    status: page.status,
    page_type: page.page_type,
    primary_service: page.primary_service,
    target_audience: page.target_audience,
    city: page.city,
    hero_headline: page.hero_headline,
    updated_at: page.updated_at,
    published_at: page.published_at,
  };
}
