import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteLandingPage } from '../services/landingPages.client';
import { LANDING_PAGES_QUERY_KEY } from './useLandingPages';

interface UseDeleteLandingPageOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useDeleteLandingPage(options?: UseDeleteLandingPageOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteLandingPage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LANDING_PAGES_QUERY_KEY] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });

  return {
    deletePage: mutation.mutate,
    deleteAsync: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    deletingId: mutation.variables,
    error: mutation.error,
    reset: mutation.reset,
  };
}
