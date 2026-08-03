import type { LandingPageRecord } from '../types/landingPage.types';
import type { LandingPagePublishReadinessResult, LandingPageSectionKey } from '../types/landingPageEditor.types';
import type { LandingPageGeneratedContent } from '../types/landingPageGeneration.types';
import { normalizeLandingPageContent } from './normalizeLandingPageContent';
import { validateSlugFormat } from './landingPageEditor.schema';
import { LANDING_PAGE_SECTION_DEFINITIONS } from './landingPageSections';

export function evaluateLandingPagePublishReadiness(page: LandingPageRecord): LandingPagePublishReadinessResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const completedChecks: string[] = [];
  const missingCriticalSections: string[] = [];

  const { content, meta } = normalizeLandingPageContent(page.content_json as Record<string, unknown>);

  // Title
  if (!page.title?.trim()) {
    errors.push('Page title is missing');
  } else {
    completedChecks.push('Page title is set');
  }

  // Slug
  if (!page.slug?.trim()) {
    errors.push('URL slug is missing');
  } else {
    const slugResult = validateSlugFormat(page.slug);
    if (!slugResult.valid) {
      errors.push(`Slug issue: ${slugResult.error}`);
    } else {
      completedChecks.push('URL slug is valid');
    }
  }

  // Hero
  if (!content.hero?.headline?.trim() || content.hero.headline === 'Your Headline') {
    errors.push('Hero headline is missing');
    missingCriticalSections.push('hero');
  } else {
    completedChecks.push('Hero headline is set');
  }

  if (!content.hero?.primaryCtaText?.trim()) {
    errors.push('Hero CTA text is missing');
  } else {
    completedChecks.push('Hero CTA text is set');
  }

  if (!content.hero?.subheadline?.trim()) {
    warnings.push('Hero subheadline is recommended');
  }

  // SEO
  const seoTitle = content.seo?.seoTitle || page.seo_title;
  if (!seoTitle?.trim()) {
    errors.push('SEO title is missing');
    missingCriticalSections.push('seo');
  } else {
    completedChecks.push('SEO title is set');
    if (seoTitle.length > 60) warnings.push('SEO title exceeds 60 characters');
  }

  const metaDesc = content.seo?.metaDescription || page.meta_description;
  if (!metaDesc?.trim()) {
    errors.push('Meta description is missing');
  } else {
    completedChecks.push('Meta description is set');
    if (metaDesc.length > 160) warnings.push('Meta description exceeds 160 characters');
  }

  // Final CTA
  if (!content.finalCta?.primaryCtaText?.trim()) {
    warnings.push('Final CTA section is recommended');
  } else {
    completedChecks.push('Final CTA is set');
  }

  // Check critical sections are visible
  for (const def of LANDING_PAGE_SECTION_DEFINITIONS) {
    if (def.criticalForPublish && meta.sectionVisibility[def.key] === false) {
      warnings.push(`Critical section "${def.label}" is hidden`);
    }
  }

  // Check content_json is not empty
  if (!content.hero && !content.offerSection && !content.finalCta) {
    errors.push('Page has no generated content');
  }

  return {
    isReady: errors.length === 0,
    errors,
    warnings,
    completedChecks,
    missingCriticalSections,
  };
}
