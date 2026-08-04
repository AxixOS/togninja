import crypto from 'crypto';
import { pool } from '../db';

/**
 * Outbound ShootCleaner webhooks. ShootCleaner registers a URL (+ we mint an HMAC secret)
 * via POST /api/integrations/shootcleaner/webhooks; when an invoice created from an SC order
 * is marked paid, we POST an `invoice.paid` event there. Delivery is best-effort and
 * idempotent: shootcleaner_exports.notified_at is stamped once a 2xx is received, so the
 * sweep never double-fires. The only invoices considered are those SC itself created
 * (entity_type='invoice' in shootcleaner_exports), so we never leak unrelated CRM activity.
 */

const EVENTS = ['invoice.paid'] as const;

export interface WebhookConfig { url: string; secret: string; }

export async function getWebhookConfig(): Promise<WebhookConfig | null> {
  try {
    const r = await pool.query('SELECT shootcleaner_webhook_url AS url, shootcleaner_webhook_secret AS secret FROM studio_configs LIMIT 1');
    const url = (r.rows[0]?.url || '').trim();
    const secret = (r.rows[0]?.secret || '').trim();
    if (!url) return null;
    return { url, secret };
  } catch { return null; }
}

/** Register (or update) the webhook URL, minting a secret if there isn't one yet. */
export async function setWebhookUrl(url: string): Promise<{ url: string; secret: string; created: boolean }> {
  const existing = await pool.query('SELECT shootcleaner_webhook_secret AS secret FROM studio_configs LIMIT 1');
  let secret = (existing.rows[0]?.secret || '').trim();
  const created = !secret;
  if (!secret) secret = `scwh_${crypto.randomBytes(24).toString('hex')}`;
  await pool.query('UPDATE studio_configs SET shootcleaner_webhook_url = $1, shootcleaner_webhook_secret = $2', [url, secret]);
  return { url, secret, created };
}

export async function clearWebhook(): Promise<void> {
  await pool.query('UPDATE studio_configs SET shootcleaner_webhook_url = NULL WHERE TRUE');
}

export function sign(body: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function deliver(cfg: WebhookConfig, event: string, data: any): Promise<boolean> {
  const payload = JSON.stringify({ event, sentAt: new Date().toISOString(), data });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TogNinja-Webhook/1',
        'x-shootcleaner-event': event,
        'x-shootcleaner-signature': sign(payload, cfg.secret),
      },
      body: payload,
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Find SC-originated invoices that are now paid but not yet announced, POST invoice.paid,
 * and stamp notified_at on success. Runs on a cron; also callable inline. No-op unless a
 * webhook is configured. Returns how many were delivered.
 */
export async function sweepPaidInvoices(): Promise<number> {
  const cfg = await getWebhookConfig();
  if (!cfg) return 0;

  let rows: any[] = [];
  try {
    const q = await pool.query(`
      SELECT e.external_ref, i.id, i.invoice_number, i.status, i.total, i.paid_amount, i.currency
      FROM shootcleaner_exports e
      JOIN crm_invoices i ON i.id::text = e.entity_id
      WHERE e.entity_type = 'invoice'
        AND e.notified_at IS NULL
        AND i.status IN ('paid', 'partially_paid')
      ORDER BY i.updated_at ASC
      LIMIT 50
    `);
    rows = q.rows || [];
  } catch (err: any) {
    console.error('[shootcleaner-webhook] sweep query failed:', err?.message || err);
    return 0;
  }

  let delivered = 0;
  for (const row of rows) {
    const orderRef = String(row.external_ref || '').replace(/^order:/, '');
    const ok = await deliver(cfg, 'invoice.paid', {
      invoiceId: row.id,
      invoiceNumber: row.invoice_number,
      status: row.status,
      total: row.total != null ? Number(row.total) : null,
      paidAmount: row.paid_amount != null ? Number(row.paid_amount) : null,
      currency: row.currency || null,
      orderRef,
    });
    if (ok) {
      try { await pool.query('UPDATE shootcleaner_exports SET notified_at = NOW() WHERE external_ref = $1', [row.external_ref]); delivered++; }
      catch (err: any) { console.error('[shootcleaner-webhook] stamp failed:', err?.message || err); }
    }
  }
  if (delivered) console.log(`[shootcleaner-webhook] delivered ${delivered} invoice.paid event(s)`);
  return delivered;
}

export { EVENTS as WEBHOOK_EVENTS };
