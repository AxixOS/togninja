// Landing Page Variant Types — Phase 5

export interface LandingPageVariantRecord {
  id: string;
  landing_page_id: string;
  user_id: string;
  variant_key: string;
  name: string;
  slug: string | null;
  status: 'draft' | 'published' | 'archived';
  traffic_weight: number;
  content_json: Record<string, unknown>;
  seo_title: string | null;
  meta_description: string | null;
  hero_headline: string | null;
  hero_subheadline: string | null;
  cta_text: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface CreateLandingPageVariantInput {
  name: string;
  variantKey?: string;
  intent?: 'stronger_headline' | 'different_cta' | 'more_urgency' | 'softer_tone' | 'custom';
  customInstruction?: string;
}

export interface UpdateLandingPageVariantInput {
  name?: string;
  status?: 'draft' | 'published' | 'archived';
  traffic_weight?: number;
  content_json?: Record<string, unknown>;
  seo_title?: string;
  meta_description?: string;
  hero_headline?: string;
  hero_subheadline?: string;
  cta_text?: string;
}

export interface LandingPageVariantSummary {
  id: string;
  variantKey: string;
  name: string;
  status: string;
  heroHeadline: string | null;
  ctaText: string | null;
  trafficWeight: number;
  createdAt: string;
}

export interface LandingPageVariantPerformance {
  variantKey: string;
  name: string;
  views: number;
  ctaClicks: number;
  ctr: number;
  conversions: number;
  conversionRate: number;
  isBestPerformer: boolean;
}
