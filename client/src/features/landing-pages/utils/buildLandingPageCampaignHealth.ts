// Phase 6: Build Landing Page Campaign Health

import type { LandingPageCampaignHealthState, LandingPageCampaignHealthSummary, LandingPageMetricTrend } from '../types/landingPageCampaignHealth.types';
import type { MetricWindow } from './landingPageAutomation.helpers';
import { deriveTrafficTrend, deriveConversionTrend } from './landingPageAutomation.helpers';

export interface CampaignHealthContext {
  landingPageId: string;
  currentMetrics: MetricWindow;
  previousMetrics: MetricWindow | null;
  publishedDaysAgo: number;
  variantCount: number;
  lastPromotedDaysAgo: number | null;
}

export function buildCampaignHealth(context: CampaignHealthContext): LandingPageCampaignHealthSummary {
  const state = deriveCampaignState(context);
  const flags = deriveAttentionFlags(context);
  const trends = buildTrends(context);

  return {
    landingPageId: context.landingPageId,
    state: state.state,
    stateLabel: state.label,
    reasons: state.reasons,
    warnings: flags.warnings,
    opportunities: flags.opportunities,
    recommendedNextMove: flags.recommendedNextMove,
    trends,
    lastEvaluatedAt: new Date().toISOString(),
  };
}

function deriveCampaignState(ctx: CampaignHealthContext): { state: LandingPageCampaignHealthState; label: string; reasons: string[] } {
  const reasons: string[] = [];
  const { currentMetrics: m, previousMetrics: prev, publishedDaysAgo } = ctx;

  // Dormant: zero or near-zero traffic for extended period
  if (m.views === 0 && publishedDaysAgo > 30) {
    reasons.push('No views in measurement window.', `Published ${publishedDaysAgo} days ago.`);
    return { state: 'dormant', label: 'Dormant', reasons };
  }

  // Stalled: some views but declining and low engagement
  if (prev && m.views > 0) {
    const trafficTrend = deriveTrafficTrend(m, prev);
    if (trafficTrend.direction === 'down' && m.ctr < 2) {
      reasons.push(`Traffic declining (${trafficTrend.changePercent.toFixed(1)}%).`, `CTR is only ${m.ctr.toFixed(1)}%.`);
      return { state: 'stalled', label: 'Stalled', reasons };
    }
  }

  // Needs attention: traffic exists but poor conversion
  if (m.views >= 20 && m.conversionRate < 1 && m.ctaClicks > 0) {
    reasons.push(`${m.views} views but conversion rate is ${m.conversionRate.toFixed(1)}%.`, 'People click but don\'t convert.');
    return { state: 'needs_attention', label: 'Needs Attention', reasons };
  }

  // Rising: traffic and engagement improving
  if (prev) {
    const trafficTrend = deriveTrafficTrend(m, prev);
    const convTrend = deriveConversionTrend(m, prev);
    if (trafficTrend.direction === 'up' && (convTrend.direction === 'up' || convTrend.direction === 'flat')) {
      reasons.push(`Traffic up ${trafficTrend.changePercent.toFixed(1)}%.`);
      if (convTrend.direction === 'up') reasons.push(`Conversions also improving.`);
      return { state: 'rising', label: 'Rising', reasons };
    }
  }

  // Healthy: good traffic and reasonable engagement
  if (m.views >= 10 && m.ctr >= 3) {
    reasons.push(`${m.views} views with ${m.ctr.toFixed(1)}% CTR.`);
    if (m.formSubmits > 0) reasons.push(`${m.formSubmits} conversions.`);
    return { state: 'healthy', label: 'Healthy', reasons };
  }

  // Stable: everything is OK but not exceptional
  reasons.push('Traffic and engagement are steady.');
  return { state: 'stable', label: 'Stable', reasons };
}

function deriveAttentionFlags(ctx: CampaignHealthContext): { warnings: string[]; opportunities: string[]; recommendedNextMove: string | null } {
  const warnings: string[] = [];
  const opportunities: string[] = [];
  let recommendedNextMove: string | null = null;

  const { currentMetrics: m, publishedDaysAgo, variantCount, lastPromotedDaysAgo } = ctx;

  if (m.views === 0 && publishedDaysAgo > 14) {
    warnings.push('Page has zero traffic. Consider promoting or archiving.');
    recommendedNextMove = 'Promote this page or archive it.';
  }

  if (m.ctaClicks > 0 && m.formSubmits === 0) {
    warnings.push('CTA clicks exist but no conversions. Review your offer.');
    if (!recommendedNextMove) recommendedNextMove = 'Improve your offer or form.';
  }

  if (variantCount === 0 && m.views >= 30) {
    opportunities.push('Try A/B testing with a variant to improve performance.');
  }

  if (lastPromotedDaysAgo !== null && lastPromotedDaysAgo > 14) {
    opportunities.push('Generate a fresh promo pack to re-engage your audience.');
  }

  if (m.formSubmits >= 3) {
    opportunities.push('Follow up on leads — conversions are happening.');
  }

  return { warnings, opportunities, recommendedNextMove };
}

function buildTrends(ctx: CampaignHealthContext): LandingPageMetricTrend[] {
  if (!ctx.previousMetrics) return [];

  const trafficTrend = deriveTrafficTrend(ctx.currentMetrics, ctx.previousMetrics);
  const convTrend = deriveConversionTrend(ctx.currentMetrics, ctx.previousMetrics);

  return [
    {
      metric: 'views',
      currentValue: ctx.currentMetrics.views,
      previousValue: ctx.previousMetrics.views,
      changePercent: trafficTrend.changePercent,
      direction: trafficTrend.direction,
      windowDays: ctx.currentMetrics.windowDays,
    },
    {
      metric: 'ctr',
      currentValue: ctx.currentMetrics.ctr,
      previousValue: ctx.previousMetrics.ctr,
      changePercent: ctx.previousMetrics.ctr > 0 ? ((ctx.currentMetrics.ctr - ctx.previousMetrics.ctr) / ctx.previousMetrics.ctr) * 100 : 0,
      direction: trafficTrend.direction,
      windowDays: ctx.currentMetrics.windowDays,
    },
    {
      metric: 'conversionRate',
      currentValue: ctx.currentMetrics.conversionRate,
      previousValue: ctx.previousMetrics.conversionRate,
      changePercent: convTrend.changePercent,
      direction: convTrend.direction,
      windowDays: ctx.currentMetrics.windowDays,
    },
  ];
}
