import { apiRequest } from '@/lib/queryClient';
import type { LandingPageSectionKey } from '../types/landingPageEditor.types';
import type { LandingPageSectionRegenerationMode, RegenerateLandingPageSectionResponse } from '../types/landingPageRegeneration.types';

const BASE = '/api/admin/landing-pages';

export interface RegenerateSectionPayload {
  sectionKey: LandingPageSectionKey;
  mode: LandingPageSectionRegenerationMode;
  customInstruction?: string;
}

/** Regenerate a single section of a landing page via AI */
export async function regenerateLandingPageSection(
  landingPageId: string,
  payload: RegenerateSectionPayload
): Promise<RegenerateLandingPageSectionResponse> {
  return apiRequest(`${BASE}/${landingPageId}/regenerate-section`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
