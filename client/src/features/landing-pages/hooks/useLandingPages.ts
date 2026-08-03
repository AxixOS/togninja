import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { listLandingPages } from '../services/landingPages.client';
import type { LandingPageRecord, LandingPageListFilters, LandingPageListItem } from '../types/landingPage.types';
import { mapLandingPageToListItem } from '../utils/landingPage.helpers';

export const LANDING_PAGES_QUERY_KEY = '/api/admin/landing-pages';

export function useLandingPages(initialFilters?: LandingPageListFilters) {
  const [filters, setFilters] = useState<LandingPageListFilters>(
    initialFilters ?? { status: 'all', search: '', sortBy: 'updated_at', sortDir: 'desc' }
  );

  const query = useQuery<LandingPageRecord[]>({
    queryKey: [LANDING_PAGES_QUERY_KEY],
    queryFn: () => listLandingPages(),
  });

  // Client-side filtering + search (keeps query simple; list is user-scoped and small)
  const filtered = useMemo(() => {
    if (!query.data) return [];
    let items = query.data;

    if (filters.status && filters.status !== 'all') {
      items = items.filter(p => p.status === filters.status);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        p =>
          p.title?.toLowerCase().includes(q) ||
          p.slug?.toLowerCase().includes(q) ||
          p.primary_service?.toLowerCase().includes(q)
      );
    }

    // Sort
    const sortKey = filters.sortBy || 'updated_at';
    const dir = filters.sortDir === 'asc' ? 1 : -1;
    items = [...items].sort((a, b) => {
      const va = (a as any)[sortKey] ?? '';
      const vb = (b as any)[sortKey] ?? '';
      return va < vb ? -dir : va > vb ? dir : 0;
    });

    return items;
  }, [query.data, filters]);

  const listItems: LandingPageListItem[] = useMemo(
    () => filtered.map(mapLandingPageToListItem),
    [filtered]
  );

  const statusCounts = useMemo(() => {
    const pages = query.data ?? [];
    return {
      all: pages.length,
      draft: pages.filter(p => p.status === 'draft').length,
      published: pages.filter(p => p.status === 'published').length,
      archived: pages.filter(p => p.status === 'archived').length,
    };
  }, [query.data]);

  return {
    pages: filtered,
    listItems,
    statusCounts,
    filters,
    setFilters,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
