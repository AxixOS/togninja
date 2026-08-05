/**
 * Phase 1 bundle fulfilment — sell + deliver the TogNinja + ShootCleaner package.
 *
 * Flow (semi-automated): customer buys via Stripe Checkout → lands on a thank-you page that
 * "claims" the paid session (verified against Stripe, no webhook needed) → a delivery record
 * is created. The operator provisions the studio's instance (provision-instance.mjs), pastes
 * the instance URL + ShootCleaner key + installer link into the record, and marks it delivered.
 * The customer's /deliver/:token page then shows their setup link, ShootCleaner download and
 * the baked-in connection details.
 */
import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import Stripe from 'stripe';
import { pool } from '../db';
import { requireAuth } from '../auth';

const router = Router();

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' as any }) : null;

let _ready: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!_ready) {
    _ready = pool.query(`
      CREATE TABLE IF NOT EXISTS bundle_deliveries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        token text UNIQUE NOT NULL,
        customer_name text,
        customer_email text,
        status text NOT NULL DEFAULT 'pending',
        instance_url text,
        shootcleaner_api_key text,
        shootcleaner_download_url text,
        stripe_session_id text,
        notes text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        delivered_at timestamptz
      )
    `).then(() => undefined).catch((e) => { _ready = null; throw e; });
  }
  return _ready;
}

const token = () => crypto.randomBytes(18).toString('hex');
const scKey = () => `sc_${crypto.randomBytes(24).toString('hex')}`;
const origin = (req: Request) => (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

function serialize(row: any, req: Request) {
  const instanceUrl = row.instance_url || null;
  return {
    id: row.id,
    token: row.token,
    customerName: row.customer_name || null,
    customerEmail: row.customer_email || null,
    status: row.status,
    instanceUrl,
    setupUrl: instanceUrl ? `${String(instanceUrl).replace(/\/$/, '')}/setup` : null,
    shootcleanerApiKey: row.shootcleaner_api_key || null,
    shootcleanerDownloadUrl: row.shootcleaner_download_url || process.env.SHOOTCLEANER_DOWNLOAD_URL || null,
    stripeSessionId: row.stripe_session_id || null,
    notes: row.notes || null,
    createdAt: row.created_at,
    deliveredAt: row.delivered_at,
  };
}

// ── Public: start a bundle checkout ────────────────────────────────────────────
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    if (!stripe) return res.status(400).json({ error: 'Payments are not configured (STRIPE_SECRET_KEY missing).' });
    const priceId = process.env.BUNDLE_STRIPE_PRICE_ID;
    const cents = parseInt(process.env.BUNDLE_PRICE_CENTS || '', 10);
    let line_items: any[]; let mode: 'payment' | 'subscription';
    if (priceId) {
      line_items = [{ price: priceId, quantity: 1 }];
      mode = process.env.BUNDLE_MODE === 'payment' ? 'payment' : 'subscription';
    } else if (Number.isFinite(cents) && cents > 0) {
      line_items = [{ price_data: { currency: (process.env.BUNDLE_CURRENCY || 'gbp').toLowerCase(), product_data: { name: 'TogNinja + ShootCleaner — bundle' }, unit_amount: cents }, quantity: 1 }];
      mode = 'payment';
    } else {
      return res.status(400).json({ error: 'Bundle price not configured. Set BUNDLE_STRIPE_PRICE_ID (a Stripe price) or BUNDLE_PRICE_CENTS.' });
    }
    const base = origin(req);
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items,
      metadata: { type: 'bundle' },
      customer_email: req.body?.email || undefined,
      success_url: `${base}/bundle/thankyou?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/bundle`,
    });
    res.json({ url: session.url });
  } catch (e: any) {
    console.error('[bundle] checkout failed:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Failed to start checkout' });
  }
});

