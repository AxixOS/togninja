import { useMutation, useQueryClient } from '@tanstack/react-query';
import { duplicateLandingPageById } from '../services/landingPageEditor.client';
import { LANDING_PAGES_QUERY_KEY } from './useLandingPages';

interface UseDuplicateLandingPageOptions {
  onSuccess?: (duplicatedId: string) => void;
  onError?: (err: Error) => void;
}

export function useDuplicateLandingPage(options?: UseDuplicateLandingPageOptions) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => duplicateLandingPageById(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [LANDING_PAGES_QUERY_KEY] });
      options?.onSuccess?.(data.id);
    },
    onError: (err: Error) => {
      options?.onError?.(err);
    },
  });

  return {
    duplicate: mutation.mutate,
    duplicateAsync: mutation.mutateAsync,
    isDuplicating: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
