// Landing Page Growth Types — Phase 5

export interface LandingPageGrowthInsight {
  type: 'success' | 'warning' | 'suggestion' | 'action';
  title: string;
  description: string;
  metric?: string;
  actionLabel?: string;
}

export interface LandingPageGrowthSummary {
  landingPageId: string;
  totalViews: number;
  totalCtaClicks: number;
  ctr: number;
  bestCta: string | null;
  bestVariant: string | null;
  strongestSource: string | null;
  insights: LandingPageGrowthInsight[];
  recommendedNextAction: string | null;
}

export interface LandingPageOptimizationSuggestion {
  area: 'headline' | 'cta' | 'offer' | 'faq' | 'testimonials' | 'general';
  suggestion: string;
  confidence: 'low' | 'medium' | 'high';
  basedOn: string;
}

export interface LandingPageSeasonalTemplate {
  id: string;
  label: string;
  pageType: string;
  targetAudience: string;
  seasonalHook: string;
  recommendedSections: string[];
  offerExamples: string[];
  ctaSuggestions: string[];
  heroAngle: string;
  trustAngle: string;
  seoAngle: string;
  imagePromptAngle: string;
}
