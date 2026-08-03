// Phase 6: Map Landing Page to Automation Action

import type { LandingPageAutomationAction, LandingPageAutomationEvalResult } from '../types/landingPageAutomation.types';

export interface AutomationActionOutput {
  actionType: string;
  label: string;
  description: string;
  payload: Record<string, unknown>;
  requiresUserAction: boolean;
}

export function mapEvalResultToAction(result: LandingPageAutomationEvalResult, landingPageId: string): AutomationActionOutput | null {
  if (!result.triggered) return null;

  switch (result.ruleType) {
    case 'ctr_drop_alert':
      return {
        actionType: 'alert',
        label: 'CTR Drop Detected',
        description: result.reason,
        payload: { landingPageId, ruleId: result.ruleId, severity: result.severity },
        requiresUserAction: true,
      };

    case 'low_conversion_alert':
      return {
        actionType: 'alert',
        label: 'Low Conversion Detected',
        description: result.reason,
        payload: { landingPageId, ruleId: result.ruleId, severity: result.severity },
        requiresUserAction: true,
      };

    case 'auto_variant_suggestion':
      return {
        actionType: 'suggest_variant',
        label: 'Create a New Variant',
        description: 'Performance suggests testing a different headline or CTA.',
        payload: { landingPageId, ruleId: result.ruleId, suggestedIntent: 'stronger_headline' },
        requiresUserAction: true,
      };

    case 'promo_reminder':
      return {
        actionType: 'reminder',
        label: 'Promote This Page',
        description: 'Traffic is low. Share this page on social media or via email.',
        payload: { landingPageId, ruleId: result.ruleId },
        requiresUserAction: true,
      };

    case 'promo_pack_refresh':
      return {
        actionType: 'suggestion',
        label: 'Refresh Promo Pack',
        description: 'Generate fresh promotional content for this campaign.',
        payload: { landingPageId, ruleId: result.ruleId },
        requiresUserAction: true,
      };

    case 'seasonal_reactivation':
      return {
        actionType: 'schedule',
        label: 'Schedule Seasonal Relaunch',
        description: 'This seasonal campaign could be relaunched for the next relevant period.',
        payload: { landingPageId, ruleId: result.ruleId },
        requiresUserAction: true,
      };

    case 'dormant_campaign_alert':
      return {
        actionType: 'alert',
        label: 'Dormant Campaign',
        description: 'This campaign has had no significant traffic. Consider relaunching or archiving.',
        payload: { landingPageId, ruleId: result.ruleId, severity: result.severity },
        requiresUserAction: true,
      };

    case 'lead_routing_trigger':
      return {
        actionType: 'crm_signal',
        label: 'Lead Routing Opportunity',
        description: 'Strong lead-intent signals detected. Consider manual follow-up.',
        payload: { landingPageId, ruleId: result.ruleId },
        requiresUserAction: true,
      };

    case 'cta_underperformance_alert':
      return {
        actionType: 'alert',
        label: 'CTA Underperforming',
        description: result.reason,
        payload: { landingPageId, ruleId: result.ruleId, severity: result.severity },
        requiresUserAction: true,
      };

    default:
      return null;
  }
}

export function mapEvalResultsToActions(results: LandingPageAutomationEvalResult[], landingPageId: string): AutomationActionOutput[] {
  return results
    .map(r => mapEvalResultToAction(r, landingPageId))
    .filter((a): a is AutomationActionOutput => a !== null);
}
