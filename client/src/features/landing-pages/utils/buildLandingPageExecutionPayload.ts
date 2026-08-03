// Phase 7: Build Landing Page Execution Payload
// Constructs typed execution payloads for each execution type.

import type { LandingPageExecutionType } from '../types/landingPageExecution.types';

export interface ExecutionPayloadBase {
  landingPageId: string;
  executionType: LandingPageExecutionType;
  timestamp: string;
}

export function buildGeneratePromoPackPayload(landingPageId: string, options?: { channels?: string[]; tone?: string }): ExecutionPayloadBase & Record<string, unknown> {
  return {
    landingPageId,
    executionType: 'generate_promo_pack',
    timestamp: new Date().toISOString(),
    channels: options?.channels ?? ['social', 'email', 'gmb'],
    tone: options?.tone ?? 'professional',
  };
}

export function buildCreateVariantPayload(landingPageId: string, options?: { variantName?: string; changeType?: string }): ExecutionPayloadBase & Record<string, unknown> {
  return {
    landingPageId,
    executionType: 'create_variant',
    timestamp: new Date().toISOString(),
    variantName: options?.variantName ?? 'Auto-generated variant',
    changeType: options?.changeType ?? 'headline',
  };
}

export function buildCreateRerunDraftPayload(landingPageId: string, options?: { updateTitle?: boolean }): ExecutionPayloadBase & Record<string, unknown> {
  return {
    landingPageId,
    executionType: 'create_rerun_draft',
    timestamp: new Date().toISOString(),
    updateTitle: options?.updateTitle ?? true,
  };
}

export function buildQueueSocialPromoPayload(landingPageId: string, options?: { platform?: string; message?: string }): ExecutionPayloadBase & Record<string, unknown> {
  return {
    landingPageId,
    executionType: 'queue_social_promo',
    timestamp: new Date().toISOString(),
    platform: options?.platform ?? 'instagram',
    message: options?.message ?? '',
  };
}

export function buildQueueGmbPromoPayload(landingPageId: string, options?: { postType?: string }): ExecutionPayloadBase & Record<string, unknown> {
  return {
    landingPageId,
    executionType: 'queue_gmb_promo',
    timestamp: new Date().toISOString(),
    postType: options?.postType ?? 'update',
  };
}

export function buildQueueEmailPromoPayload(landingPageId: string, options?: { subject?: string; recipientList?: string }): ExecutionPayloadBase & Record<string, unknown> {
  return {
    landingPageId,
    executionType: 'queue_email_promo',
    timestamp: new Date().toISOString(),
    subject: options?.subject ?? '',
    recipientList: options?.recipientList ?? 'all',
  };
}

export function buildCreateFollowUpTaskPayload(landingPageId: string, options?: { taskTitle?: string; dueInDays?: number }): ExecutionPayloadBase & Record<string, unknown> {
  return {
    landingPageId,
    executionType: 'create_follow_up_task',
    timestamp: new Date().toISOString(),
    taskTitle: options?.taskTitle ?? 'Follow up on landing page campaign',
    dueInDays: options?.dueInDays ?? 3,
  };
}

export function buildPushCrmSignalPayload(landingPageId: string, options?: { signalType?: string; leadScore?: number }): ExecutionPayloadBase & Record<string, unknown> {
  return {
    landingPageId,
    executionType: 'push_crm_signal',
    timestamp: new Date().toISOString(),
    signalType: options?.signalType ?? 'engagement',
    leadScore: options?.leadScore ?? 0,
  };
}

export function buildCreateSeasonalClonePayload(landingPageId: string, options?: { targetSeason?: string; targetYear?: number }): ExecutionPayloadBase & Record<string, unknown> {
  return {
    landingPageId,
    executionType: 'create_seasonal_clone',
    timestamp: new Date().toISOString(),
    targetSeason: options?.targetSeason ?? 'next',
    targetYear: options?.targetYear ?? new Date().getFullYear() + 1,
  };
}

export function buildRefreshCtaCopyPayload(landingPageId: string, options?: { currentCta?: string; tone?: string }): ExecutionPayloadBase & Record<string, unknown> {
  return {
    landingPageId,
    executionType: 'refresh_cta_copy',
    timestamp: new Date().toISOString(),
    currentCta: options?.currentCta ?? '',
    tone: options?.tone ?? 'action-oriented',
  };
}

export function buildRefreshHeadlineVariantPayload(landingPageId: string, options?: { currentHeadline?: string; style?: string }): ExecutionPayloadBase & Record<string, unknown> {
  return {
    landingPageId,
    executionType: 'refresh_headline_variant',
    timestamp: new Date().toISOString(),
    currentHeadline: options?.currentHeadline ?? '',
    style: options?.style ?? 'benefit-focused',
  };
}

export function buildExecutionPayload(executionType: LandingPageExecutionType, landingPageId: string, options?: Record<string, unknown>): ExecutionPayloadBase & Record<string, unknown> {
  switch (executionType) {
    case 'generate_promo_pack': return buildGeneratePromoPackPayload(landingPageId, options);
    case 'create_variant': return buildCreateVariantPayload(landingPageId, options);
    case 'create_rerun_draft': return buildCreateRerunDraftPayload(landingPageId, options);
    case 'queue_social_promo': return buildQueueSocialPromoPayload(landingPageId, options);
    case 'queue_gmb_promo': return buildQueueGmbPromoPayload(landingPageId, options);
    case 'queue_email_promo': return buildQueueEmailPromoPayload(landingPageId, options);
    case 'create_follow_up_task': return buildCreateFollowUpTaskPayload(landingPageId, options);
    case 'push_crm_signal': return buildPushCrmSignalPayload(landingPageId, options);
    case 'create_seasonal_clone': return buildCreateSeasonalClonePayload(landingPageId, options);
    case 'refresh_cta_copy': return buildRefreshCtaCopyPayload(landingPageId, options);
    case 'refresh_headline_variant': return buildRefreshHeadlineVariantPayload(landingPageId, options);
  }
}
