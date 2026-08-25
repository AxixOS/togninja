import { pool } from '../db';
import { getSiteLayout, DEFAULT_LAYOUT_ID, normalizeLayoutId, type SiteLayout } from '../../shared/siteLayouts.js';

/**
 * The studio's public-site layout (studio_configs.site_layout).
 *
 * Deliberately the same shape as site-theme.ts, including the cache, because the two are
 * read on the same path and a studio changes either of them roughly once. Kept as its own
 * module rather than folded into the theme for the reason in shared/siteLayouts.ts: colour
 * and composition are independent choices.
 */

let _cache: { layout: SiteLayout; at: number } | null = null;
const TTL = 30_000;

export function invalidateSiteLayout(): void { _cache = null; }

export async function getSiteLayoutForStudio(): Promise<SiteLayout> {
  if (_cache && Date.now() - _cache.at < TTL) return _cache.layout;
  let id: string | null = null;
  try {
    const r = await pool.query('SELECT site_layout FROM studio_configs LIMIT 1');
    id = (r.rows[0]?.site_layout || '').trim() || null;
  } catch {
    // Column not added yet on an older instance. A missing layout is the default layout,
    // never an error on a public page render.
  }
  const layout = getSiteLayout(id || DEFAULT_LAYOUT_ID);
  _cache = { layout, at: Date.now() };
  return layout;
}

export async function saveSiteLayout(id: string): Promise<SiteLayout> {
  // Narrowed before it reaches the database, so an unknown id cannot be stored and then
  // silently render as nothing.
  const safe = normalizeLayoutId(id);
  await pool.query('UPDATE studio_configs SET site_layout = $1 WHERE TRUE', [safe]);
  invalidateSiteLayout();
  return getSiteLayout(safe);
}
