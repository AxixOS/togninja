/**
 * PHASE 0: Demo-mode safety gates
 *
 * Centralised guards that prevent real-world side-effects in demo mode.
 * Import these helpers in any service that sends emails, SMS, charges
 * money, or writes to external calendars.
 *
 * Usage:
 *   if (isDemoMode()) { console.log('[DEMO] email suppressed'); return; }
 *   assertNotDemo('Stripe live charge');  // throws in demo mode
 */

/** Returns true when the instance is running as a demo */
export function isDemoMode(): boolean {
  return (process.env.DEMO_MODE || '').toLowerCase() === 'true';
}

/** Throws if someone attempts a dangerous action while in demo mode */
export function assertNotDemo(action: string): void {
  if (isDemoMode()) {
    throw new Error(`[DEMO_MODE] Blocked: "${action}" is disabled in demo mode.`);
  }
}

/**
 * Returns a safe sender identity for the current instance.
 * Falls back gracefully so a demo never accidentally sends from a real mailbox.
 */
export function getSafeSenderEmail(): string {
  return process.env.SMTP_FROM
    || process.env.SMTP_USER
    || process.env.EMAIL_FROM
    || 'noreply@example.com';
}

export function getSafeSenderName(): string {
  return process.env.BUSINESS_NAME || process.env.STUDIO_NAME || 'My Studio';
}

/**
 * Wraps an async side-effect so it becomes a no-op log in demo mode.
 * Useful for email/SMS/webhook sends.
 *
 * Example:
 *   await demoGuard('send invoice email', () => emailService.send(msg));
 */
export async function demoGuard<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  if (isDemoMode()) {
    console.log(`[DEMO] Suppressed: ${label}`);
    return null;
  }
  return fn();
}
