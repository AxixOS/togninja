import type { LandingPageStatus, LandingPageType, CreateLandingPageInput } from '../types/landingPage.types';

export const LANDING_PAGE_STATUSES: { value: LandingPageStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

export const LANDING_PAGE_TYPES: { value: LandingPageType; label: string; icon: string }[] = [
  { value: 'custom', label: 'Custom', icon: '✏️' },
  { value: 'seasonal-offer', label: 'Seasonal Offer', icon: '🌸' },
  { value: 'voucher-sales', label: 'Voucher Sales', icon: '🎁' },
  { value: 'mini-session', label: 'Mini Session', icon: '⚡' },
  { value: 'family-portrait', label: 'Family Portrait', icon: '👨‍👩‍👧‍👦' },
  { value: 'newborn-offer', label: 'Newborn Offer', icon: '👶' },
  { value: 'business-headshots', label: 'Business Headshots', icon: '💼' },
  { value: 'wedding-landing', label: 'Wedding', icon: '💒' },
  { value: 'waitlist-page', label: 'Waitlist', icon: '📝' },
  { value: 'lead-capture-page', label: 'Lead Capture', icon: '📋' },
];

export const LANDING_PAGE_SORT_OPTIONS = [
  { value: 'updated_at', label: 'Last Updated' },
  { value: 'created_at', label: 'Date Created' },
  { value: 'title', label: 'Title' },
] as const;

export const LANDING_PAGE_DEFAULT_PAGE_SIZE = 20;

export const LANDING_PAGE_EMPTY_CONTENT = {};

export const LANDING_PAGE_DEFAULT_NEW_PAGE: CreateLandingPageInput = {
  title: '',
  slug: '',
  status: 'draft',
  page_type: 'custom',
  content_json: {},
};
