// Phase 6: Landing Page Campaign Health Server Service

import type { LandingPageCampaignHealthState, LandingPageCampaignHealthSummary } from '../types/landingPageCampaignHealth.types';

export interface CampaignHealthInputs {
  views: number;
  ctaClicks: number;
  formSubmits: number;
  ctr: number;
  conversionRate: number;
  publishedDaysAgo: number;
  variantCount: number;
}

/**
 * Derive campaign health state from metrics.
 */
export function deriveCampaignState(inputs: CampaignHealthInputs): {
  state: LandingPageCampaignHealthState;
  label: string;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (inputs.views === 0 && inputs.publishedDaysAgo > 30) {
    reasons.push('No views in measurement window.', `Published ${inputs.publishedDaysAgo} days ago.`);
    return { state: 'dormant', label: 'Dormant', reasons };
  }

  if (inputs.views >= 20 && inputs.conversionRate < 1 && inputs.ctaClicks > 0) {
    reasons.push(`${inputs.views} views but conversion rate is ${inputs.conversionRate.toFixed(1)}%.`);
    return { state: 'needs_attention', label: 'Needs Attention', reasons };
  }

  if (inputs.views >= 10 && inputs.ctr >= 3) {
    reasons.push(`${inputs.views} views with ${inputs.ctr.toFixed(1)}% CTR.`);
    if (inputs.formSubmits > 0) reasons.push(`${inputs.formSubmits} conversions.`);
    return { state: 'healthy', label: 'Healthy', reasons };
  }

  if (inputs.views < 5 && inputs.publishedDaysAgo > 7) {
    reasons.push(`Only ${inputs.views} views over ${inputs.publishedDaysAgo} days.`);
    return { state: 'stalled', label: 'Stalled', reasons };
  }

  reasons.push('Traffic and engagement are steady.');
  return { state: 'stable', label: 'Stable', reasons };
}

/**
 * Build attention flags (warnings + opportunities).
 */
export function deriveAttentionFlags(inputs: CampaignHealthInputs): {
  warnings: string[];
  opportunities: string[];
  recommendedNextMove: string | null;
} {
  const warnings: string[] = [];
  const opportunities: string[] = [];
  let recommendedNextMove: string | null = null;

  if (inputs.views === 0 && inputs.publishedDaysAgo > 14) {
    warnings.push('Page has zero traffic. Consider promoting or archiving.');
    recommendedNextMove = 'Promote this page or archive it.';
  }

  if (inputs.ctaClicks > 0 && inputs.formSubmits === 0) {
    warnings.push('CTA clicks exist but no conversions.');
    if (!recommendedNextMove) recommendedNextMove = 'Improve your offer or form.';
  }

  if (inputs.variantCount === 0 && inputs.views >= 30) {
    opportunities.push('Try A/B testing with a variant.');
  }

  if (inputs.formSubmits >= 3) {
    opportunities.push('Follow up on leads — conversions are happening.');
  }

  return { warnings, opportunities, recommendedNextMove };
}

/**
 * Build full campaign health summary.
 */
export function buildCampaignHealthSummary(landingPageId: string, inputs: CampaignHealthInputs): LandingPageCampaignHealthSummary {
  const stateInfo = deriveCampaignState(inputs);
  const flags = deriveAttentionFlags(inputs);

  return {
    landingPageId,
    state: stateInfo.state,
    stateLabel: stateInfo.label,
    reasons: stateInfo.reasons,
    warnings: flags.warnings,
    opportunities: flags.opportunities,
    recommendedNextMove: flags.recommendedNextMove,
    trends: [],
    lastEvaluatedAt: new Date().toISOString(),
  };
}
