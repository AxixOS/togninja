// Build Landing Page Growth Summary
// Compact heuristic-based summary from page + analytics + variants

import type {
  LandingPageGrowthInsight,
  LandingPageGrowthSummary,
  LandingPageOptimizationSuggestion,
} from '../types/landingPageGrowth.types';
import type { LandingPageAnalyticsSummary } from '../types/landingPageAnalytics.types';
import type { LandingPageVariantPerformance } from '../types/landingPageVariant.types';
import {
  CTR_THRESHOLDS,
  CONVERSION_THRESHOLDS,
  ANALYTICS_MIN_EVENT_THRESHOLD,
} from './landingPageAnalytics.constants';

export function buildLandingPageGrowthSummary(
  analytics: LandingPageAnalyticsSummary | null,
  variantPerformances: LandingPageVariantPerformance[],
): LandingPageGrowthSummary {
  const insights: LandingPageGrowthInsight[] = [];
  const suggestions: LandingPageOptimizationSuggestion[] = [];

  const views = analytics?.totalViews ?? 0;
  const ctr = analytics?.clickThroughRate ?? 0;
  const convRate = analytics?.conversionRate ?? 0;

  // ── Not enough data ────────────────────────────────────────
  if (views < ANALYTICS_MIN_EVENT_THRESHOLD) {
    insights.push({
      type: 'suggestion',
      title: 'Not enough traffic yet',
      description: `This page has ${views} views. Share it on social media or send it to your email list to start gathering insights.`,
      actionLabel: 'Generate Promo Pack',
    });

    return {
      landingPageId: '',
      totalViews: views,
      totalCtaClicks: 0,
      ctr: 0,
      bestCta: null,
      bestVariant: null,
      strongestSource: null,
      insights,
      recommendedNextAction: 'promote',
    };
  }

  // ── CTR Insights ───────────────────────────────────────────
  if (ctr >= CTR_THRESHOLDS.excellent) {
    insights.push({
      type: 'success',
      title: 'Excellent click-through rate',
      description: `Your CTR of ${ctr}% is outstanding. Your CTA messaging is resonating.`,
      metric: `${ctr}% CTR`,
    });
  } else if (ctr >= CTR_THRESHOLDS.good) {
    insights.push({
      type: 'success',
      title: 'Solid click-through rate',
      description: `Your CTR of ${ctr}% is above average. Consider testing a stronger headline to push it higher.`,
      metric: `${ctr}% CTR`,
    });
  } else if (ctr < CTR_THRESHOLDS.low) {
    insights.push({
      type: 'warning',
      title: 'Low click-through rate',
      description: `Your CTR of ${ctr}% is below average. Try a more compelling headline or clearer CTA button.`,
      metric: `${ctr}% CTR`,
      actionLabel: 'Create A/B Variant',
    });
    suggestions.push({
      area: 'cta',
      suggestion: 'Try a more action-oriented CTA like "Book Your Session Now" instead of generic text.',
      confidence: 'medium',
      basedOn: `CTR of ${ctr}% across ${views} views`,
    });
  }

  // ── Conversion Insights ────────────────────────────────────
  if (convRate >= CONVERSION_THRESHOLDS.excellent) {
    insights.push({
      type: 'success',
      title: 'High conversion rate',
      description: `${convRate}% conversion rate means your page is doing its job. Consider duplicating this as a template.`,
      metric: `${convRate}% conversions`,
      actionLabel: 'Clone as Campaign',
    });
  } else if (convRate < CONVERSION_THRESHOLDS.low && views >= ANALYTICS_MIN_EVENT_THRESHOLD) {
    insights.push({
      type: 'warning',
      title: 'Conversions need attention',
      description: `Only ${convRate}% of visitors are converting. Consider adding testimonials, pricing, or a stronger offer.`,
      metric: `${convRate}% conversions`,
      actionLabel: 'Edit Page',
    });
    suggestions.push({
      area: 'testimonials',
      suggestion: 'Add a testimonials section or trust badges to reassure visitors.',
      confidence: 'high',
      basedOn: `Low conversion rate of ${convRate}%`,
    });
  }

  // ── Best CTA ───────────────────────────────────────────────
  const bestCta = analytics?.topCtas?.[0]?.label ?? null;
  if (bestCta) {
    insights.push({
      type: 'action',
      title: `Top CTA: "${bestCta}"`,
      description: `This CTA gets the most clicks. Make sure it's prominent and above the fold.`,
    });
  }

  // ── Variant Performance ────────────────────────────────────
  const bestVariant =
    variantPerformances.length > 1
      ? variantPerformances.find((v) => v.isBestPerformer)?.variantKey ?? null
      : null;

  if (bestVariant) {
    insights.push({
      type: 'success',
      title: `Winning variant: ${bestVariant}`,
      description: 'This variant is outperforming others. Consider making it your primary page.',
      actionLabel: 'Promote to Primary',
    });
  } else if (variantPerformances.length === 0) {
    insights.push({
      type: 'suggestion',
      title: 'No A/B variants yet',
      description: 'Create a variant with a different headline or CTA to find what works best.',
      actionLabel: 'Create Variant',
    });
  }

  // ── Recommended Next Action ────────────────────────────────
  let recommendedNextAction = 'monitor';
  if (views < ANALYTICS_MIN_EVENT_THRESHOLD) recommendedNextAction = 'promote';
  else if (ctr < CTR_THRESHOLDS.low) recommendedNextAction = 'optimise_cta';
  else if (convRate < CONVERSION_THRESHOLDS.low) recommendedNextAction = 'add_social_proof';
  else if (variantPerformances.length === 0) recommendedNextAction = 'create_variant';
  else if (bestVariant) recommendedNextAction = 'promote_winner';

  return {
    landingPageId: '',
    totalViews: views,
    totalCtaClicks: analytics?.totalCtaClicks ?? 0,
    ctr,
    bestCta,
    bestVariant,
    strongestSource: null,
    insights,
    recommendedNextAction,
  };
}
