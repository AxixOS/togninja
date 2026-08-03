// Phase 7: Hook — Execution Eligibility Check

import { useMemo } from 'react';
import type { LandingPageExecutionType, LandingPageExecutionSettingsRecord } from '../types/landingPageExecution.types';
import { evaluateLandingPageExecutionEligibility } from '../utils/evaluateLandingPageExecutionEligibility';

export function useLandingPageExecutionEligibility(
  executionType: LandingPageExecutionType | null,
  settings: LandingPageExecutionSettingsRecord | null,
) {
  const result = useMemo(() => {
    if (!executionType) return null;
    return evaluateLandingPageExecutionEligibility(executionType, settings);
  }, [executionType, settings]);

  return result;
}
