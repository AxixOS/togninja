// Who an agent-written email is from, and in whose currency an invoice is denominated.
//
// The write tools assumed both. email.draft inserted into crm_messages without
// sender_name or sender_email — columns that are NOT NULL with no default, so every
// draft insert would have failed the first time the tool became reachable. And
// invoices.send rendered every line as `€${...}` for a studio in Hove billing in GBP.
import { pool } from '../../../server/db';

export interface SenderIdentity {
  name: string;
  email: string;
}

const clean = (v: unknown): string => String(v ?? '').trim();

/**
 * The studio's own from-name and from-address.
 *
 * Reads email_settings first because storage.getEmailSettings() does, so the agent signs
 * mail the same way the rest of the product sends it. Falls back to the studio profile,
 * then to env. NEVER to a literal — storage.getEmailSettings()'s own env fallback still
 * hardcodes 'New Age Fotografie' as the from-name, which is precisely the mistake that
 * would put the origin studio's name on a customer's outbound mail.
 *
 * Returns empty strings when nothing is configured. The caller must refuse to send
 * rather than invent a sender.
 */
export async function getSenderIdentity(): Promise<SenderIdentity> {
  let name = '';
  let email = '';

  try {
    const { rows } = await pool.query(
      'SELECT from_name, from_email, smtp_user FROM email_settings ORDER BY updated_at DESC LIMIT 1',
    );
    name = clean(rows[0]?.from_name);
    email = clean(rows[0]?.from_email) || clean(rows[0]?.smtp_user);
  } catch { /* table absent on a fresh instance */ }

  if (!name || !email) {
    try {
      const { rows } = await pool.query(
        `SELECT c.business_name, c.studio_name, c.owner_name, c.email,
                i.email_from_name, i.default_from_email
         FROM studio_configs c
         LEFT JOIN studio_integrations i ON true
         ORDER BY c.created_at LIMIT 1`,
      );
      const r: any = rows[0] || {};
      name = name || clean(r.email_from_name) || clean(r.business_name) || clean(r.studio_name) || clean(r.owner_name);
      email = email || clean(r.default_from_email) || clean(r.email);
    } catch { /* leave blank */ }
  }

  return {
    name: name || clean(process.env.EMAIL_FROM_NAME) || clean(process.env.BUSINESS_NAME),
    email: email || clean(process.env.SMTP_FROM) || clean(process.env.SMTP_USER),
  };
}

/**
 * Format money in the studio's own currency.
 *
 * Every invoice tool hardcoded a euro sign. Intl handles the symbol, the placement and
 * the separators — 'SFr. 1’200.00' and '¥1,200' are not a euro sign with a different
 * glyph — and it is also correct for the zero-decimal currencies that a hand-rolled
 * two-decimal format silently multiplies by a hundred.
 */
export function formatMoney(amount: number | string, currency?: string | null): string {
  const value = Number(amount);
  const code = clean(currency).toUpperCase() || 'EUR';
  if (!Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: code }).format(value);
  } catch {
    // An unknown or malformed code must not break an invoice email.
    return `${code} ${value.toFixed(2)}`;
  }
}
