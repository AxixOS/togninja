// Contracts: templates, sending, and client signature.
//
// Modelled on the gallery and questionnaire flows that already exist here, and on the
// lessons from both:
//
//  - The client-facing link is a CAPABILITY. An unguessable token, checked on every read,
//    scoped to one contract. Galleries taught us that a guessable slug plus an unverified
//    token is the same as no security at all.
//  - The signing page is PUBLIC by necessity — a client has no login — so everything it
//    returns is deliberately narrowed. It never exposes the client id, the template, or
//    any other contract.
//  - A sent contract is a SNAPSHOT. Editing the template afterwards must not change what
//    somebody already signed, so `contracts.body` holds the merged text as sent and is
//    never re-rendered.
//  - Nothing is sent while a merge field is unresolved. A contract that reads "the retainer
//    is [Retainer Amount]" — or worse, "the retainer is ." — must not reach a client.
import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { pool } from '../db';
import { requireAuth } from '../auth';
import { mergeContract, canSend, fieldsUsed } from '../../shared/contractMerge';

const router = Router();

/** Studio-side values available to every contract, read once per request. */
async function studioValues(): Promise<Record<string, string>> {
  const r = await pool.query(
    `SELECT studio_name, business_name, email, phone, address, city, country
       FROM studio_configs LIMIT 1`,
  ).catch(() => ({ rows: [] as any[] }));
  const s: any = r.rows?.[0] || {};
  return {
    'Studio Name': s.studio_name || s.business_name || '',
    'Studio Email': s.email || '',
    'Studio Phone': s.phone || '',
    'Studio Address': s.address || '',
    'City Name': s.city || '',
    'State/Country': s.country || '',
    Today: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

// ── Templates ───────────────────────────────────────────────────────────────

router.get('/templates', requireAuth, async (_req: Request, res: Response) => {
  try {
    const r = await pool.query(
      `SELECT id, name, category, body, is_active, created_at, updated_at
         FROM contract_templates WHERE is_active = true ORDER BY name`,
    );
    // Tell the editor which fields each template uses, so it can warn before sending.
    res.json(r.rows.map((t: any) => ({ ...t, fieldsUsed: fieldsUsed(t.body) })));
  } catch (e: any) {
    console.error('[contracts] template list failed:', e?.message);
    res.status(500).json({ error: 'Could not load your contract templates.' });
  }
});

router.post('/templates', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, body, category } = req.body || {};
    if (!String(name || '').trim()) return res.status(400).json({ error: 'Give the template a name.' });
    if (!String(body || '').trim()) return res.status(400).json({ error: 'The template has no content.' });
    const r = await pool.query(
      `INSERT INTO contract_templates (name, category, body) VALUES ($1,$2,$3) RETURNING id`,
      [name, category || 'general', body],
    );
    res.status(201).json({ ok: true, id: r.rows[0].id });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Could not save the template.' });
  }
});

router.put('/templates/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, body, category, isActive } = req.body || {};
    const r = await pool.query(
      `UPDATE contract_templates SET
         name = COALESCE($1, name), body = COALESCE($2, body),
         category = COALESCE($3, category), is_active = COALESCE($4, is_active),
         updated_at = NOW()
       WHERE id = $5 RETURNING id`,
      [name ?? null, body ?? null, category ?? null,
       typeof isActive === 'boolean' ? isActive : null, req.params.id],
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Template not found.' });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Could not update the template.' });
  }
});

// ── Contracts ───────────────────────────────────────────────────────────────

router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const r = await pool.query(
      `SELECT c.id, c.title, c.status, c.sent_at, c.viewed_at, c.signed_at, c.created_at,
              cl.first_name, cl.last_name, cl.email AS client_email,
              (SELECT count(*)::int FROM contract_signers s WHERE s.contract_id = c.id) AS signer_count,
              (SELECT count(*)::int FROM contract_signers s WHERE s.contract_id = c.id AND s.signed_at IS NOT NULL) AS signed_count
         FROM contracts c
         LEFT JOIN crm_clients cl ON cl.id = c.client_id
        ORDER BY c.created_at DESC`,
    );
    res.json(r.rows);
  } catch (e: any) {
    console.error('[contracts] list failed:', e?.message);
    res.status(500).json({ error: 'Could not load your contracts.' });
  }
});

