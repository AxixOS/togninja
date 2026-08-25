// The screen where a photographer hands over their domain.
//
// This is the most dangerous moment in the product and the one that most needs to
// demonstrate competence. A studio with eighty indexed pages is about to point them at a site
// that rebuilt twelve — and without a plan, the other sixty-eight would fall through to the
// SPA catch-all, which answers HTTP 200 with the prerendered homepage. Not 404s. Sixty-eight
// copies of one page, which Google reads as duplication across the whole domain.
//
// So: build a plan, show it, let a human approve it, and only then serve anything.
import { Router, type Request, type Response } from 'express';
import { pool } from '../db';
import { buildMigrationPlan, saveMigrationPlan } from '../lib/migrationPlan';

const router = Router();

/** The studio's existing website, which is what there is to migrate FROM. */
async function studioWebsite(): Promise<string> {
  const r = await pool.query(
    `SELECT website, frontend_url FROM studio_configs LIMIT 1`,
  ).catch(() => ({ rows: [] as any[] }));
  const row: any = r.rows?.[0] || {};
  return String(row.website || row.frontend_url || '').trim();
}

/** What is saved right now, approved or not. */
router.get('/plan', async (_req: Request, res: Response) => {
  try {
    const website = await studioWebsite();
    const r = await pool.query(
      `SELECT from_path, to_path, status, reason, confidence, approved
         FROM site_redirects ORDER BY confidence, from_path`,
    ).catch(() => ({ rows: [] as any[] }));
    res.json({
      website,
      redirects: r.rows,
      approvedCount: (r.rows as any[]).filter((x) => x.approved).length,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Could not read the plan.' });
  }
});

/**
 * Work out where every old page should point.
 *
 * Saves as UNAPPROVED. Nothing a visitor sees changes until somebody approves it — the
 * middleware only reads approved rows.
 */
router.post('/plan', async (_req: Request, res: Response) => {
  try {
    const website = await studioWebsite();
    if (!website) {
      return res.status(400).json({
        error: 'no_website',
        message: 'Add your existing website address in Settings first — that is the site we '
          + 'would be migrating from.',
      });
    }

    const plan = await buildMigrationPlan(website);
    if (plan.problem) {
      // NOT an error. A site with no readable sitemap is a normal site, and saying "we found
      // 0 pages" would be telling the studio something false about their own website.
      return res.json({ website, unknown: true, message: plan.problem, discovered: 0, kept: [], proposals: [] });
    }

    const saved = await saveMigrationPlan(plan.proposals);
    res.json({
      website,
      discovered: plan.discovered,
      kept: plan.kept,
      proposals: plan.proposals,
      saved,
      // Said plainly, because the whole point is that this is inert until reviewed.
      note: 'Nothing has changed yet. These take effect only when you approve them.',
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Could not build the plan.' });
  }
});

/** Approve — all of them, or a named subset. */
router.post('/approve', async (req: Request, res: Response) => {
  try {
    const paths: string[] | undefined = Array.isArray(req.body?.paths) ? req.body.paths : undefined;
    const r = paths
      ? await pool.query(
        `UPDATE site_redirects SET approved = true WHERE from_path = ANY($1::text[])`, [paths],
      )
      : await pool.query(`UPDATE site_redirects SET approved = true`);
    res.json({ approved: r.rowCount ?? 0 });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Could not approve.' });
  }
});

/** Turn one back off, or discard the lot. */
router.post('/revoke', async (req: Request, res: Response) => {
  try {
    const paths: string[] | undefined = Array.isArray(req.body?.paths) ? req.body.paths : undefined;
    const r = paths
      ? await pool.query(
        `UPDATE site_redirects SET approved = false WHERE from_path = ANY($1::text[])`, [paths],
      )
      : await pool.query(`UPDATE site_redirects SET approved = false`);
    res.json({ revoked: r.rowCount ?? 0 });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Could not revoke.' });
  }
});

/** Change where one old page points, when the studio knows better than the matcher. */
router.put('/redirect', async (req: Request, res: Response) => {
  try {
    const from = String(req.body?.fromPath || '').trim();
    const to = String(req.body?.toPath || '').trim();
    if (!from || !to) return res.status(400).json({ error: 'Both paths are required.' });
    // A path pointing at itself is a redirect loop served to a crawler.
    if (from === to) return res.status(400).json({ error: 'That would point the page at itself.' });
    await pool.query(
      `UPDATE site_redirects SET to_path = $2, confidence = 'manual', reason = 'You chose this'
        WHERE from_path = $1`, [from, to],
    );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Could not update.' });
  }
});

export default router;
