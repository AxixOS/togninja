import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLandingPageDraft } from '../services/landingPageEditor.client';
import type { UpdateLandingPageInput } from '../types/landingPage.types';
import { LANDING_PAGES_QUERY_KEY } from './useLandingPages';

interface UseUpdateLandingPageOptions {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

export function useUpdateLandingPage(id: string, options?: UseUpdateLandingPageOptions) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: UpdateLandingPageInput & { content_json?: Record<string, unknown> }) =>
      updateLandingPageDraft(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LANDING_PAGES_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: ['landing-page', id] });
      options?.onSuccess?.();
    },
    onError: (err: Error) => {
      options?.onError?.(err);
    },
  });

  return {
    update: mutation.mutate,
    updateAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
