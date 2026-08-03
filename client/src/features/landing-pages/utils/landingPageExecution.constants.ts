// Phase 7: Landing Page Execution Constants

import type { LandingPageExecutionType, LandingPageExecutionStatus, LandingPageApprovalStatus } from '../types/landingPageExecution.types';

export const EXECUTION_TYPES: Record<LandingPageExecutionType, { label: string; description: string; icon: string }> = {
  generate_promo_pack: {
    label: 'Generate Promo Pack',
    description: 'Generate a fresh promotional materials pack for the landing page.',
    icon: 'package',
  },
  create_variant: {
    label: 'Create Variant',
    description: 'Create a new A/B test variant of the landing page.',
    icon: 'copy',
  },
  create_rerun_draft: {
    label: 'Create Rerun Draft',
    description: 'Clone the page as a new draft for a re-run campaign.',
    icon: 'refresh-cw',
  },
  queue_social_promo: {
    label: 'Queue Social Promo',
    description: 'Queue a social media promotional post for the landing page.',
    icon: 'share-2',
  },
  queue_gmb_promo: {
    label: 'Queue GMB Promo',
    description: 'Queue a Google My Business promotional post.',
    icon: 'map-pin',
  },
  queue_email_promo: {
    label: 'Queue Email Promo',
    description: 'Queue a promotional email campaign for the landing page.',
    icon: 'mail',
  },
  create_follow_up_task: {
    label: 'Create Follow-Up Task',
    description: 'Create a follow-up task related to the landing page campaign.',
    icon: 'check-square',
  },
  push_crm_signal: {
    label: 'Push CRM Signal',
    description: 'Push a lead-intent or engagement signal to the CRM pipeline.',
    icon: 'send',
  },
  create_seasonal_clone: {
    label: 'Create Seasonal Clone',
    description: 'Clone and update a page for the next seasonal period.',
    icon: 'calendar',
  },
  refresh_cta_copy: {
    label: 'Refresh CTA Copy',
    description: 'Generate fresh call-to-action copy variations.',
    icon: 'type',
  },
  refresh_headline_variant: {
    label: 'Refresh Headline Variant',
    description: 'Generate fresh headline copy variations for testing.',
    icon: 'heading',
  },
};

export const EXECUTION_STATUSES: Record<LandingPageExecutionStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: 'gray', icon: 'clock' },
  awaiting_approval: { label: 'Awaiting Approval', color: 'yellow', icon: 'shield' },
  approved: { label: 'Approved', color: 'blue', icon: 'check' },
  queued: { label: 'Queued', color: 'indigo', icon: 'list' },
  running: { label: 'Running', color: 'purple', icon: 'play' },
  completed: { label: 'Completed', color: 'green', icon: 'check-circle' },
  failed: { label: 'Failed', color: 'red', icon: 'x-circle' },
  rejected: { label: 'Rejected', color: 'orange', icon: 'x' },
  cancelled: { label: 'Cancelled', color: 'gray', icon: 'slash' },
};

export const APPROVAL_STATUSES: Record<LandingPageApprovalStatus, { label: string; color: string }> = {
  not_required: { label: 'Not Required', color: 'gray' },
  pending: { label: 'Pending Approval', color: 'yellow' },
  approved: { label: 'Approved', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
};

export const DEFAULT_RETRY_LIMIT = 3;

export const EXECUTION_QUEUE_LIMITS = {
  maxPendingPerPage: 20,
  maxRunningConcurrent: 3,
  maxRetriesPerExecution: 3,
  recentExecutionsDisplayCount: 10,
} as const;
