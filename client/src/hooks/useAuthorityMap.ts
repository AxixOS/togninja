import { useQuery } from '@tanstack/react-query';
import { DEFAULT_AUTHORITY_MAP, type AuthorityMap } from '../../../shared/authorityMap';

/**
 * Read the studio's Authority Map. `isCustom` is true only when the studio has saved its
 * OWN map (i.e. it differs from the New Age seed). SEO components use that flag to keep
 * their existing hard-coded New Age content byte-identical while rendering from the map
 * for any studio that has generated one.
 */
export function useAuthorityMap(): { map: AuthorityMap; isCustom: boolean; loading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/authority-map'],
    queryFn: async (): Promise<AuthorityMap> => {
      const r = await fetch('/api/authority-map');
      if (!r.ok) throw new Error('Failed to load authority map');
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  const map = data || DEFAULT_AUTHORITY_MAP;
  const isCustom = !!data && JSON.stringify(data) !== JSON.stringify(DEFAULT_AUTHORITY_MAP);
  return { map, isCustom, loading: isLoading };
}