/**
 * Build a contract from a template for a client — the merge happens HERE, server-side,
 * so the preview the studio approves is produced by the same code that sends it.
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { templateId, clientId, title, values } = req.body || {};
    if (!templateId) return res.status(400).json({ error: 'Choose a template.' });

    const t = await pool.query(`SELECT name, body FROM contract_templates WHERE id = $1`, [templateId]);
    if (!t.rows.length) return res.status(404).json({ error: 'That template no longer exists.' });

    const merged: Record<string, string> = { ...(await studioValues()) };
    if (clientId) {
      const c = await pool.query(
        `SELECT first_name, last_name, email, phone FROM crm_clients WHERE id = $1`, [clientId]);
      const cl: any = c.rows?.[0];
      if (cl) {
        merged['Client Name'] = [cl.first_name, cl.last_name].filter(Boolean).join(' ');
        merged['Client Email'] = cl.email || '';
        merged['Client Phone'] = cl.phone || '';
      }
    }
    // Anything the studio typed wins over anything derived.
    Object.assign(merged, values || {});

    const result = mergeContract(t.rows[0].body, merged);
    const r = await pool.query(
      `INSERT INTO contracts (template_id, client_id, title, body, merge_values, status)
       VALUES ($1,$2,$3,$4,$5,'draft') RETURNING id`,
      [templateId, clientId || null, title || t.rows[0].name, result.text, JSON.stringify(merged)],
    );

    // Reported, not enforced, at draft time: a studio is allowed to save a half-filled
    // draft. Sending is where it is refused.
    res.status(201).json({
      ok: true,
      id: r.rows[0].id,
      unresolved: [...result.unknown, ...result.missing],
    });
  } catch (e: any) {
    console.error('[contracts] create failed:', e?.message);
    res.status(500).json({ error: e?.message || 'Could not create the contract.' });
  }
});

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const r = await pool.query(`SELECT * FROM contracts WHERE id = $1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Contract not found.' });
    const signers = await pool.query(
      `SELECT id, name, email, role, signed_at, sort_order FROM contract_signers
        WHERE contract_id = $1 ORDER BY sort_order, created_at`, [req.params.id]);
    res.json({ ...r.rows[0], signers: signers.rows });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not load the contract.' });
  }
});

/** Replace the signers on a draft. */
router.put('/:id/signers', requireAuth, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const signers = Array.isArray(req.body?.signers) ? req.body.signers : [];
    if (!signers.length) return res.status(400).json({ error: 'A contract needs at least one signer.' });
    for (const s of signers) {
      if (!String(s?.name || '').trim() || !String(s?.email || '').trim()) {
        return res.status(400).json({ error: 'Every signer needs a name and an email.' });
      }
    }
    await client.query('BEGIN');
    await client.query(`DELETE FROM contract_signers WHERE contract_id = $1`, [req.params.id]);
    for (let i = 0; i < signers.length; i++) {
      await client.query(
        `INSERT INTO contract_signers (contract_id, name, email, role, sort_order)
         VALUES ($1,$2,$3,$4,$5)`,
        [req.params.id, signers[i].name, signers[i].email, signers[i].role || 'client', i],
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true, count: signers.length });
  } catch (e: any) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: e?.message || 'Could not save the signers.' });
  } finally {
    client.release();
  }
});

/**
 * Send it. This is the gate: a contract with an unresolved merge field never leaves.
 */
