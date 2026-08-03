import { useCallback, useRef } from 'react';
import {
  trackPageView,
  trackCtaClick,
  trackConversionEvent,
} from '../utils/trackLandingPageEvent';
import type { LandingPageEventType } from '../types/landingPageAnalytics.types';

export function useLandingPageEventTracking(landingPageId: string, variantKey?: string) {
  const trackedRef = useRef(false);

  const trackView = useCallback(
    (isPreview?: boolean) => {
      if (trackedRef.current) return;
      trackedRef.current = true;
      trackPageView(landingPageId, variantKey, isPreview);
    },
    [landingPageId, variantKey],
  );

  const trackCta = useCallback(
    (label: string, placement: string) => {
      trackCtaClick(landingPageId, label, placement, variantKey);
    },
    [landingPageId, variantKey],
  );

  const trackConversion = useCallback(
    (eventType: LandingPageEventType, label?: string) => {
      trackConversionEvent(landingPageId, eventType, label, variantKey);
    },
    [landingPageId, variantKey],
  );

  return { trackView, trackCta, trackConversion };
}
