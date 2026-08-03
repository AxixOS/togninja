import type { LandingPageWizardFormValues, LandingPageWizardStepKey } from '../types/landingPageGeneration.types';

export const defaultLandingPageWizardValues: LandingPageWizardFormValues = {
  // Basics
  pagePurpose: 'leads',
  pageType: 'custom',
  serviceType: '',
  city: '',
  title: '',
  tone: 'warm',

  // Offer
  mainOffer: '',
  discountOrBonus: '',
  urgency: '',
  voucherValidity: '',
  weekendAvailability: false,
  numberOfPeopleAllowed: '',
  petsAllowed: false,
  personalisedVoucher: false,
  packageInclusions: '',

  // Audience
  targetAudience: '',
  painPoints: [''],
  desiredOutcomes: [''],
  seasonalAngle: '',

  // Trust
  yearsInBusiness: '',
  studioLocation: '',
  trustPoints: [''],
  reviewSnippets: [''],
  whyChooseYou: '',
  uniqueStyle: '',

  // CTA
  primaryCta: '',
  secondaryCta: '',
  conversionGoal: '',
  preferredAction: '',

  // SEO
  primaryKeyphrase: '',
  secondaryKeyphrases: '',
  internalLinkUrl: '',
  externalAuthorityRef: '',
  faqTopics: [],

  // Assets
  heroImageUrl: '',
  aiImagePrompt: '',
  visualNotes: '',
  brandColorNotes: '',
  promoBadgeText: '',
};

export const defaultWizardStepOrder: LandingPageWizardStepKey[] = [
  'basics',
  'offer',
  'audience',
  'trust',
  'cta',
  'seo',
  'assets',
];
