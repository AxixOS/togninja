// Phase 7: Evaluate Execution Eligibility
// Determines if an execution action is auto-executable based on user settings + policy.

import type { LandingPageExecutionType, LandingPageExecutionSettingsRecord } from '../types/landingPageExecution.types';
import type { LandingPageExecutionEligibilityResult } from '../types/landingPageExecutionPolicy.types';
import { getExecutionPolicy } from './landingPageExecutionPolicies';

export function evaluateLandingPageExecutionEligibility(
  executionType: LandingPageExecutionType,
  settings: LandingPageExecutionSettingsRecord | null,
): LandingPageExecutionEligibilityResult {
  const policy = getExecutionPolicy(executionType);

  if (!policy) {
    return {
      eligible: false,
      executionType,
      safetyLevel: 'restricted',
      requiresApproval: true,
      isAutoExecutable: false,
      reason: `Unknown execution type: ${executionType}`,
    };
  }

  // If no settings, fall back to policy defaults
  if (!settings) {
    return {
      eligible: true,
      executionType,
      safetyLevel: policy.safetyLevel,
      requiresApproval: policy.requiresApprovalByDefault,
      isAutoExecutable: policy.canAutoExecute,
      reason: 'Using default policy (no user settings configured).',
    };
  }

  // Restricted types always require approval
  if (policy.safetyLevel === 'restricted') {
    return {
      eligible: true,
      executionType,
      safetyLevel: 'restricted',
      requiresApproval: true,
      isAutoExecutable: false,
      reason: 'Restricted action — always requires explicit approval.',
    };
  }

  // Check user settings overrides
  const isContentChange = ['create_variant', 'create_rerun_draft', 'create_seasonal_clone', 'refresh_cta_copy', 'refresh_headline_variant'].includes(executionType);
  const isCrmPush = executionType === 'push_crm_signal';
  const isVariantCreation = ['create_variant', 'create_seasonal_clone'].includes(executionType);

  let requiresApproval = policy.requiresApprovalByDefault;
  let isAutoExecutable = policy.canAutoExecute;
  let reason = '';

  // User has opted into auto-executing safe actions
  if (settings.autoExecuteSafeActions && policy.safetyLevel === 'safe') {
    isAutoExecutable = true;
    requiresApproval = false;
    reason = 'Auto-execute enabled for safe actions.';
  }

  // Content change approval override
  if (isContentChange && settings.requireApprovalForContentChanges) {
    requiresApproval = true;
    isAutoExecutable = false;
    reason = 'User requires approval for content changes.';
  }

  // CRM push approval override
  if (isCrmPush && settings.requireApprovalForCrmPushes) {
    requiresApproval = true;
    isAutoExecutable = false;
    reason = 'User requires approval for CRM pushes.';
  }

  // Variant creation approval override
  if (isVariantCreation && settings.requireApprovalForVariantCreation) {
    requiresApproval = true;
    isAutoExecutable = false;
    reason = 'User requires approval for variant creation.';
  }

  if (!reason) {
    reason = requiresApproval ? 'Approval required by policy default.' : 'Eligible for automatic execution.';
  }

  return {
    eligible: true,
    executionType,
    safetyLevel: policy.safetyLevel,
    requiresApproval,
    isAutoExecutable,
    reason,
  };
}
