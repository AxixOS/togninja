import type { LandingPageWizardStepKey, LandingPagePagePurpose, LandingPageTone, LandingPageGenerationStatus } from '../types/landingPageGeneration.types';

// ── AI Generation ────────────────────────────────────────────────

export const LANDING_PAGE_GENERATION_MAX_TOKENS = 3000;
export const LANDING_PAGE_GENERATION_TEMPERATURE = 0.8;

// ── Wizard Steps ─────────────────────────────────────────────────

export const LANDING_PAGE_WIZARD_STEPS: {
  key: LandingPageWizardStepKey;
  label: string;
  description: string;
}[] = [
  { key: 'basics', label: 'Basics', description: 'What are you selling?' },
  { key: 'offer', label: 'Offer', description: 'Your offer details' },
  { key: 'audience', label: 'Audience', description: 'Who is this for?' },
  { key: 'trust', label: 'Trust', description: 'Build credibility' },
  { key: 'cta', label: 'CTA', description: 'Calls to action' },
  { key: 'seo', label: 'SEO', description: 'Search & discoverability' },
  { key: 'assets', label: 'Assets', description: 'Images & visuals' },
];

// ── Page Purpose Options ─────────────────────────────────────────

export const LANDING_PAGE_PAGE_PURPOSE_OPTIONS: {
  value: LandingPagePagePurpose;
  label: string;
  description: string;
}[] = [
  { value: 'leads', label: 'Lead Generation', description: 'Capture enquiries and contact details' },
  { value: 'voucher-sales', label: 'Voucher Sales', description: 'Sell gift vouchers directly' },
  { value: 'bookings', label: 'Direct Bookings', description: 'Drive session bookings' },
  { value: 'waitlist', label: 'Waitlist', description: 'Build a waiting list for limited slots' },
  { value: 'awareness', label: 'Brand Awareness', description: 'Showcase your work and expertise' },
];

// ── Tone Options ─────────────────────────────────────────────────

export const LANDING_PAGE_TONE_OPTIONS: {
  value: LandingPageTone;
  label: string;
}[] = [
  { value: 'warm', label: 'Warm & Friendly' },
  { value: 'professional', label: 'Professional' },
  { value: 'playful', label: 'Playful & Fun' },
  { value: 'luxurious', label: 'Luxurious & Premium' },
  { value: 'casual', label: 'Casual & Relaxed' },
  { value: 'urgent', label: 'Urgent & Direct' },
];

// ── Template Labels ──────────────────────────────────────────────

export const LANDING_PAGE_TEMPLATE_LABELS: Record<string, string> = {
  custom: 'Custom Page',
  'seasonal-offer': 'Seasonal Offer',
  'voucher-sales': 'Voucher Sales',
  'mini-session': 'Mini Session',
  'family-portrait': 'Family Portrait',
  'newborn-offer': 'Newborn Offer',
  'business-headshots': 'Business Headshots',
  'wedding-landing': 'Wedding',
  'waitlist-page': 'Waitlist',
  'lead-capture-page': 'Lead Capture',
};

// ── Generation Status Labels ─────────────────────────────────────

export const LANDING_PAGE_GENERATION_STATUS_LABELS: Record<LandingPageGenerationStatus, string> = {
  idle: 'Not Generated',
  generating: 'Generating…',
  generated: 'Generated',
  failed: 'Generation Failed',
};
