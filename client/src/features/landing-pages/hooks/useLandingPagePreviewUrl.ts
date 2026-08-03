// useLandingPagePreviewUrl — Phase 4

import { useState, useCallback } from 'react';
import { createLandingPagePreviewLink } from '../services/landingPagePublishing.client';

export function useLandingPagePreviewUrl() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPreviewLink = useCallback(async (pageId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await createLandingPagePreviewLink(pageId);
      setPreviewUrl(result.previewUrl);
      return result.previewUrl;
    } catch (err: any) {
      setError(err.message || 'Failed to create preview link');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    previewUrl,
    requestPreviewLink,
    isLoading,
    error,
  };
}
