// Landing Page Preview Token Utility — Phase 4

/** Generate a crypto-safe random preview token */
export function generateLandingPagePreviewToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/** Get expiry timestamp — 24 hours from now */
export function getLandingPagePreviewExpiry(): string {
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);
  return expires.toISOString();
}

/** Validate a preview token against stored token and expiry */
export function validateLandingPagePreviewToken(
  candidate: string,
  storedToken: string | null,
  expiresAt: string | null,
): boolean {
  if (!candidate || !storedToken || !expiresAt) return false;
  if (candidate !== storedToken) return false;
  return new Date(expiresAt) > new Date();
}
