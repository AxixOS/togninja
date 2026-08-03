// Phase 6: Landing Page Recommendation Types

export type LandingPageRecommendationPriority = 'low' | 'medium' | 'high' | 'critical';

export type LandingPageRecommendationCategory =
  | 'content'
  | 'cta'
  | 'offer'
  | 'promotion'
  | 'variant_testing'
  | 'seasonality'
  | 'crm_followup';

export type LandingPageRecommendationActionType =
  | 'strengthen_cta'
  | 'test_variant'
  | 'refresh_promo'
  | 'relaunch_seasonal'
  | 'archive_page'
  | 'reshare_social'
  | 'reshare_gmb'
  | 'generate_variant'
  | 'shorten_headline'
  | 'add_urgency'
  | 'create_voucher_version'
  | 'manual_followup'
  | 'nurture_leads';

export interface LandingPageRecommendation {
  id: string;
  priority: LandingPageRecommendationPriority;
  category: LandingPageRecommendationCategory;
  actionType: LandingPageRecommendationActionType;
  title: string;
  description: string;
  actionLabel: string | null;
  reasoning: string;
  metadata?: Record<string, unknown>;
}

export interface LandingPageRecommendationSet {
  landingPageId: string;
  generatedAt: string;
  recommendations: LandingPageRecommendation[];
  topRecommendation: LandingPageRecommendation | null;
}
