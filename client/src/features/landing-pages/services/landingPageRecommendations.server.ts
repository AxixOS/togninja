// Phase 6: Landing Page Recommendations Server Service

import type { LandingPageRecommendation } from '../types/landingPageRecommendation.types';

export interface RecommendationInputs {
  views: number;
  ctaClicks: number;
  formStarts: number;
  formSubmits: number;
  ctr: number;
  conversionRate: number;
  variantCount: number;
  publishedDaysAgo: number;
  pageTitle: string;
}

/**
 * Build recommendations from page analytics context.
 * Returns a prioritized list of actionable suggestions.
 */
export function buildRecommendationsFromContext(inputs: RecommendationInputs): LandingPageRecommendation[] {
  const recs: LandingPageRecommendation[] = [];
  const ts = Date.now();

  if (inputs.views >= 20 && inputs.ctr < 3) {
    recs.push({
      id: `rec_ctr_${ts}`,
      priority: 'high',
      category: 'cta',
      actionType: 'strengthen_cta',
      title: 'Strengthen Your CTA',
      description: `CTR is ${inputs.ctr.toFixed(1)}% — try a more compelling call-to-action.`,
      actionLabel: 'Edit CTA',
      reasoning: `${inputs.views} views but only ${inputs.ctr.toFixed(1)}% CTR.`,
    });
  }

  if (inputs.variantCount === 0 && inputs.views >= 30) {
    recs.push({
      id: `rec_variant_${ts}`,
      priority: 'medium',
      category: 'variant_testing',
      actionType: 'test_variant',
      title: 'Try A/B Testing',
      description: 'Create a variant with a different headline or CTA.',
      actionLabel: 'Create Variant',
      reasoning: `Page has ${inputs.views} views but no variants.`,
    });
  }

  if (inputs.ctaClicks >= 5 && inputs.formSubmits === 0) {
    recs.push({
      id: `rec_conv_${ts}`,
      priority: 'high',
      category: 'offer',
      actionType: 'add_urgency',
      title: 'Add Urgency to Your Offer',
      description: 'People click but don\'t convert. Add a deadline or bonus.',
      actionLabel: 'Edit Offer',
      reasoning: `${inputs.ctaClicks} CTA clicks with 0 submissions.`,
    });
  }

  if (inputs.views < 5 && inputs.publishedDaysAgo > 7) {
    recs.push({
      id: `rec_promo_${ts}`,
      priority: 'medium',
      category: 'promotion',
      actionType: 'reshare_social',
      title: 'Re-share on Social Media',
      description: 'This page is getting very little traffic. Promote it again.',
      actionLabel: 'Create Social Post',
      reasoning: `Only ${inputs.views} views in the measurement window.`,
    });
  }

  if (inputs.formSubmits >= 3) {
    recs.push({
      id: `rec_crm_${ts}`,
      priority: 'medium',
      category: 'crm_followup',
      actionType: 'nurture_leads',
      title: 'Follow Up on Leads',
      description: `${inputs.formSubmits} form submissions — make sure you're responding.`,
      actionLabel: 'View CRM Signals',
      reasoning: 'Active conversions happening.',
    });
  }

  // Sort by priority
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  recs.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));

  return recs;
}

/**
 * Merge recommendations from multiple sources, deduplicating by actionType.
 */
export function mergeRecommendationSources(sources: LandingPageRecommendation[][]): LandingPageRecommendation[] {
  const seen = new Set<string>();
  const merged: LandingPageRecommendation[] = [];

  for (const source of sources) {
    for (const rec of source) {
      if (!seen.has(rec.actionType)) {
        seen.add(rec.actionType);
        merged.push(rec);
      }
    }
  }

  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  merged.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));

  return merged;
}
