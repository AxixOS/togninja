// Landing Page Analytics — Constants & Labels

import type { LandingPageEventType } from '../types/landingPageAnalytics.types';

/** Human-readable labels for each event type */
export const LANDING_PAGE_EVENT_LABELS: Record<LandingPageEventType, string> = {
  page_view: 'Page View',
  cta_click: 'CTA Click',
  secondary_cta_click: 'Secondary CTA Click',
  form_start: 'Form Started',
  form_submit: 'Form Submitted',
  voucher_click: 'Voucher Click',
  booking_click: 'Booking Click',
  whatsapp_click: 'WhatsApp Click',
  email_click: 'Email Click',
  phone_click: 'Phone Click',
  preview_view: 'Preview View',
};

/** Event types that count as "conversion" actions */
export const CONVERSION_EVENT_TYPES: LandingPageEventType[] = [
  'form_submit',
  'voucher_click',
  'booking_click',
];

/** Event types that count as "engagement" actions */
export const ENGAGEMENT_EVENT_TYPES: LandingPageEventType[] = [
  'cta_click',
  'secondary_cta_click',
  'whatsapp_click',
  'email_click',
  'phone_click',
];

/** Default analytics date ranges in days */
export const ANALYTICS_DATE_RANGES = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: 0,
} as const;

export type AnalyticsDateRange = keyof typeof ANALYTICS_DATE_RANGES;

/** Minimum event count before showing analytics insights */
export const ANALYTICS_MIN_EVENT_THRESHOLD = 10;

/** CTR thresholds for growth insights */
export const CTR_THRESHOLDS = {
  excellent: 15,
  good: 8,
  low: 3,
} as const;

/** Conversion rate thresholds for growth insights */
export const CONVERSION_THRESHOLDS = {
  excellent: 10,
  good: 4,
  low: 1,
} as const;

/** Maximum number of top CTAs to show */
export const TOP_CTAS_LIMIT = 5;

/** Maximum number of recent events in activity feed */
export const RECENT_EVENTS_LIMIT = 20;
