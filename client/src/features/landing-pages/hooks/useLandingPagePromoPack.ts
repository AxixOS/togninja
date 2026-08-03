import { useMutation } from '@tanstack/react-query';
import { generateLandingPagePromoPack } from '../services/landingPagePromoPack.client';
import type { LandingPagePromoPackRequest, LandingPagePromoPackResponse } from '../types/landingPagePromoPack.types';

interface UsePromoPackOptions {
  onSuccess?: (data: LandingPagePromoPackResponse) => void;
  onError?: (err: Error) => void;
}

export function useLandingPagePromoPack(landingPageId: string, options?: UsePromoPackOptions) {
  const mutation = useMutation({
    mutationFn: (request?: LandingPagePromoPackRequest) => generateLandingPagePromoPack(landingPageId, request),
    onSuccess: (data) => {
      options?.onSuccess?.(data);
    },
    onError: (err: Error) => {
      options?.onError?.(err);
    },
  });

  return {
    generate: mutation.mutate,
    generateAsync: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    promoPack: mutation.data ?? null,
    error: mutation.error,
    reset: mutation.reset,
  };
}
