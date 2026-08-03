// usePublishLandingPage — Phase 4

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { publishLandingPage } from '../services/landingPagePublishing.client';
import { LANDING_PAGES_QUERY_KEY } from './useLandingPages';
import type { PublishLandingPageResult } from '../types/landingPagePublishing.types';

interface Options {
  onSuccess?: (result: PublishLandingPageResult) => void;
  onError?: (err: Error) => void;
}

export function usePublishLandingPage(options?: Options) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => publishLandingPage(id),
    onSuccess: (data, id) => {
      qc.invalidateQueries({ queryKey: [LANDING_PAGES_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: ['landing-page', id] });
      options?.onSuccess?.(data);
    },
    onError: (err: Error) => {
      options?.onError?.(err);
    },
  });

  return {
    publish: mutation.mutate,
    publishAsync: mutation.mutateAsync,
    isPublishing: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}
