// Phase 6: Evaluate Landing Page Automation Rules

import type { LandingPageAutomationRuleRecord, LandingPageAutomationEvalResult, LandingPageAutomationRunResult } from '../types/landingPageAutomation.types';
import type { MetricWindow } from './landingPageAutomation.helpers';
import { shouldTriggerAutomation } from './landingPageAutomation.helpers';

export interface AutomationEvalContext {
  landingPageId: string;
  currentMetrics: MetricWindow;
  previousMetrics: MetricWindow | null;
  publishedDaysAgo: number;
  variantCount: number;
  lastPromotedDaysAgo: number | null;
}

export function evaluateAutomationRule(
  rule: LandingPageAutomationRuleRecord,
  context: AutomationEvalContext,
): LandingPageAutomationEvalResult {
  if (!rule.isEnabled) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.ruleType,
      triggered: false,
      reason: 'Rule is disabled.',
      recommendedAction: null,
      severity: 'low',
    };
  }

  const { triggered, reason } = shouldTriggerAutomation(
    rule.conditionJson,
    context.currentMetrics,
    context.previousMetrics,
  );

  let severity: 'low' | 'medium' | 'high' = 'low';
  if (triggered) {
    switch (rule.ruleType) {
      case 'ctr_drop_alert':
      case 'low_conversion_alert':
      case 'cta_underperformance_alert':
        severity = 'high';
        break;
      case 'auto_variant_suggestion':
      case 'lead_routing_trigger':
        severity = 'medium';
        break;
      default:
        severity = 'low';
    }
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    ruleType: rule.ruleType,
    triggered,
    reason,
    recommendedAction: triggered ? (rule.actionJson.label ?? null) : null,
    severity,
  };
}

export function evaluateAutomationRuleSet(
  rules: LandingPageAutomationRuleRecord[],
  context: AutomationEvalContext,
): LandingPageAutomationRunResult {
  const results = rules.map(rule => evaluateAutomationRule(rule, context));
  const triggeredResults = results.filter(r => r.triggered);

  return {
    landingPageId: context.landingPageId,
    evaluatedCount: results.length,
    triggeredCount: triggeredResults.length,
    results,
    healthUpdate: triggeredResults.length > 0
      ? `${triggeredResults.length} automation${triggeredResults.length > 1 ? 's' : ''} triggered.`
      : null,
    recommendationUpdates: triggeredResults
      .filter(r => r.recommendedAction)
      .map(r => r.recommendedAction!),
  };
}
