import type { LandingPageSeoState } from '../types/landingPageEditor.types';

// ── Slug Validation ──────────────────────────────────────────────

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlugFormat(slug: string): { valid: boolean; error: string | null } {
  if (!slug) return { valid: false, error: 'Slug is required' };
  if (slug.length > 120) return { valid: false, error: 'Slug must be 120 characters or fewer' };
  if (!SLUG_REGEX.test(slug)) return { valid: false, error: 'Slug must contain only lowercase letters, numbers, and hyphens' };
  return { valid: true, error: null };
}

// ── SEO Validation ───────────────────────────────────────────────

export function validateSeo(seo: LandingPageSeoState): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!seo.seoTitle?.trim()) errors.push('SEO title is required');
  else if (seo.seoTitle.length > 60) warnings.push('SEO title is over 60 characters');

  if (!seo.metaDescription?.trim()) errors.push('Meta description is required');
  else if (seo.metaDescription.length > 160) warnings.push('Meta description is over 160 characters');

  if (!seo.slug?.trim()) errors.push('Slug is required');
  else {
    const slugCheck = validateSlugFormat(seo.slug);
    if (!slugCheck.valid && slugCheck.error) errors.push(slugCheck.error);
  }

  if (!seo.keyphrase?.trim()) warnings.push('Focus keyphrase is recommended');

  return { errors, warnings };
}

// ── Title Validation ─────────────────────────────────────────────

export function validateTitle(title: string): { valid: boolean; error: string | null } {
  if (!title?.trim()) return { valid: false, error: 'Title is required' };
  if (title.length > 200) return { valid: false, error: 'Title must be 200 characters or fewer' };
  return { valid: true, error: null };
}
