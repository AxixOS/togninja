// Phase 6: Landing Page Automation Client Service

import { apiRequest } from '@/lib/queryClient';
import type { LandingPageAutomationRuleRecord, CreateLandingPageAutomationRuleInput, UpdateLandingPageAutomationRuleInput, LandingPageAutomationEventRecord, LandingPageAutomationRunResult } from '../types/landingPageAutomation.types';
import type { LandingPageRecommendationSet } from '../types/landingPageRecommendation.types';
import type { LandingPageCampaignHealthSummary } from '../types/landingPageCampaignHealth.types';
import type { LandingPageLeadScoreSummary } from '../types/landingPageCrm.types';

const BASE = '/api/admin/landing-pages';

// ── Automation Rules ────────────────────────────────────────

export async function listLandingPageAutomationRules(landingPageId: string): Promise<LandingPageAutomationRuleRecord[]> {
  return apiRequest(`${BASE}/${landingPageId}/automation-rules`);
}

export async function createLandingPageAutomationRule(landingPageId: string, payload: CreateLandingPageAutomationRuleInput): Promise<LandingPageAutomationRuleRecord> {
  return apiRequest(`${BASE}/${landingPageId}/automation-rules`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function updateLandingPageAutomationRule(ruleId: string, payload: UpdateLandingPageAutomationRuleInput): Promise<LandingPageAutomationRuleRecord> {
  return apiRequest(`${BASE}/automation-rules/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function deleteLandingPageAutomationRule(ruleId: string): Promise<{ success: boolean }> {
  return apiRequest(`${BASE}/automation-rules/${ruleId}`, {
    method: 'DELETE',
  });
}

// ── Automation Events ───────────────────────────────────────

export async function getLandingPageAutomationEvents(landingPageId: string, limit = 50): Promise<LandingPageAutomationEventRecord[]> {
  return apiRequest(`${BASE}/${landingPageId}/automation-events?limit=${limit}`);
}

// ── Recommendations ─────────────────────────────────────────

export async function getLandingPageRecommendations(landingPageId: string): Promise<LandingPageRecommendationSet> {
  return apiRequest(`${BASE}/${landingPageId}/recommendations`);
}

// ── Campaign Health ─────────────────────────────────────────

export async function getLandingPageCampaignHealth(landingPageId: string): Promise<LandingPageCampaignHealthSummary> {
  return apiRequest(`${BASE}/${landingPageId}/campaign-health`);
}

// ── Scheduled Actions ───────────────────────────────────────

export async function getLandingPageScheduledActions(landingPageId: string): Promise<any[]> {
  return apiRequest(`${BASE}/${landingPageId}/scheduled-actions`);
}

export async function createLandingPageScheduledAction(landingPageId: string, payload: { actionType: string; actionPayload?: Record<string, unknown>; scheduledFor: string }): Promise<any> {
  return apiRequest(`${BASE}/${landingPageId}/scheduled-actions`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── CRM Routing ─────────────────────────────────────────────

export async function getLandingPageCrmRouting(landingPageId: string): Promise<LandingPageLeadScoreSummary> {
  return apiRequest(`${BASE}/${landingPageId}/crm-routing`);
}

// ── Automation Run ──────────────────────────────────────────

export async function runLandingPageAutomation(landingPageId: string): Promise<LandingPageAutomationRunResult> {
  return apiRequest(`${BASE}/${landingPageId}/automation-run`, {
    method: 'POST',
  });
}
