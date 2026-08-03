// Phase 6: Landing Page Automation Rule Templates

import type { LandingPageAutomationRuleType, LandingPageAutomationCondition, LandingPageAutomationAction } from '../types/landingPageAutomation.types';
import { DEFAULT_AUTOMATION_THRESHOLDS } from './landingPageAutomation.constants';

export interface AutomationRuleTemplate {
  ruleType: LandingPageAutomationRuleType;
  name: string;
  description: string;
  defaultCondition: LandingPageAutomationCondition;
  defaultAction: LandingPageAutomationAction;
  defaultFrequency: string;
}

export const AUTOMATION_RULE_TEMPLATES: AutomationRuleTemplate[] = [
  {
    ruleType: 'ctr_drop_alert',
    name: 'CTR Drop Alert',
    description: 'Alert when click-through rate drops significantly.',
    defaultCondition: {
      metric: 'ctr',
      operator: 'drop_pct',
      threshold: DEFAULT_AUTOMATION_THRESHOLDS.ctrDropPercent,
      windowDays: 7,
      compareWindowDays: 7,
      minSampleSize: 20,
    },
    defaultAction: { type: 'create_recommendation', label: 'Review CTA and headline' },
    defaultFrequency: 'daily',
  },
  {
    ruleType: 'low_conversion_alert',
    name: 'Low Conversion Alert',
    description: 'Alert when CTA clicks exist but conversions remain low.',
    defaultCondition: {
      metric: 'conversionRate',
      operator: 'lt',
      threshold: 2,
      windowDays: 7,
      minSampleSize: DEFAULT_AUTOMATION_THRESHOLDS.lowConversionMinClicks,
    },
    defaultAction: { type: 'create_recommendation', label: 'Optimize form or offer' },
    defaultFrequency: 'daily',
  },
  {
    ruleType: 'auto_variant_suggestion',
    name: 'Auto Variant Suggestion',
    description: 'Suggest a new variant when traffic is sufficient but CTR is weak.',
    defaultCondition: {
      metric: 'ctr',
      operator: 'lt',
      threshold: 3,
      windowDays: 14,
      minSampleSize: DEFAULT_AUTOMATION_THRESHOLDS.variantSuggestionMinViews,
    },
    defaultAction: { type: 'suggest_variant', label: 'Create headline/CTA variant' },
    defaultFrequency: 'weekly',
  },
  {
    ruleType: 'promo_reminder',
    name: 'Promo Reminder',
    description: 'Remind to promote the page after a period of low traffic.',
    defaultCondition: {
      metric: 'views',
      operator: 'lt',
      threshold: 5,
      windowDays: DEFAULT_AUTOMATION_THRESHOLDS.promoReminderDaysIdle,
      minSampleSize: 0,
    },
    defaultAction: { type: 'schedule_reminder', label: 'Promote this page again' },
    defaultFrequency: 'weekly',
  },
  {
    ruleType: 'promo_pack_refresh',
    name: 'Promo Pack Refresh',
    description: 'Suggest generating fresh promo content for an active campaign.',
    defaultCondition: {
      metric: 'views',
      operator: 'gt',
      threshold: 0,
      windowDays: DEFAULT_AUTOMATION_THRESHOLDS.promoPackRefreshDays,
      minSampleSize: 0,
    },
    defaultAction: { type: 'suggest_promo_refresh', label: 'Generate fresh promo pack' },
    defaultFrequency: 'biweekly',
  },
  {
    ruleType: 'seasonal_reactivation',
    name: 'Seasonal Reactivation',
    description: 'Schedule relaunch of seasonal campaigns at the right time.',
    defaultCondition: {
      metric: 'views',
      operator: 'gte',
      threshold: 0,
      windowDays: 365,
      minSampleSize: 0,
      customKey: 'seasonal',
      customValue: 'true',
    },
    defaultAction: { type: 'schedule_reminder', label: 'Relaunch seasonal campaign' },
    defaultFrequency: 'yearly',
  },
  {
    ruleType: 'dormant_campaign_alert',
    name: 'Dormant Campaign Alert',
    description: 'Flag campaigns with little or no traffic for an extended period.',
    defaultCondition: {
      metric: 'views',
      operator: 'lt',
      threshold: 3,
      windowDays: DEFAULT_AUTOMATION_THRESHOLDS.dormantDaysThreshold,
      minSampleSize: 0,
    },
    defaultAction: { type: 'flag_dormant', label: 'Relaunch or archive this campaign' },
    defaultFrequency: 'weekly',
  },
  {
    ruleType: 'lead_routing_trigger',
    name: 'Lead Routing Trigger',
    description: 'Create CRM routing suggestions when lead-intent signals are strong.',
    defaultCondition: {
      metric: 'ctaClicks',
      operator: 'gte',
      threshold: DEFAULT_AUTOMATION_THRESHOLDS.leadRoutingMinSignals,
      windowDays: 7,
      minSampleSize: 0,
    },
    defaultAction: { type: 'crm_signal', label: 'Route leads to CRM' },
    defaultFrequency: 'daily',
  },
];

export function getRuleTemplateByType(ruleType: LandingPageAutomationRuleType): AutomationRuleTemplate | undefined {
  return AUTOMATION_RULE_TEMPLATES.find(t => t.ruleType === ruleType);
}

export function getAllRuleTemplateTypes(): LandingPageAutomationRuleType[] {
  return AUTOMATION_RULE_TEMPLATES.map(t => t.ruleType);
}
