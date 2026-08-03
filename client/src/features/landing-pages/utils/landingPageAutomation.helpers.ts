// Phase 6: Landing Page Automation Helpers

import type { LandingPageAutomationCondition, LandingPageAutomationAction, LandingPageAutomationEventRecord, CreateLandingPageAutomationEventInput, LandingPageAutomationEventStatus } from '../types/landingPageAutomation.types';

export interface MetricWindow {
  views: number;
  ctaClicks: number;
  formStarts: number;
  formSubmits: number;
  ctr: number;
  conversionRate: number;
  windowDays: number;
}

export function compareMetricWindows(current: MetricWindow, previous: MetricWindow): {
  viewsChange: number;
  ctrChange: number;
  conversionChange: number;
  viewsTrend: 'up' | 'down' | 'flat';
  ctrTrend: 'up' | 'down' | 'flat';
  conversionTrend: 'up' | 'down' | 'flat';
} {
  const viewsChange = previous.views > 0 ? ((current.views - previous.views) / previous.views) * 100 : 0;
  const ctrChange = previous.ctr > 0 ? ((current.ctr - previous.ctr) / previous.ctr) * 100 : 0;
  const conversionChange = previous.conversionRate > 0 ? ((current.conversionRate - previous.conversionRate) / previous.conversionRate) * 100 : 0;

  return {
    viewsChange,
    ctrChange,
    conversionChange,
    viewsTrend: deriveTrendDirection(viewsChange),
    ctrTrend: deriveTrendDirection(ctrChange),
    conversionTrend: deriveTrendDirection(conversionChange),
  };
}

export function deriveTrendDirection(changePercent: number): 'up' | 'down' | 'flat' {
  if (changePercent > 5) return 'up';
  if (changePercent < -5) return 'down';
  return 'flat';
}

export function deriveTrafficTrend(current: MetricWindow, previous: MetricWindow): { direction: 'up' | 'down' | 'flat'; changePercent: number } {
  const change = previous.views > 0 ? ((current.views - previous.views) / previous.views) * 100 : 0;
  return { direction: deriveTrendDirection(change), changePercent: Math.round(change * 10) / 10 };
}

export function deriveConversionTrend(current: MetricWindow, previous: MetricWindow): { direction: 'up' | 'down' | 'flat'; changePercent: number } {
  const change = previous.conversionRate > 0 ? ((current.conversionRate - previous.conversionRate) / previous.conversionRate) * 100 : 0;
  return { direction: deriveTrendDirection(change), changePercent: Math.round(change * 10) / 10 };
}

export function shouldTriggerAutomation(
  condition: LandingPageAutomationCondition,
  currentMetrics: MetricWindow,
  previousMetrics: MetricWindow | null,
): { triggered: boolean; reason: string } {
  const minSample = condition.minSampleSize ?? 10;

  if (currentMetrics.views < minSample) {
    return { triggered: false, reason: `Not enough data (${currentMetrics.views} views, need ${minSample}).` };
  }

  if (!condition.metric || !condition.operator || condition.threshold === undefined) {
    return { triggered: false, reason: 'Incomplete condition definition.' };
  }

  const metricValue = getMetricValue(condition.metric, currentMetrics);

  if (condition.operator === 'drop_pct' && previousMetrics) {
    const prevValue = getMetricValue(condition.metric, previousMetrics);
    if (prevValue === 0) return { triggered: false, reason: 'No previous data to compare.' };
    const dropPct = ((prevValue - metricValue) / prevValue) * 100;
    if (dropPct >= condition.threshold) {
      return { triggered: true, reason: `${condition.metric} dropped ${dropPct.toFixed(1)}% (threshold: ${condition.threshold}%).` };
    }
    return { triggered: false, reason: `${condition.metric} change is within threshold.` };
  }

  if (condition.operator === 'rise_pct' && previousMetrics) {
    const prevValue = getMetricValue(condition.metric, previousMetrics);
    if (prevValue === 0) return { triggered: false, reason: 'No previous data to compare.' };
    const risePct = ((metricValue - prevValue) / prevValue) * 100;
    if (risePct >= condition.threshold) {
      return { triggered: true, reason: `${condition.metric} rose ${risePct.toFixed(1)}% (threshold: ${condition.threshold}%).` };
    }
    return { triggered: false, reason: `${condition.metric} change is within threshold.` };
  }

  const comparison = compareValue(metricValue, condition.operator, condition.threshold);
  if (comparison) {
    return { triggered: true, reason: `${condition.metric} is ${metricValue} (${condition.operator} ${condition.threshold}).` };
  }

  return { triggered: false, reason: `${condition.metric} (${metricValue}) does not meet ${condition.operator} ${condition.threshold}.` };
}

function getMetricValue(metric: string, window: MetricWindow): number {
  switch (metric) {
    case 'views': return window.views;
    case 'ctaClicks': return window.ctaClicks;
    case 'formStarts': return window.formStarts;
    case 'formSubmits': return window.formSubmits;
    case 'ctr': return window.ctr;
    case 'conversionRate': return window.conversionRate;
    default: return 0;
  }
}

function compareValue(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case 'lt': return value < threshold;
    case 'gt': return value > threshold;
    case 'lte': return value <= threshold;
    case 'gte': return value >= threshold;
    case 'eq': return value === threshold;
    default: return false;
  }
}

export function buildAutomationEvent(
  landingPageId: string,
  userId: string,
  eventType: string,
  summary: string,
  options?: { automationRuleId?: string; eventStatus?: LandingPageAutomationEventStatus; detailJson?: Record<string, unknown> },
): CreateLandingPageAutomationEventInput {
  return {
    landingPageId,
    userId,
    automationRuleId: options?.automationRuleId ?? null,
    eventType,
    eventStatus: options?.eventStatus ?? 'info',
    summary,
    detailJson: options?.detailJson ?? {},
  };
}

export function formatAutomationEventForDisplay(event: LandingPageAutomationEventRecord): { label: string; description: string; severity: string; time: string } {
  return {
    label: event.eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: event.summary,
    severity: event.eventStatus,
    time: event.occurredAt,
  };
}
