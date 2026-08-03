import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { regenerateLandingPageSection, type RegenerateSectionPayload } from '../services/landingPageRegeneration.client';
import type { LandingPageSectionKey } from '../types/landingPageEditor.types';
import type { RegenerateLandingPageSectionResponse } from '../types/landingPageRegeneration.types';

interface UseRegenerateSectionOptions {
  onSuccess?: (res: RegenerateLandingPageSectionResponse) => void;
  onError?: (err: Error) => void;
}

export function useRegenerateLandingPageSection(landingPageId: string, options?: UseRegenerateSectionOptions) {
  const [regeneratingSection, setRegeneratingSection] = useState<LandingPageSectionKey | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: RegenerateSectionPayload) => {
      setRegeneratingSection(payload.sectionKey);
      return regenerateLandingPageSection(landingPageId, payload);
    },
    onSuccess: (res) => {
      setRegeneratingSection(null);
      // NOTE: regeneration is NOT persisted server-side — it returns fresh copy
      // for the caller to apply to local editor state. Do NOT invalidate the
      // page query here (that would refetch the old saved content and discard
      // the regenerated section). The caller's onSuccess applies the result.
      options?.onSuccess?.(res);
    },
    onError: (err: Error) => {
      setRegeneratingSection(null);
      options?.onError?.(err);
    },
  });

  return {
    regenerate: mutation.mutate,
    regenerateAsync: mutation.mutateAsync,
    isRegenerating: mutation.isPending,
    regeneratingSection,
    error: mutation.error,
    reset: mutation.reset,
  };
}
