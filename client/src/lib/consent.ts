// src/lib/consent.ts
// GDPR-compliant cookie consent utilities for Austria/EU

export type ConsentCategory = "necessary" | "analytics" | "marketing";

export type ConsentState = Record<ConsentCategory, boolean>;

export type ConsentRecord = {
  version: string;             // bump when wording/categories change
  updatedAtISO: string;        // timestamp of consent action
  state: ConsentState;         // category choices
};

const COOKIE_NAME = "naf_consent";
const COOKIE_MAX_DAYS = 180;   // common pattern: 6 months
export const CONSENT_VERSION = "1.0.0";

export const defaultConsent: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
};

// Native cookie helpers (no external dependency)
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure`;
}

function removeCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

export function readConsent(): ConsentRecord | null {
  const raw = getCookie(COOKIE_NAME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConsentRecord;
    // basic sanity
    if (!parsed?.state?.necessary) parsed.state.necessary = true;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(state: ConsentState, version = CONSENT_VERSION) {
  const record: ConsentRecord = {
    version,
    updatedAtISO: new Date().toISOString(),
    state: { ...state, necessary: true },
  };

  setCookie(COOKIE_NAME, JSON.stringify(record), COOKIE_MAX_DAYS);

  // Broadcast to the app so analytics loaders can react
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("consent:updated", { detail: record }));
  }
}

export function clearConsent() {
  removeCookie(COOKIE_NAME);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("consent:cleared"));
  }
}

export function hasConsent(category: ConsentCategory): boolean {
  const record = readConsent();
  if (!record) return category === "necessary";
  return !!record.state[category];
}
