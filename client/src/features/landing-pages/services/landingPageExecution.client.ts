// Phase 7: Landing Page Execution Client Service

import { apiRequest } from '@/lib/queryClient';
import type {
  LandingPageExecutionRecord,
  CreateLandingPageExecutionInput,
  LandingPageExecutionQueueSummary,
  LandingPageExecutionSettingsRecord,
  UpdateLandingPageExecutionSettingsInput,
} from '../types/landingPageExecution.types';

const BASE = '/api/admin/landing-pages';

// ── Executions ──────────────────────────────────────────────

export async function listLandingPageExecutions(
  landingPageId: string,
  options?: { status?: string; approvalStatus?: string; limit?: number; offset?: number },
): Promise<LandingPageExecutionRecord[]> {
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.approvalStatus) params.set('approval_status', options.approvalStatus);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  const qs = params.toString();
  return apiRequest(`${BASE}/${landingPageId}/executions${qs ? `?${qs}` : ''}`);
}

export async function getLandingPageExecutionSummary(landingPageId: string): Promise<LandingPageExecutionQueueSummary> {
  return apiRequest(`${BASE}/${landingPageId}/executions/summary`);
}

export async function createLandingPageExecution(
  landingPageId: string,
  payload: { execution_type: string; automation_rule_id?: string; source_event_id?: string; requested_payload?: Record<string, unknown> },
): Promise<LandingPageExecutionRecord> {
  return apiRequest(`${BASE}/${landingPageId}/executions`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function approveLandingPageExecution(landingPageId: string, executionId: string): Promise<LandingPageExecutionRecord> {
  return apiRequest(`${BASE}/${landingPageId}/executions/${executionId}/approve`, {
    method: 'POST',
  });
}

export async function rejectLandingPageExecution(landingPageId: string, executionId: string): Promise<LandingPageExecutionRecord> {
  return apiRequest(`${BASE}/${landingPageId}/executions/${executionId}/reject`, {
    method: 'POST',
  });
}

export async function retryLandingPageExecution(landingPageId: string, executionId: string): Promise<LandingPageExecutionRecord> {
  return apiRequest(`${BASE}/${landingPageId}/executions/${executionId}/retry`, {
    method: 'POST',
  });
}

export async function cancelLandingPageExecution(landingPageId: string, executionId: string): Promise<LandingPageExecutionRecord> {
  return apiRequest(`${BASE}/${landingPageId}/executions/${executionId}/cancel`, {
    method: 'POST',
  });
}

export async function runLandingPageExecution(landingPageId: string, executionId: string): Promise<LandingPageExecutionRecord> {
  return apiRequest(`${BASE}/${landingPageId}/executions/${executionId}/run`, {
    method: 'POST',
  });
}

// ── Awaiting Approval (cross-page) ─────────────────────────

export async function getAwaitingApprovalExecutions(): Promise<LandingPageExecutionRecord[]> {
  return apiRequest(`${BASE}/executions/awaiting-approval`);
}

// ── Execution Settings ──────────────────────────────────────

export async function getLandingPageExecutionSettings(landingPageId: string): Promise<LandingPageExecutionSettingsRecord> {
  return apiRequest(`${BASE}/${landingPageId}/execution-settings`);
}

export async function updateLandingPageExecutionSettings(
  landingPageId: string,
  payload: UpdateLandingPageExecutionSettingsInput,
): Promise<LandingPageExecutionSettingsRecord> {
  return apiRequest(`${BASE}/${landingPageId}/execution-settings`, {
    method: 'PUT',
    body: JSON.stringify({
      auto_execute_safe_actions: payload.autoExecuteSafeActions,
      require_approval_for_content_changes: payload.requireApprovalForContentChanges,
      require_approval_for_crm_pushes: payload.requireApprovalForCrmPushes,
      require_approval_for_variant_creation: payload.requireApprovalForVariantCreation,
    }),
    headers: { 'Content-Type': 'application/json' },
  });
}
