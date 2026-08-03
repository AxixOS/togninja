// Landing Page CTA Tracking Abstraction — Phase 4

export interface LandingPageCtaTrackingPayload {
  pageId: string;
  pageSlug: string;
  ctaLabel: string;
  ctaPlacement: 'hero' | 'offer' | 'finalCta' | 'inline';
  isPreview: boolean;
  timestamp: string;
}

/**
 * Build a CTA tracking payload from click context.
 */
export function buildLandingPageCtaTrackingPayload(
  pageId: string,
  pageSlug: string,
  ctaLabel: string,
  ctaPlacement: LandingPageCtaTrackingPayload['ctaPlacement'],
  isPreview: boolean,
): LandingPageCtaTrackingPayload {
  return {
    pageId,
    pageSlug,
    ctaLabel,
    ctaPlacement,
    isPreview,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Fire a CTA tracking event.
 * Currently a debug/noop — replace with analytics integration when ready.
 *
 * TODO: Phase 5 — integrate GA4 event (event: 'lp_cta_click')
 * TODO: Phase 5 — integrate Meta Pixel custom event
 * TODO: Phase 5 — POST to /api/analytics/lp-cta for internal tracking
 */
export function fireLandingPageCtaEvent(payload: LandingPageCtaTrackingPayload): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[LP CTA Track]', payload);
  }
  // Noop in production until analytics is wired
}
