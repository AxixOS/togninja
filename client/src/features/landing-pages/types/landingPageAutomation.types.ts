// Phase 6: Landing Page Automation Types

// ── Rule Types ──────────────────────────────────────────────

export type LandingPageAutomationRuleType =
  | 'ctr_drop_alert'
  | 'low_conversion_alert'
  | 'auto_variant_suggestion'
  | 'promo_reminder'
  | 'promo_pack_refresh'
  | 'seasonal_reactivation'
  | 'dormant_campaign_alert'
  | 'lead_routing_trigger'
  | 'cta_underperformance_alert';

export interface LandingPageAutomationCondition {
  metric?: string;
  operator?: 'lt' | 'gt' | 'lte' | 'gte' | 'eq' | 'drop_pct' | 'rise_pct';
  threshold?: number;
  windowDays?: number;
  compareWindowDays?: number;
  minSampleSize?: number;
  customKey?: string;
  customValue?: string;
}

export interface LandingPageAutomationAction {
  type: 'log_event' | 'create_recommendation' | 'suggest_variant' | 'schedule_reminder' | 'suggest_promo_refresh' | 'flag_dormant' | 'crm_signal';
  label?: string;
  payload?: Record<string, unknown>;
}

export interface LandingPageAutomationRuleRecord {
  id: string;
  landingPageId: string;
  userId: string;
  ruleType: LandingPageAutomationRuleType;
  name: string;
  isEnabled: boolean;
  conditionJson: LandingPageAutomationCondition;
  actionJson: LandingPageAutomationAction;
  frequency: string | null;
  lastEvaluatedAt: string | null;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLandingPageAutomationRuleInput {
  ruleType: LandingPageAutomationRuleType;
  name: string;
  isEnabled?: boolean;
  conditionJson?: LandingPageAutomationCondition;
  actionJson?: LandingPageAutomationAction;
  frequency?: string | null;
}

export interface UpdateLandingPageAutomationRuleInput {
  name?: string;
  isEnabled?: boolean;
  conditionJson?: LandingPageAutomationCondition;
  actionJson?: LandingPageAutomationAction;
  frequency?: string | null;
}

// ── Event Types ─────────────────────────────────────────────

export type LandingPageAutomationEventStatus = 'info' | 'warning' | 'success' | 'error';

export interface LandingPageAutomationEventRecord {
  id: string;
  landingPageId: string;
  userId: string;
  automationRuleId: string | null;
  eventType: string;
  eventStatus: LandingPageAutomationEventStatus;
  summary: string;
  detailJson: Record<string, unknown>;
  occurredAt: string;
}

export interface CreateLandingPageAutomationEventInput {
  landingPageId: string;
  userId: string;
  automationRuleId?: string | null;
  eventType: string;
  eventStatus?: LandingPageAutomationEventStatus;
  summary: string;
  detailJson?: Record<string, unknown>;
}

// ── Scheduled Actions ───────────────────────────────────────

export type LandingPageScheduledActionStatus = 'pending' | 'executed' | 'failed' | 'cancelled';

export interface LandingPageScheduledActionRecord {
  id: string;
  landingPageId: string;
  userId: string;
  actionType: string;
  actionPayload: Record<string, unknown>;
  scheduledFor: string;
  status: LandingPageScheduledActionStatus;
  executedAt: string | null;
  createdAt: string;
}

export interface CreateLandingPageScheduledActionInput {
  actionType: string;
  actionPayload?: Record<string, unknown>;
  scheduledFor: string;
}

// ── Evaluation Outcomes ─────────────────────────────────────

export interface LandingPageAutomationEvalResult {
  ruleId: string;
  ruleName: string;
  ruleType: LandingPageAutomationRuleType;
  triggered: boolean;
  reason: string;
  recommendedAction: string | null;
  severity: 'low' | 'medium' | 'high';
}

export interface LandingPageAutomationRunResult {
  landingPageId: string;
  evaluatedCount: number;
  triggeredCount: number;
  results: LandingPageAutomationEvalResult[];
  healthUpdate: string | null;
  recommendationUpdates: string[];
}

// ── Automation Signal ───────────────────────────────────────

export interface LandingPageAutomationSignal {
  signalType: string;
  source: string;
  value: number;
  label: string;
  detectedAt: string;
}
