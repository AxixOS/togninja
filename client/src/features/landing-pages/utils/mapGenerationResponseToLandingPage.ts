import type {
  GenerateLandingPageResponse,
  LandingPageWizardFormValues,
} from '../types/landingPageGeneration.types';
import type { UpdateLandingPageInput } from '../types/landingPage.types';
import { slugifyLandingPageTitle } from './landingPage.helpers';

/**
 * Map the AI generation response + original form values into a
 * landing_pages DB record payload ready for persistence.
 *
 * Does NOT persist directly — returns normalised data for the service layer.
 */
export function mapGenerationResponseToLandingPage(
  generated: GenerateLandingPageResponse,
  formValues: LandingPageWizardFormValues
): UpdateLandingPageInput & {
  content_json: Record<string, unknown>;
  generation_context_json: Record<string, unknown>;
  generation_prompt_json: Record<string, unknown>;
} {
  const heroHeadline =
    generated.content?.hero?.headline ?? generated.title ?? '';
  const heroSubheadline =
    generated.content?.hero?.subheadline ?? '';
  const ctaText =
    generated.content?.hero?.primaryCtaText ??
    generated.content?.finalCta?.primaryCtaText ??
    formValues.primaryCta ??
    'Book Now';
  const seoTitle =
    generated.content?.seo?.seoTitle ?? generated.title ?? '';
  const metaDescription =
    generated.content?.seo?.metaDescription ?? '';
  const slugSuggestion =
    generated.content?.seo?.suggestedSlug ??
    generated.slugSuggestion ??
    slugifyLandingPageTitle(generated.title || formValues.title || 'landing-page');

  return {
    title: generated.title || formValues.title || 'Untitled Landing Page',
    slug: slugifyLandingPageTitle(slugSuggestion),
    status: 'draft',
    page_type: generated.pageType || formValues.pageType || 'custom',
    primary_service: formValues.serviceType || undefined,
    target_audience: formValues.targetAudience || undefined,
    offer_summary: formValues.mainOffer || undefined,
    city: formValues.city || undefined,
    tone: formValues.tone || undefined,
    hero_headline: heroHeadline,
    hero_subheadline: heroSubheadline,
    cta_text: ctaText,
    seo_title: seoTitle,
    meta_description: metaDescription,
    content_json: generated.content as unknown as Record<string, unknown>,
    generation_context_json: formValues as unknown as Record<string, unknown>,
    generation_prompt_json: {
      generatedAt: new Date().toISOString(),
      title: generated.title,
      pageType: generated.pageType,
      slugSuggestion: generated.slugSuggestion,
      summary: generated.summary,
    },
  };
}
