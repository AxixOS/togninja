import { useQuery } from '@tanstack/react-query';
import { listLandingPageVariants } from '../services/landingPageVariants.client';

export function useLandingPageVariants(landingPageId: string) {
  const query = useQuery({
    queryKey: ['landing-page-variants', landingPageId],
    queryFn: () => listLandingPageVariants(landingPageId),
    enabled: !!landingPageId,
  });

  return {
    variants: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
