import { useEffect, useState } from 'react';

export interface LiveGoogleReview {
  author: string;
  rating: number;
  text: string;
  when: string;
}

export interface LiveGoogleReviews {
  configured: boolean;
  available: boolean;
  rating: number;
  count: number;
  mapsUri: string;
  reviews: LiveGoogleReview[];
}

/**
 * Fetches the studio's live Google rating/reviews from /api/reviews/google.
 * Returns null while loading or when live data isn't configured/available, so
 * callers fall back to their curated content.
 */
export function useGoogleReviews(): { data: LiveGoogleReviews | null; loading: boolean } {
  const [data, setData] = useState<LiveGoogleReviews | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/reviews/google');
        const json = await res.json();
        if (cancelled) return;
        if (json?.configured && json?.available && typeof json.rating === 'number') {
          setData(json as LiveGoogleReviews);
        } else {
          setData(null);
        }
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { data, loading };
}
