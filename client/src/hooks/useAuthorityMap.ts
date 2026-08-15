import { useQuery } from '@tanstack/react-query';
import { EMPTY_AUTHORITY_MAP, type AuthorityMap } from '../../../shared/authorityMap';

/**
 * Read the studio's Authority Map — the pillar/cluster/internal-link graph built from
 * their own site during onboarding.
 *
 * `hasMap` answers one question: does this studio have pillars of its own to render?
 * It used to be `isCustom`, computed by diffing the response against the New Age seed,
 * which quietly made "this studio is not New Age" the condition for showing real content.
 * Every consumer then needed an else-branch, and the only thing available to put in it
 * was New Age's Vienna services. Comparing against a specific studio is what created the
 * fallbacks; asking whether pillars exist does not.
 *
 * `loading` matters as much as `hasMap`. The prerenderer signals 'ready' two animation
 * frames after mount — before this query resolves — so a component that renders its
 * "no map yet" state during loading gets that state baked into the static HTML. Consumers
 * must return null while loading, not fall through.
 */
export function useAuthorityMap(): { map: AuthorityMap; hasMap: boolean; loading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/authority-map'],
    queryFn: async (): Promise<AuthorityMap> => {
      const r = await fetch('/api/authority-map');
      if (!r.ok) throw new Error('Failed to load authority map');
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  // Fall back to EMPTY, never to a seed: a failed request must render nothing, not
  // somebody else's services.
  const map = data || EMPTY_AUTHORITY_MAP;
  const hasMap = Array.isArray(data?.pillars) && data!.pillars.length > 0;
  return { map, hasMap, loading: isLoading };
}
