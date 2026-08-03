// Phase 7: Execution Settings Server Service
// Encapsulates settings normalization and defaults.

export interface ExecutionSettingsDefaults {
  autoExecuteSafeActions: boolean;
  requireApprovalForContentChanges: boolean;
  requireApprovalForCrmPushes: boolean;
  requireApprovalForVariantCreation: boolean;
}

export const DEFAULT_EXECUTION_SETTINGS: ExecutionSettingsDefaults = {
  autoExecuteSafeActions: false,
  requireApprovalForContentChanges: true,
  requireApprovalForCrmPushes: true,
  requireApprovalForVariantCreation: true,
};

export function normalizeSettingsRow(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    landingPageId: row.landing_page_id,
    autoExecuteSafeActions: row.auto_execute_safe_actions ?? false,
    requireApprovalForContentChanges: row.require_approval_for_content_changes ?? true,
    requireApprovalForCrmPushes: row.require_approval_for_crm_pushes ?? true,
    requireApprovalForVariantCreation: row.require_approval_for_variant_creation ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mergeWithDefaults(input: Partial<ExecutionSettingsDefaults>): ExecutionSettingsDefaults {
  return {
    autoExecuteSafeActions: input.autoExecuteSafeActions ?? DEFAULT_EXECUTION_SETTINGS.autoExecuteSafeActions,
    requireApprovalForContentChanges: input.requireApprovalForContentChanges ?? DEFAULT_EXECUTION_SETTINGS.requireApprovalForContentChanges,
    requireApprovalForCrmPushes: input.requireApprovalForCrmPushes ?? DEFAULT_EXECUTION_SETTINGS.requireApprovalForCrmPushes,
    requireApprovalForVariantCreation: input.requireApprovalForVariantCreation ?? DEFAULT_EXECUTION_SETTINGS.requireApprovalForVariantCreation,
  };
}
