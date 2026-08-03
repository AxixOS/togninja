// Phase 6: Landing Page Automation Server Service (Orchestration)
// This module provides the automation evaluation orchestration logic.
// It can be called from routes or from a cron/job runner.

export interface AutomationMetricsSnapshot {
  views: number;
  ctaClicks: number;
  formStarts: number;
  formSubmits: number;
  ctr: number;
  conversionRate: number;
}

export interface AutomationContext {
  landingPageId: string;
  userId: string;
  currentMetrics: AutomationMetricsSnapshot;
  previousMetrics: AutomationMetricsSnapshot | null;
  publishedDaysAgo: number;
  variantCount: number;
}

export interface AutomationRunOutcome {
  landingPageId: string;
  evaluatedCount: number;
  triggeredCount: number;
  results: Array<{
    ruleId: string;
    ruleName: string;
    ruleType: string;
    triggered: boolean;
    reason: string;
    recommendedAction: string | null;
    severity: string;
  }>;
  healthUpdate: string | null;
  recommendationUpdates: string[];
}

/**
 * Evaluate a single rule against current metrics.
 * Pure logic — no DB calls.
 */
export function evaluateRule(
  rule: { id: string; name: string; rule_type: string; condition_json: any; action_json: any },
  metrics: AutomationMetricsSnapshot,
): { triggered: boolean; reason: string; recommendedAction: string | null; severity: string } {
  const condition = typeof rule.condition_json === 'string' ? JSON.parse(rule.condition_json) : rule.condition_json;
  const actionJson = typeof rule.action_json === 'string' ? JSON.parse(rule.action_json) : rule.action_json;

  const minSample = condition.minSampleSize ?? 10;
  if (metrics.views < minSample) {
    return { triggered: false, reason: `Not enough data (${metrics.views} views, need ${minSample}).`, recommendedAction: null, severity: 'low' };
  }

  if (!condition.metric || !condition.operator || condition.threshold === undefined) {
    return { triggered: false, reason: 'Incomplete condition.', recommendedAction: null, severity: 'low' };
  }

  const metricMap: Record<string, number> = {
    views: metrics.views,
    ctaClicks: metrics.ctaClicks,
    formStarts: metrics.formStarts,
    formSubmits: metrics.formSubmits,
    ctr: metrics.ctr,
    conversionRate: metrics.conversionRate,
  };
  const val = metricMap[condition.metric] ?? 0;
  let triggered = false;

  switch (condition.operator) {
    case 'lt': triggered = val < condition.threshold; break;
    case 'gt': triggered = val > condition.threshold; break;
    case 'lte': triggered = val <= condition.threshold; break;
    case 'gte': triggered = val >= condition.threshold; break;
    case 'eq': triggered = val === condition.threshold; break;
  }

  const reason = triggered
    ? `${condition.metric} is ${val} (${condition.operator} ${condition.threshold}).`
    : `${condition.metric} (${val}) does not meet ${condition.operator} ${condition.threshold}.`;

  return {
    triggered,
    reason,
    recommendedAction: triggered ? (actionJson.label || null) : null,
    severity: triggered ? (rule.rule_type.includes('alert') ? 'high' : 'medium') : 'low',
  };
}

/**
 * Build automation run outcome from a set of evaluation results.
 */
export function buildRunOutcome(
  landingPageId: string,
  results: Array<{ ruleId: string; ruleName: string; ruleType: string; triggered: boolean; reason: string; recommendedAction: string | null; severity: string }>,
): AutomationRunOutcome {
  const triggeredCount = results.filter(r => r.triggered).length;
  return {
    landingPageId,
    evaluatedCount: results.length,
    triggeredCount,
    results,
    healthUpdate: triggeredCount > 0 ? `${triggeredCount} automation${triggeredCount > 1 ? 's' : ''} triggered.` : null,
    recommendationUpdates: results.filter(r => r.triggered && r.recommendedAction).map(r => r.recommendedAction!),
  };
}
