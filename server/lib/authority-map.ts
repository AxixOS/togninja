import { pool } from '../db';
import { DEFAULT_AUTHORITY_MAP, EMPTY_AUTHORITY_MAP, normalizeAuthorityMap, pillarForTopic, type AuthorityMap } from '../../shared/authorityMap.js';

/**
 * Resolve this studio's Authority Map: studio_configs.authority_map when present and valid,
 * otherwise EMPTY (no pillars). Cached briefly — it's read on the SSR hot path (blog uplinks)
 * and by the public /api/authority-map endpoint. invalidateAuthorityMap() clears it after edits.
 */
let _cache: { value: AuthorityMap; at: number } | null = null;
const TTL = 60_000;

export function invalidateAuthorityMap(): void { _cache = null; }

export async function getAuthorityMap(): Promise<AuthorityMap> {
  if (_cache && Date.now() - _cache.at < TTL) return _cache.value;
  // No stored map → NO pillars. This used to fall back to DEFAULT_AUTHORITY_MAP,
  // which is one specific studio's Vienna pillar graph, so every other instance
  // advertised its services. New Age keeps its own map by having it STORED; the
  // seed remains exported for that purpose.
  let map: AuthorityMap = EMPTY_AUTHORITY_MAP;
  try {
    const r = await pool.query('SELECT authority_map FROM studio_configs LIMIT 1');
    const stored = normalizeAuthorityMap(r.rows[0]?.authority_map);
    if (stored) map = stored;
  } catch { /* column may not exist yet on an old DB — render no pillars */ }
  _cache = { value: map, at: Date.now() };
  return map;
}

export async function saveAuthorityMap(map: AuthorityMap): Promise<void> {
  await pool.query('UPDATE studio_configs SET authority_map = $1::jsonb WHERE TRUE', [JSON.stringify(map)]);
  invalidateAuthorityMap();
}

/**
 * Close the topical loop: when a cluster article is published, register it as a down-link
 * under the pillar it supports. Only touches a studio's OWN saved map — studios on the
 * default seed (e.g. New Age) are left alone, since they use hand-curated guide lists.
 * Best-effort and idempotent.
 */
export async function registerClusterForPost(slug: string, title: string): Promise<void> {
  if (!slug || !title) return;
  try {
    const r = await pool.query('SELECT authority_map FROM studio_configs LIMIT 1');
    const map = normalizeAuthorityMap(r.rows[0]?.authority_map);
    if (!map) return; // on the default seed — don't auto-edit
    const target = pillarForTopic(map, `${title} ${slug}`);
    const pillar = map.pillars.find((p) => p.href === target.pillar.href);
    if (!pillar) return;
    const href = `/blog/${slug}`;
    pillar.clusters = pillar.clusters || [];
    if (pillar.clusters.some((c) => c.href === href)) return; // already linked
    pillar.clusters.unshift({ href, label: title });
    if (pillar.clusters.length > 8) pillar.clusters = pillar.clusters.slice(0, 8);
    await pool.query('UPDATE studio_configs SET authority_map = $1::jsonb WHERE TRUE', [JSON.stringify(map)]);
    invalidateAuthorityMap();
  } catch { /* best-effort — never block a publish */ }
}