router.post('/:id/send', requireAuth, async (req: Request, res: Response) => {
  try {
    const r = await pool.query(`SELECT * FROM contracts WHERE id = $1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Contract not found.' });
    const contract: any = r.rows[0];

    if (contract.status === 'signed') {
      return res.status(409).json({ error: 'That contract has already been signed.' });
    }

    // Re-check the STORED body. It was merged at create time; this catches a draft that
    // was saved with gaps, and it is the last point before a client sees it.
    const recheck = mergeContract(contract.body, {});
    const verdict = canSend(recheck);
    if (!verdict.ok) {
      return res.status(400).json({ error: 'unresolved_fields', message: verdict.reason });
    }

    const signers = await pool.query(
      `SELECT count(*)::int AS n FROM contract_signers WHERE contract_id = $1`, [req.params.id]);
    if (!signers.rows[0].n) {
      return res.status(400).json({ error: 'no_signers', message: 'Add who needs to sign before sending.' });
    }

    // A fresh capability each send, so revoking is just re-sending.
    const token = crypto.randomBytes(24).toString('base64url');
    await pool.query(
      `UPDATE contracts SET status = 'sent', access_token = $1, sent_at = NOW(), updated_at = NOW()
        WHERE id = $2`, [token, req.params.id]);

    res.json({ ok: true, token, signUrl: `/contract/${token}` });
  } catch (e: any) {
    console.error('[contracts] send failed:', e?.message);
    res.status(500).json({ error: e?.message || 'Could not send the contract.' });
  }
});

// ── The client's side. Public by necessity — a client has no login. ─────────

/**
 * Read a contract by its token.
 *
 * Deliberately narrow: the title, the body, and who has to sign. No client id, no template
 * id, no other contract. The token is the whole of the authorisation, so it is the whole of
 * what is trusted — the same reasoning as the gallery access token.
 */
router.get('/public/:token', async (req: Request, res: Response) => {
  try {
    const r = await pool.query(
      `SELECT id, title, body, status, signed_at, expires_at FROM contracts WHERE access_token = $1`,
      [req.params.token],
    );
    if (!r.rows.length) return res.status(404).json({ error: 'This link is not valid.' });
    const c: any = r.rows[0];

    if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) {
      return res.status(410).json({ error: 'expired', message: 'This contract has expired. Ask your photographer to resend it.' });
    }

    // First open marks it viewed — useful to the studio, and harmless to the client.
    if (c.status === 'sent') {
      await pool.query(
        `UPDATE contracts SET status = 'viewed', viewed_at = NOW() WHERE id = $1 AND viewed_at IS NULL`,
        [c.id]).catch(() => {});
    }

    const signers = await pool.query(
      `SELECT id, name, email, role, signed_at FROM contract_signers
        WHERE contract_id = $1 ORDER BY sort_order, created_at`, [c.id]);

    res.json({
      title: c.title,
      body: c.body,
      status: c.status === 'sent' ? 'viewed' : c.status,
      signedAt: c.signed_at,
      signers: signers.rows,
    });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not open this contract.' });
  }
});

/** Sign it. */
router.post('/public/:token/sign', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { signerId, signature } = req.body || {};
    if (!signerId) return res.status(400).json({ error: 'Which signer is this?' });
    if (!String(signature || '').trim()) return res.status(400).json({ error: 'A signature is required.' });

    const r = await pool.query(
      `SELECT id, status, expires_at FROM contracts WHERE access_token = $1`, [req.params.token]);
    if (!r.rows.length) return res.status(404).json({ error: 'This link is not valid.' });
    const c: any = r.rows[0];
    if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) {
      return res.status(410).json({ error: 'This contract has expired.' });
    }

    await client.query('BEGIN');

    // Conditional, so signing twice cannot overwrite the first signature or its evidence.
    const signed = await client.query(
      `UPDATE contract_signers
          SET signed_at = NOW(), signature = $1, signed_ip = $2, signed_user_agent = $3
        WHERE id = $4 AND contract_id = $5 AND signed_at IS NULL
        RETURNING id`,
      [String(signature).slice(0, 4000),
       String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').slice(0, 100),
       String(req.headers['user-agent'] || '').slice(0, 300),
       signerId, c.id],
    );
    if (!signed.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'already_signed', message: 'That signature is already recorded.' });
    }

    // The contract is signed only when EVERY signer has signed.
    const remaining = await client.query(
      `SELECT count(*)::int AS n FROM contract_signers WHERE contract_id = $1 AND signed_at IS NULL`,
      [c.id]);
    const complete = remaining.rows[0].n === 0;
    if (complete) {
      await client.query(
        `UPDATE contracts SET status = 'signed', signed_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [c.id]);
    }

    await client.query('COMMIT');
    res.json({ ok: true, complete, remaining: remaining.rows[0].n });
  } catch (e: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[contracts] sign failed:', e?.message);
    res.status(500).json({ error: 'Could not record the signature.' });
  } finally {
    client.release();
  }
});

export default router;
