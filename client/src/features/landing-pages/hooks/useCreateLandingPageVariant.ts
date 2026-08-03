import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLandingPageVariant } from '../services/landingPageVariants.client';
import type { CreateLandingPageVariantInput } from '../types/landingPageVariant.types';

interface UseCreateVariantOptions {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

export function useCreateLandingPageVariant(landingPageId: string, options?: UseCreateVariantOptions) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreateLandingPageVariantInput) => createLandingPageVariant(landingPageId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['landing-page-variants', landingPageId] });
      options?.onSuccess?.();
    },
    onError: (err: Error) => {
      options?.onError?.(err);
    },
  });

  return {
    createVariant: mutation.mutate,
    createVariantAsync: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
