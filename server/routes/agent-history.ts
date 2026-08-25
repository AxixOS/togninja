// What the assistant has been asked, and what it did about it.
//
// The data has been written since the agent shipped — agent_session and agent_message — and
// nothing has ever read it back. The assistant itself uses the last ten messages for context;
// the studio has never been able to see any of it.
//
// That gap had a second cost: the assistant page advertised a "full audit trail" while
// agent_audit, agent_action_log and agent_audit_diff all held zero rows. The claim was
// removed in v1.9.121 for being false. This is the version of it that is true — not a
// forensic audit of tool calls, but an honest record of what was asked and what came back,
// which is what a photographer would actually want when they think "what did I tell it to do
// last week?".
import { Router, type Request, type Response } from 'express';
import { pool } from '../db';

const router = Router();

/** Conversations, newest first, with enough to recognise one. */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const r = await pool.query(
      `SELECT s.id, s.mode, s.created_at, s.updated_at,
              count(m.id)::int AS message_count,
              -- The first thing the studio typed IS the title of the conversation. Better
              -- than a timestamp, and free.
              (SELECT content FROM agent_message
                WHERE session_id = s.id AND role = 'user'
                ORDER BY created_at ASC LIMIT 1) AS opening
         FROM agent_session s
         LEFT JOIN agent_message m ON m.session_id = s.id
        GROUP BY s.id
        ORDER BY coalesce(s.updated_at, s.created_at) DESC
        LIMIT $1`,
      [limit],
    );
    res.json({
      sessions: (r.rows as any[]).map((row) => ({
        id: row.id,
        mode: row.mode,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        messageCount: row.message_count,
        // Trimmed for a list. The full text is one click away.
        opening: String(row.opening || '').slice(0, 140),
      })),
    });
  } catch (e: any) {
    // A history that cannot be read is not worth failing a page over.
    console.warn('[agent-history] sessions unavailable:', e?.message || e);
    res.json({ sessions: [], problem: 'The history could not be read.' });
  }
});

/** One conversation in full. */
router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const r = await pool.query(
      `SELECT role, content, metadata, created_at
         FROM agent_message WHERE session_id = $1 ORDER BY created_at ASC`,
      [req.params.id],
    );
    const s = await pool.query(
      `SELECT id, mode, created_at FROM agent_session WHERE id = $1`, [req.params.id],
    );
    if (!s.rows.length) return res.status(404).json({ error: 'No such conversation.' });

    res.json({
      session: { id: s.rows[0].id, mode: s.rows[0].mode, createdAt: s.rows[0].created_at },
      messages: (r.rows as any[]).map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.created_at,
        // Whatever was recorded alongside — tool calls where the agent stored them. Passed
        // through rather than interpreted, because the shape has varied over time and
        // inventing a schema for old rows would misrepresent them.
        metadata: m.metadata || null,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Could not read that conversation.' });
  }
});

export default router;
