import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';

interface PageContent {
  pageId: string;
  language: string;
  publishedContent: Record<string, string>;
  status: string;
  publishedAt?: string;
}

/**
 * Hook to fetch manual page content overrides and merge with translation keys
 * Usage in any public page component:
 * 
 * const t = useManualPageContent('home'); // 'home', 'contact', 'blog', etc.
 * return <h1>{t('home.heroTitle')}</h1>
 */
export function useManualPageContent(pageId: string) {
  const { t: originalT, language } = useLanguage();

  // Fetch manual page content from API
  const { data: pageContent } = useQuery<PageContent>({
    queryKey: ['/api/manual-pages', pageId, language],
    queryFn: async () => {
      const res = await fetch(`/api/manual-pages/${pageId}?language=${language}`);
      if (!res.ok) return { pageId, language, publishedContent: {}, status: 'none' };
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes – use cache, avoid refetch on every mount
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: germanFallback } = useQuery<PageContent>({
    queryKey: ['/api/manual-pages', pageId, 'de'],
    queryFn: async () => {
      const res = await fetch(`/api/manual-pages/${pageId}?language=de`);
      if (!res.ok) return { pageId, language: 'de', publishedContent: {}, status: 'none' };
      return res.json();
    },
    enabled: language !== 'de',
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  /**
   * Enhanced translation function that checks manual overrides first,
   * then falls back to default translations from LanguageContext
   */
  const t = (key: string): string => {
    // First check if there's a manual override for this key in current language
    if (pageContent?.publishedContent?.[key]) {
      return pageContent.publishedContent[key];
    }

    // For English, check if there's a German manual override ONLY for custom content
    // (not for standard translation keys that exist in LanguageContext)
    if (language !== 'de' && germanFallback?.publishedContent?.[key]) {
      // Only use German fallback for custom keys that don't exist in LanguageContext
      const defaultValue = originalT(key);
      // If the key returns itself, it means it's not in LanguageContext, so use German fallback
      if (defaultValue === key) {
        return germanFallback.publishedContent[key];
      }
    }
    
    // Fall back to default translation from LanguageContext (properly localized)
    return originalT(key);
  };

  return t;
}

/**
 * Simpler hook that returns just the manual content data
 * Useful for checking if content exists or getting metadata
 */
export function useManualPageData(pageId: string) {
  const { language } = useLanguage();

  return useQuery<PageContent>({
    queryKey: ['/api/manual-pages', pageId, language],
    queryFn: async () => {
      const res = await fetch(`/api/manual-pages/${pageId}?language=${language}`);
      if (!res.ok) return { pageId, language, publishedContent: {}, status: 'none' };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
