// Landing Page domain types — Phase 1

export type LandingPageStatus = 'draft' | 'published' | 'archived';

export type LandingPageType =
  | 'custom'
  | 'seasonal-offer'
  | 'voucher-sales'
  | 'mini-session'
  | 'family-portrait'
  | 'newborn-offer'
  | 'business-headshots'
  | 'wedding-landing'
  | 'waitlist-page'
  | 'lead-capture-page';

/** Structured JSON shape for AI-generated landing page content */
export type LandingPageContentJson = {
  hero?: {
    headline?: string;
    subheadline?: string;
    ctaText?: string;
    [key: string]: unknown;
  };
  trustBar?: {
    items?: string[];
    [key: string]: unknown;
  };
  problemSection?: {
    headline?: string;
    description?: string;
    painPoints?: string[];
    [key: string]: unknown;
  };
  offerSection?: {
    headline?: string;
    description?: string;
    price?: string;
    inclusions?: string[];
    urgency?: string;
    [key: string]: unknown;
  };
  benefits?: Array<{
    title?: string;
    description?: string;
    [key: string]: unknown;
  }>;
  whyChooseUs?: {
    headline?: string;
    reasons?: Array<{ title?: string; description?: string }>;
    [key: string]: unknown;
  };
  testimonials?: Array<{
    quote?: string;
    author?: string;
    role?: string;
    [key: string]: unknown;
  }>;
  faq?: Array<{
    question?: string;
    answer?: string;
    [key: string]: unknown;
  }>;
  finalCta?: {
    headline?: string;
    description?: string;
    ctaText?: string;
    [key: string]: unknown;
  };
  seo?: {
    title?: string;
    metaDescription?: string;
    [key: string]: unknown;
  };
  sections?: Array<Record<string, unknown>>;
};

/** Full DB record shape */
export interface LandingPageRecord {
  id: string;
  user_id?: string;
  title: string;
  slug: string;
  status: LandingPageStatus;
  page_type: string;
  primary_service: string | null;
  target_audience: string | null;
  offer_summary: string | null;
  city: string | null;
  tone?: string | null;
  seo_title: string | null;
  meta_description: string | null;
  hero_headline: string | null;
  hero_subheadline: string | null;
  cta_text: string | null;
  cta_action?: string | null;
  schema_type?: string | null;
  content_json: LandingPageContentJson;
  generation_prompt_json: Record<string, unknown> | null;
  generation_context_json: Record<string, unknown> | null;
  rendered_html?: string | null;
  preview_image_url: string | null;
  published_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

/** Payload for creating a new landing page */
export interface CreateLandingPageInput {
  title: string;
  slug?: string;
  status?: LandingPageStatus;
  page_type?: string;
  primary_service?: string;
  target_audience?: string;
  offer_summary?: string;
  city?: string;
  tone?: string;
  seo_title?: string;
  meta_description?: string;
  cta_text?: string;
  cta_action?: string;
  content_json?: LandingPageContentJson;
}

/** Payload for updating an existing landing page */
export interface UpdateLandingPageInput {
  title?: string;
  slug?: string;
  status?: LandingPageStatus;
  page_type?: string;
  primary_service?: string;
  target_audience?: string;
  offer_summary?: string;
  city?: string;
  tone?: string;
  seo_title?: string;
  meta_description?: string;
  hero_headline?: string;
  hero_subheadline?: string;
  cta_text?: string;
  cta_action?: string;
  content_json?: LandingPageContentJson;
}

/** Filters for the landing pages list */
export interface LandingPageListFilters {
  status?: LandingPageStatus | 'all';
  search?: string;
  sortBy?: 'updated_at' | 'created_at' | 'title';
  sortDir?: 'asc' | 'desc';
}

/** Slimmed-down list item for cards/table display */
export interface LandingPageListItem {
  id: string;
  title: string;
  slug: string;
  status: LandingPageStatus;
  page_type: string;
  primary_service: string | null;
  target_audience: string | null;
  city: string | null;
  hero_headline: string | null;
  updated_at: string;
  published_at: string | null;
}

/** Generic API response wrapper */
export interface LandingPageApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
  };
}
