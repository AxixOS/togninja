// useUnpublishLandingPage — Phase 4

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unpublishLandingPage } from '../services/landingPagePublishing.client';
import { LANDING_PAGES_QUERY_KEY } from './useLandingPages';

interface Options {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

export function useUnpublishLandingPage(options?: Options) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => unpublishLandingPage(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: [LANDING_PAGES_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: ['landing-page', id] });
      options?.onSuccess?.();
    },
    onError: (err: Error) => {
      options?.onError?.(err);
    },
  });

  return {
    unpublish: mutation.mutate,
    isUnpublishing: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