// ── Public: claim a paid session (verified against Stripe) → delivery token ─────
router.post('/claim', async (req: Request, res: Response) => {
  try {
    if (!stripe) return res.status(400).json({ error: 'Payments are not configured.' });
    const sessionId = String(req.body?.sessionId || '').trim();
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === 'paid' || session.status === 'complete';
    if (!paid) return res.status(402).json({ error: 'Payment not completed yet.' });

    await ensureTable();
    const existing = await pool.query('SELECT * FROM bundle_deliveries WHERE stripe_session_id = $1 LIMIT 1', [sessionId]);
    if (existing.rows[0]) return res.json({ token: existing.rows[0].token });

    const email = (session.customer_details?.email || (session as any).customer_email || '').toString();
    const t = token();
    await pool.query(
      `INSERT INTO bundle_deliveries (token, customer_email, status, stripe_session_id) VALUES ($1, $2, 'paid', $3)`,
      [t, email || null, sessionId],
    );
    res.json({ token: t });
  } catch (e: any) {
    console.error('[bundle] claim failed:', e?.message || e);
    res.status(500).json({ error: 'Failed to claim purchase' });
  }
});

// ── Public: the customer's delivery page data ──────────────────────────────────
router.get('/deliver/:token', async (req: Request, res: Response) => {
  try {
    await ensureTable();
    const r = await pool.query('SELECT * FROM bundle_deliveries WHERE token = $1 LIMIT 1', [req.params.token]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(serialize(r.rows[0], req));
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to load delivery' });
  }
});

// ── Admin (session-authed) ─────────────────────────────────────────────────────
router.get('/deliveries', requireAuth, async (req: Request, res: Response) => {
  await ensureTable();
  const r = await pool.query('SELECT * FROM bundle_deliveries ORDER BY created_at DESC LIMIT 200');
  res.json({ data: r.rows.map((row) => serialize(row, req)) });
});

router.post('/deliveries', requireAuth, async (req: Request, res: Response) => {
  await ensureTable();
  const b = req.body || {};
  const t = token();
  const r = await pool.query(
    `INSERT INTO bundle_deliveries (token, customer_name, customer_email, status, instance_url, shootcleaner_api_key, shootcleaner_download_url, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [t, b.customerName || null, b.customerEmail || null, b.status || 'pending', b.instanceUrl || null, b.shootcleanerApiKey || null, b.shootcleanerDownloadUrl || null, b.notes || null],
  );
  res.status(201).json(serialize(r.rows[0], req));
});

router.put('/deliveries/:id', requireAuth, async (req: Request, res: Response) => {
  await ensureTable();
  const b = req.body || {};
  const map: Record<string, string> = {
    customerName: 'customer_name', customerEmail: 'customer_email', status: 'status',
    instanceUrl: 'instance_url', shootcleanerApiKey: 'shootcleaner_api_key',
    shootcleanerDownloadUrl: 'shootcleaner_download_url', notes: 'notes',
  };
  const sets: string[] = []; const vals: any[] = [];
  for (const [k, col] of Object.entries(map)) {
    if (k in b) { vals.push(b[k]); sets.push(`${col} = $${vals.length}`); }
  }
  if (b.status === 'delivered') sets.push(`delivered_at = COALESCE(delivered_at, now())`);
  sets.push('updated_at = now()');
  vals.push(req.params.id);
  const r = await pool.query(`UPDATE bundle_deliveries SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(serialize(r.rows[0], req));
});

router.post('/deliveries/:id/generate-key', requireAuth, async (req: Request, res: Response) => {
  await ensureTable();
  const key = scKey();
  const r = await pool.query('UPDATE bundle_deliveries SET shootcleaner_api_key = $1, updated_at = now() WHERE id = $2 RETURNING *', [key, req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json({ shootcleanerApiKey: key, delivery: serialize(r.rows[0], req) });
});

router.delete('/deliveries/:id', requireAuth, async (req: Request, res: Response) => {
  await ensureTable();
  await pool.query('DELETE FROM bundle_deliveries WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

export default router;
