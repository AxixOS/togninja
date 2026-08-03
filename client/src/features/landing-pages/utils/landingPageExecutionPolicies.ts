// Phase 7: Execution Safety Policies

import type { LandingPageExecutionType } from '../types/landingPageExecution.types';
import type { LandingPageExecutionPolicy } from '../types/landingPageExecutionPolicy.types';

export const EXECUTION_POLICIES: Record<LandingPageExecutionType, LandingPageExecutionPolicy> = {
  generate_promo_pack: {
    executionType: 'generate_promo_pack',
    safetyLevel: 'safe',
    label: 'Generate Promo Pack',
    description: 'Generates promotional materials without modifying existing content.',
    requiresApprovalByDefault: false,
    canAutoExecute: true,
    maxRetries: 3,
  },
  create_variant: {
    executionType: 'create_variant',
    safetyLevel: 'review_required',
    label: 'Create Variant',
    description: 'Creates a new variant of the landing page for A/B testing.',
    requiresApprovalByDefault: true,
    canAutoExecute: false,
    maxRetries: 2,
  },
  create_rerun_draft: {
    executionType: 'create_rerun_draft',
    safetyLevel: 'review_required',
    label: 'Create Rerun Draft',
    description: 'Clones the page into a new draft for re-running the campaign.',
    requiresApprovalByDefault: true,
    canAutoExecute: false,
    maxRetries: 2,
  },
  queue_social_promo: {
    executionType: 'queue_social_promo',
    safetyLevel: 'safe',
    label: 'Queue Social Promo',
    description: 'Queues a social media post without immediately publishing.',
    requiresApprovalByDefault: false,
    canAutoExecute: true,
    maxRetries: 3,
  },
  queue_gmb_promo: {
    executionType: 'queue_gmb_promo',
    safetyLevel: 'safe',
    label: 'Queue GMB Promo',
    description: 'Queues a Google My Business post without immediately publishing.',
    requiresApprovalByDefault: false,
    canAutoExecute: true,
    maxRetries: 3,
  },
  queue_email_promo: {
    executionType: 'queue_email_promo',
    safetyLevel: 'review_required',
    label: 'Queue Email Promo',
    description: 'Queues an email campaign that will be sent to contacts.',
    requiresApprovalByDefault: true,
    canAutoExecute: false,
    maxRetries: 2,
  },
  create_follow_up_task: {
    executionType: 'create_follow_up_task',
    safetyLevel: 'safe',
    label: 'Create Follow-Up Task',
    description: 'Creates a task in the task list for follow-up.',
    requiresApprovalByDefault: false,
    canAutoExecute: true,
    maxRetries: 3,
  },
  push_crm_signal: {
    executionType: 'push_crm_signal',
    safetyLevel: 'restricted',
    label: 'Push CRM Signal',
    description: 'Pushes engagement data to the CRM pipeline. Affects lead management.',
    requiresApprovalByDefault: true,
    canAutoExecute: false,
    maxRetries: 2,
  },
  create_seasonal_clone: {
    executionType: 'create_seasonal_clone',
    safetyLevel: 'review_required',
    label: 'Create Seasonal Clone',
    description: 'Creates a seasonal variant by cloning and updating the page.',
    requiresApprovalByDefault: true,
    canAutoExecute: false,
    maxRetries: 2,
  },
  refresh_cta_copy: {
    executionType: 'refresh_cta_copy',
    safetyLevel: 'review_required',
    label: 'Refresh CTA Copy',
    description: 'Generates new CTA copy that will modify the landing page.',
    requiresApprovalByDefault: true,
    canAutoExecute: false,
    maxRetries: 3,
  },
  refresh_headline_variant: {
    executionType: 'refresh_headline_variant',
    safetyLevel: 'review_required',
    label: 'Refresh Headline Variant',
    description: 'Generates new headline variants that will modify the landing page.',
    requiresApprovalByDefault: true,
    canAutoExecute: false,
    maxRetries: 3,
  },
};

export function getExecutionPolicy(executionType: LandingPageExecutionType): LandingPageExecutionPolicy {
  return EXECUTION_POLICIES[executionType];
}

export function getSafeExecutionTypes(): LandingPageExecutionType[] {
  return (Object.keys(EXECUTION_POLICIES) as LandingPageExecutionType[]).filter(
    (type) => EXECUTION_POLICIES[type].safetyLevel === 'safe'
  );
}

export function getReviewRequiredExecutionTypes(): LandingPageExecutionType[] {
  return (Object.keys(EXECUTION_POLICIES) as LandingPageExecutionType[]).filter(
    (type) => EXECUTION_POLICIES[type].safetyLevel === 'review_required'
  );
}

export function getRestrictedExecutionTypes(): LandingPageExecutionType[] {
  return (Object.keys(EXECUTION_POLICIES) as LandingPageExecutionType[]).filter(
    (type) => EXECUTION_POLICIES[type].safetyLevel === 'restricted'
  );
}
