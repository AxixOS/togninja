// Landing Page Event Tracking — Phase 5
// Lightweight, non-blocking client-safe event tracking

import type { LandingPageEventType, LandingPageEventInput } from '../types/landingPageAnalytics.types';

// ── Session / Visitor ID ─────────────────────────────────────

function getOrCreateId(key: string): string {
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function getLandingPageSessionId(): string {
  return getOrCreateId('lp_session_id');
}

export function getLandingPageVisitorId(): string {
  try {
    let id = localStorage.getItem('lp_visitor_id');
    if (!id) {
      id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('lp_visitor_id', id);
    }
    return id;
  } catch {
    return getOrCreateId('lp_visitor_id');
  }
}

// ── UTM Extraction ───────────────────────────────────────────

function getUtmParams(): { source?: string; medium?: string; campaign?: string } {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source') || undefined,
      medium: params.get('utm_medium') || undefined,
      campaign: params.get('utm_campaign') || undefined,
    };
  } catch {
    return {};
  }
}

// ── Payload Builder ──────────────────────────────────────────

export function buildLandingPageEventPayload(
  landingPageId: string,
  eventType: LandingPageEventType,
  options?: {
    eventLabel?: string;
    eventValue?: string;
    variantKey?: string;
    metadata?: Record<string, unknown>;
  },
): LandingPageEventInput {
  const utm = getUtmParams();
  return {
    landing_page_id: landingPageId,
    event_type: eventType,
    event_label: options?.eventLabel,
    event_value: options?.eventValue,
    variant_key: options?.variantKey,
    session_id: getLandingPageSessionId(),
    visitor_id: getLandingPageVisitorId(),
    source: utm.source,
    medium: utm.medium,
    campaign: utm.campaign,
    referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
    page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    metadata_json: options?.metadata ?? {},
  };
}

// ── Send Event (non-blocking) ────────────────────────────────

const EVENT_ENDPOINT = '/api/landing-pages/events';

export function sendLandingPageEvent(payload: LandingPageEventInput): void {
  try {
    const body = JSON.stringify(payload);
    // Prefer sendBeacon for fire-and-forget
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      const sent = navigator.sendBeacon(EVENT_ENDPOINT, blob);
      if (sent) return;
    }
    // Fallback to fetch
    fetch(EVENT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Fail silently — tracking must never block UX
    });
  } catch {
    // Fail silently
  }
}

// ── Convenience Wrappers ─────────────────────────────────────

export function trackPageView(
  landingPageId: string,
  variantKey?: string,
  isPreview?: boolean,
): void {
  const eventType: LandingPageEventType = isPreview ? 'preview_view' : 'page_view';
  const payload = buildLandingPageEventPayload(landingPageId, eventType, {
    variantKey,
    metadata: isPreview ? { isPreview: true } : undefined,
  });
  sendLandingPageEvent(payload);
}

export function trackCtaClick(
  landingPageId: string,
  ctaLabel: string,
  placement: string,
  variantKey?: string,
): void {
  sendLandingPageEvent(
    buildLandingPageEventPayload(landingPageId, 'cta_click', {
      eventLabel: ctaLabel,
      eventValue: placement,
      variantKey,
    }),
  );
}

export function trackConversionEvent(
  landingPageId: string,
  eventType: LandingPageEventType,
  label?: string,
  variantKey?: string,
): void {
  sendLandingPageEvent(
    buildLandingPageEventPayload(landingPageId, eventType, {
      eventLabel: label,
      variantKey,
    }),
  );
}
