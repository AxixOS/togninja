import type { LandingPageSectionDefinition, LandingPageSectionKey, LandingPageSectionOrder, LandingPageSectionVisibilityMap } from '../types/landingPageEditor.types';

export const LANDING_PAGE_SECTION_DEFINITIONS: LandingPageSectionDefinition[] = [
  { key: 'hero', label: 'Hero', description: 'Headline, subheadline, and primary call to action', required: true, supportsRegeneration: true, supportsVisibilityToggle: false, supportsDuplicate: false, supportsRemove: false, criticalForPublish: true },
  { key: 'trustBar', label: 'Trust Bar', description: 'Short trust signals and social proof badges', required: false, supportsRegeneration: true, supportsVisibilityToggle: true, supportsDuplicate: false, supportsRemove: true, criticalForPublish: false },
  { key: 'problemSection', label: 'Problem', description: 'Address the audience\'s pain points', required: false, supportsRegeneration: true, supportsVisibilityToggle: true, supportsDuplicate: false, supportsRemove: true, criticalForPublish: false },
  { key: 'offerSection', label: 'Offer', description: 'Your main offer, inclusions, and urgency', required: false, supportsRegeneration: true, supportsVisibilityToggle: true, supportsDuplicate: false, supportsRemove: true, criticalForPublish: false },
  { key: 'benefits', label: 'Benefits', description: 'Key benefits of booking or buying', required: false, supportsRegeneration: true, supportsVisibilityToggle: true, supportsDuplicate: false, supportsRemove: true, criticalForPublish: false },
  { key: 'whyChooseUs', label: 'Why Choose Us', description: 'Differentiation and unique selling points', required: false, supportsRegeneration: true, supportsVisibilityToggle: true, supportsDuplicate: false, supportsRemove: true, criticalForPublish: false },
  { key: 'inclusions', label: 'Inclusions', description: 'What\'s included in the package', required: false, supportsRegeneration: true, supportsVisibilityToggle: true, supportsDuplicate: false, supportsRemove: true, criticalForPublish: false },
  { key: 'testimonials', label: 'Testimonials', description: 'Client reviews and social proof', required: false, supportsRegeneration: true, supportsVisibilityToggle: true, supportsDuplicate: false, supportsRemove: true, criticalForPublish: false },
  { key: 'faq', label: 'FAQ', description: 'Frequently asked questions', required: false, supportsRegeneration: true, supportsVisibilityToggle: true, supportsDuplicate: false, supportsRemove: true, criticalForPublish: false },
  { key: 'finalCta', label: 'Final CTA', description: 'Closing call to action', required: false, supportsRegeneration: true, supportsVisibilityToggle: true, supportsDuplicate: false, supportsRemove: true, criticalForPublish: true },
  { key: 'seo', label: 'SEO', description: 'Search engine optimisation settings', required: true, supportsRegeneration: true, supportsVisibilityToggle: false, supportsDuplicate: false, supportsRemove: false, criticalForPublish: true },
];

export const DEFAULT_SECTION_ORDER: LandingPageSectionOrder = [
  'hero', 'trustBar', 'problemSection', 'offerSection', 'benefits',
  'whyChooseUs', 'inclusions', 'testimonials', 'faq', 'finalCta', 'seo',
];

export const DEFAULT_SECTION_VISIBILITY: LandingPageSectionVisibilityMap = {
  hero: true, trustBar: true, problemSection: true, offerSection: true,
  benefits: true, whyChooseUs: true, inclusions: true, testimonials: true,
  faq: true, finalCta: true, seo: true,
};

export function getSectionDefinition(key: LandingPageSectionKey): LandingPageSectionDefinition | undefined {
  return LANDING_PAGE_SECTION_DEFINITIONS.find(d => d.key === key);
}

export function getVisibleSections(order: LandingPageSectionOrder, visibility: LandingPageSectionVisibilityMap): LandingPageSectionKey[] {
  return order.filter(key => visibility[key]);
}
