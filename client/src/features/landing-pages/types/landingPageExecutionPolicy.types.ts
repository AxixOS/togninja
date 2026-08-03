// Phase 7: Execution Policy Types

import type { LandingPageExecutionType } from './landingPageExecution.types';

export type LandingPageExecutionSafetyLevel =
  | 'safe'
  | 'review_required'
  | 'restricted';

export interface LandingPageExecutionPolicy {
  executionType: LandingPageExecutionType;
  safetyLevel: LandingPageExecutionSafetyLevel;
  label: string;
  description: string;
  requiresApprovalByDefault: boolean;
  canAutoExecute: boolean;
  maxRetries: number;
}

export interface LandingPageExecutionEligibilityResult {
  eligible: boolean;
  executionType: LandingPageExecutionType;
  safetyLevel: LandingPageExecutionSafetyLevel;
  requiresApproval: boolean;
  isAutoExecutable: boolean;
  reason: string;
}
