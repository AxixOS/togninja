// Phase 7: Execution Handler Registry
// Maps execution types to their server-side handler function names and metadata.

import type { LandingPageExecutionType } from '../types/landingPageExecution.types';

export interface ExecutionHandlerEntry {
  executionType: LandingPageExecutionType;
  handlerName: string;
  serviceFile: string;
  createsArtifact: boolean;
  artifactType: string | null;
}

export const EXECUTION_HANDLER_REGISTRY: Record<LandingPageExecutionType, ExecutionHandlerEntry> = {
  generate_promo_pack: {
    executionType: 'generate_promo_pack',
    handlerName: 'executeGeneratePromoPack',
    serviceFile: 'landingPageExecutionHandlers.server.ts',
    createsArtifact: false,
    artifactType: null,
  },
  create_variant: {
    executionType: 'create_variant',
    handlerName: 'executeCreateVariant',
    serviceFile: 'landingPageExecutionHandlers.server.ts',
    createsArtifact: true,
    artifactType: 'landing_page_variant',
  },
  create_rerun_draft: {
    executionType: 'create_rerun_draft',
    handlerName: 'executeCreateRerunDraft',
    serviceFile: 'landingPageExecutionHandlers.server.ts',
    createsArtifact: true,
    artifactType: 'landing_page',
  },
  queue_social_promo: {
    executionType: 'queue_social_promo',
    handlerName: 'executeQueueSocialPromo',
    serviceFile: 'landingPageExecutionHandlers.server.ts',
    createsArtifact: false,
    artifactType: null,
  },
  queue_gmb_promo: {
    executionType: 'queue_gmb_promo',
    handlerName: 'executeQueueGmbPromo',
    serviceFile: 'landingPageExecutionHandlers.server.ts',
    createsArtifact: false,
    artifactType: null,
  },
  queue_email_promo: {
    executionType: 'queue_email_promo',
    handlerName: 'executeQueueEmailPromo',
    serviceFile: 'landingPageExecutionHandlers.server.ts',
    createsArtifact: false,
    artifactType: null,
  },
  create_follow_up_task: {
    executionType: 'create_follow_up_task',
    handlerName: 'executeCreateFollowUpTask',
    serviceFile: 'landingPageExecutionHandlers.server.ts',
    createsArtifact: true,
    artifactType: 'task',
  },
  push_crm_signal: {
    executionType: 'push_crm_signal',
    handlerName: 'executePushCrmSignal',
    serviceFile: 'landingPageExecutionHandlers.server.ts',
    createsArtifact: false,
    artifactType: null,
  },
  create_seasonal_clone: {
    executionType: 'create_seasonal_clone',
    handlerName: 'executeCreateSeasonalClone',
    serviceFile: 'landingPageExecutionHandlers.server.ts',
    createsArtifact: true,
    artifactType: 'landing_page',
  },
  refresh_cta_copy: {
    executionType: 'refresh_cta_copy',
    handlerName: 'executeRefreshCtaCopy',
    serviceFile: 'landingPageExecutionHandlers.server.ts',
    createsArtifact: false,
    artifactType: null,
  },
  refresh_headline_variant: {
    executionType: 'refresh_headline_variant',
    handlerName: 'executeRefreshHeadlineVariant',
    serviceFile: 'landingPageExecutionHandlers.server.ts',
    createsArtifact: false,
    artifactType: null,
  },
};

export function getExecutionHandler(executionType: LandingPageExecutionType): ExecutionHandlerEntry {
  return EXECUTION_HANDLER_REGISTRY[executionType];
}

export function getArtifactCreatingTypes(): LandingPageExecutionType[] {
  return (Object.keys(EXECUTION_HANDLER_REGISTRY) as LandingPageExecutionType[]).filter(
    (type) => EXECUTION_HANDLER_REGISTRY[type].createsArtifact
  );
}
