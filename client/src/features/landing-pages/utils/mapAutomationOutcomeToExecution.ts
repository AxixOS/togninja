// Phase 7: Map Automation Outcome to Execution Candidate
// Converts Phase 6 automation outcomes (eval results, recommendations) into execution inputs.

import type { LandingPageAutomationEvalResult } from '../types/landingPageAutomation.types';
import type { LandingPageExecutionType, CreateLandingPageExecutionInput } from '../types/landingPageExecution.types';

interface AutomationOutcome {
  ruleType: string;
  ruleId?: string;
  triggered: boolean;
  severity?: string;
  payload?: Record<string, unknown>;
}

const RULE_TYPE_TO_EXECUTION_TYPE: Record<string, LandingPageExecutionType> = {
  ctr_drop_alert: 'refresh_cta_copy',
  low_conversion_alert: 'refresh_headline_variant',
  auto_variant_suggestion: 'create_variant',
  promo_reminder: 'queue_social_promo',
  promo_pack_refresh: 'generate_promo_pack',
  seasonal_reactivation: 'create_seasonal_clone',
  dormant_campaign_alert: 'create_rerun_draft',
  lead_routing_trigger: 'push_crm_signal',
  cta_underperformance_alert: 'refresh_cta_copy',
};

export function mapAutomationOutcomeToExecutionType(ruleType: string): LandingPageExecutionType | null {
  return RULE_TYPE_TO_EXECUTION_TYPE[ruleType] ?? null;
}

export function mapAutomationOutcomeToExecution(
  outcome: AutomationOutcome,
  landingPageId: string,
  userId: string,
): CreateLandingPageExecutionInput | null {
  if (!outcome.triggered) return null;

  const executionType = mapAutomationOutcomeToExecutionType(outcome.ruleType);
  if (!executionType) return null;

  return {
    landingPageId,
    userId,
    automationRuleId: outcome.ruleId ?? null,
    executionType,
    requestedPayload: {
      sourceRuleType: outcome.ruleType,
      severity: outcome.severity ?? 'medium',
      ...outcome.payload,
    },
  };
}

export function mapEvalResultsToExecutions(
  results: LandingPageAutomationEvalResult[],
  landingPageId: string,
  userId: string,
): CreateLandingPageExecutionInput[] {
  return results
    .filter((r) => r.triggered)
    .map((r) =>
      mapAutomationOutcomeToExecution(
        { ruleType: r.ruleType, ruleId: r.ruleId, triggered: r.triggered, severity: r.severity },
        landingPageId,
        userId,
      ),
    )
    .filter((input): input is CreateLandingPageExecutionInput => input !== null);
}
