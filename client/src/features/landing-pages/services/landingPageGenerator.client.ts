import { apiRequest } from '@/lib/queryClient';
import type {
  GenerateLandingPageRequest,
  GenerateLandingPageResponse,
  LandingPageGeneratedContent,
} from '../types/landingPageGeneration.types';
import type { LandingPageRecord } from '../types/landingPage.types';

const BASE = '/api/admin/landing-pages';

export interface GenerateLandingPageResult {
  landingPage: LandingPageRecord;
  generated: GenerateLandingPageResponse;
}

/** Call the AI generation endpoint and receive the created draft + structured output */
export async function generateLandingPage(
  payload: GenerateLandingPageRequest
): Promise<GenerateLandingPageResult> {
  return apiRequest(`${BASE}/generate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Regenerate a single section of an existing landing page */
export async function regenerateSection(
  section: string,
  context: Record<string, unknown>,
  currentContent: unknown
): Promise<{ section: string; content: unknown }> {
  return apiRequest(`${BASE}/regenerate-section`, {
    method: 'POST',
    body: JSON.stringify({ section, context, currentContent }),
  });
}
