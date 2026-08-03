import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLandingPage } from '../services/landingPages.client';
import type { CreateLandingPageInput, LandingPageRecord } from '../types/landingPage.types';
import { LANDING_PAGES_QUERY_KEY } from './useLandingPages';

interface UseCreateLandingPageOptions {
  onSuccess?: (page: LandingPageRecord) => void;
  onError?: (error: Error) => void;
}

export function useCreateLandingPage(options?: UseCreateLandingPageOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation<LandingPageRecord, Error, CreateLandingPageInput>({
    mutationFn: (input) => createLandingPage(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [LANDING_PAGES_QUERY_KEY] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });

  return {
    create: mutation.mutate,
    createAsync: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
