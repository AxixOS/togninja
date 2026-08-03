// Phase 6: Landing Page Automation Constants

import type { LandingPageAutomationRuleType } from '../types/landingPageAutomation.types';

export const AUTOMATION_RULE_TYPES: Record<LandingPageAutomationRuleType, { label: string; description: string; defaultFrequency: string }> = {
  ctr_drop_alert: {
    label: 'CTR Drop Alert',
    description: 'Alert when click-through rate drops significantly compared to the previous period.',
    defaultFrequency: 'daily',
  },
  low_conversion_alert: {
    label: 'Low Conversion Alert',
    description: 'Alert when CTA clicks exist but form submissions or bookings remain low.',
    defaultFrequency: 'daily',
  },
  auto_variant_suggestion: {
    label: 'Auto Variant Suggestion',
    description: 'Suggest creating a new variant when traffic is sufficient but performance is weak.',
    defaultFrequency: 'weekly',
  },
  promo_reminder: {
    label: 'Promo Reminder',
    description: 'Remind to promote the page again after a period of low traffic.',
    defaultFrequency: 'weekly',
  },
  promo_pack_refresh: {
    label: 'Promo Pack Refresh',
    description: 'Suggest generating a fresh promo pack when the campaign is still live but stale.',
    defaultFrequency: 'biweekly',
  },
  seasonal_reactivation: {
    label: 'Seasonal Reactivation',
    description: 'Schedule relaunch of seasonal campaigns at the right time next year.',
    defaultFrequency: 'yearly',
  },
  dormant_campaign_alert: {
    label: 'Dormant Campaign Alert',
    description: 'Flag campaigns that received little or no traffic for an extended period.',
    defaultFrequency: 'weekly',
  },
  lead_routing_trigger: {
    label: 'Lead Routing Trigger',
    description: 'Create CRM routing suggestions when strong lead-intent signals are detected.',
    defaultFrequency: 'daily',
  },
  cta_underperformance_alert: {
    label: 'CTA Underperformance Alert',
    description: 'Alert when a specific CTA is getting views but very few clicks.',
    defaultFrequency: 'daily',
  },
};

export const AUTOMATION_EVENT_TYPES = {
  RULE_TRIGGERED: 'rule_triggered',
  RULE_EVALUATED: 'rule_evaluated',
  RECOMMENDATION_CREATED: 'recommendation_created',
  VARIANT_SUGGESTED: 'variant_suggested',
  PROMO_REMINDER_SENT: 'promo_reminder_sent',
  DORMANT_FLAGGED: 'dormant_flagged',
  SEASONAL_SCHEDULED: 'seasonal_scheduled',
  CRM_SIGNAL_DETECTED: 'crm_signal_detected',
  HEALTH_STATE_CHANGED: 'health_state_changed',
  SCHEDULED_ACTION_CREATED: 'scheduled_action_created',
  SCHEDULED_ACTION_EXECUTED: 'scheduled_action_executed',
  AUTOMATION_RUN_COMPLETED: 'automation_run_completed',
} as const;

export const CAMPAIGN_HEALTH_STATES = {
  healthy: { label: 'Healthy', color: 'green', icon: 'check-circle' },
  rising: { label: 'Rising', color: 'emerald', icon: 'trending-up' },
  stable: { label: 'Stable', color: 'blue', icon: 'minus-circle' },
  needs_attention: { label: 'Needs Attention', color: 'yellow', icon: 'alert-triangle' },
  stalled: { label: 'Stalled', color: 'orange', icon: 'pause-circle' },
  dormant: { label: 'Dormant', color: 'gray', icon: 'moon' },
} as const;

export const DEFAULT_AUTOMATION_THRESHOLDS = {
  ctrDropPercent: 20,
  lowConversionMinClicks: 10,
  variantSuggestionMinViews: 50,
  promoReminderDaysIdle: 7,
  promoPackRefreshDays: 14,
  dormantDaysThreshold: 30,
  leadRoutingMinSignals: 3,
  ctaUnderperformanceMinViews: 30,
  ctaUnderperformanceMaxCtr: 2,
} as const;

export const SCHEDULED_ACTION_TYPES = {
  PROMO_REMINDER: 'promo_reminder',
  PROMO_PACK_REFRESH: 'promo_pack_refresh',
  SEASONAL_RELAUNCH: 'seasonal_relaunch',
  DORMANT_CHECK: 'dormant_check',
  PERFORMANCE_REVIEW: 'performance_review',
} as const;
