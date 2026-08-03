// Landing Page Analytics Types — Phase 5

// ── Event Types ──────────────────────────────────────────────

export type LandingPageEventType =
  | 'page_view'
  | 'cta_click'
  | 'secondary_cta_click'
  | 'form_start'
  | 'form_submit'
  | 'voucher_click'
  | 'booking_click'
  | 'whatsapp_click'
  | 'email_click'
  | 'phone_click'
  | 'preview_view';

export interface LandingPageEventRecord {
  id: string;
  landing_page_id: string;
  user_id: string | null;
  event_type: LandingPageEventType;
  event_label: string | null;
  event_value: string | null;
  variant_key: string | null;
  session_id: string | null;
  visitor_id: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrer: string | null;
  page_path: string | null;
  occurred_at: string;
  metadata_json: Record<string, unknown>;
}

export interface LandingPageEventInput {
  landing_page_id: string;
  event_type: LandingPageEventType;
  event_label?: string;
  event_value?: string;
  variant_key?: string;
  session_id?: string;
  visitor_id?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
  page_path?: string;
  metadata_json?: Record<string, unknown>;
}

// ── Analytics Summary ────────────────────────────────────────

export interface LandingPageAnalyticsSummary {
  landingPageId?: string;
  totalViews: number;
  totalCtaClicks: number;
  totalFormStarts: number;
  totalFormSubmits: number;
  totalBookingClicks?: number;
  totalVoucherClicks?: number;
  totalWhatsappClicks?: number;
  totalEmailClicks?: number;
  totalPhoneClicks?: number;
  clickThroughRate: number;
  conversionRate: number;
  conversionFunnel: LandingPageConversionFunnel;
  topCtas: LandingPageTopCtaMetric[];
  timeline: { date: string; views: number; clicks: number }[];
  recentEvents: LandingPageTimelinePoint[];
}

export interface LandingPagePerformanceMetrics {
  pageId: string;
  pageTitle: string;
  slug: string;
  status: string;
  views: number;
  ctaClicks: number;
  ctr: number;
  conversions: number;
  conversionRate: number;
  bestVariant: string | null;
}

export interface LandingPageConversionFunnel {
  views: number;
  ctaClicks: number;
  formStarts: number;
  formSubmits: number;
  ctaRate: number;
  startRate: number;
  submitRate: number;
}

export interface LandingPageTopCtaMetric {
  label: string;
  placement?: string;
  clicks: number;
  percentage?: number;
}

export interface LandingPageTimelinePoint {
  eventType: LandingPageEventType;
  eventLabel: string | null;
  occurredAt: string;
  variantKey: string | null;
}

// ── Overview (multi-page) ────────────────────────────────────

export interface LandingPagesAnalyticsOverview {
  totalPages: number;
  totalViews: number;
  totalCtaClicks: number;
  overallCtr: number;
  topPages: LandingPagePerformanceMetrics[];
}
