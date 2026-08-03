import { useQuery } from '@tanstack/react-query';
import { getLandingPageRevisions } from '../services/landingPageEditor.client';
import type { LandingPageRevisionRecord } from '../types/landingPageRevision.types';

export function useLandingPageRevisions(landingPageId: string) {
  const query = useQuery<LandingPageRevisionRecord[]>({
    queryKey: ['landing-page-revisions', landingPageId],
    queryFn: () => getLandingPageRevisions(landingPageId),
    enabled: !!landingPageId,
  });

  return {
    revisions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
