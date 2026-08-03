import { useMemo } from 'react';
import type { LandingPageRecord } from '../types/landingPage.types';
import { evaluateLandingPagePublishReadiness } from '../utils/landingPageReadiness';

export function useLandingPagePublishReadiness(page: LandingPageRecord | null) {
  const result = useMemo(() => {
    if (!page) return { isReady: false, errors: ['Page not loaded'], warnings: [], completedChecks: [], missingCriticalSections: [] };
    return evaluateLandingPagePublishReadiness(page);
  }, [page]);

  return result;
}
