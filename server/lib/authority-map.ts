import { pool } from '../db';
import { DEFAULT_AUTHORITY_MAP, normalizeAuthorityMap, type AuthorityMap } from '../../shared/authorityMap.js';

/**
 * Resolve this studio's Authority Map: studio_configs.authority_map when present and valid,
 * otherwise the New Age seed. Cached briefly — it's read on the SSR hot path (blog uplinks)
 * and by the public /api/authority-map endpoint. invalidateAuthorityMap() clears it after edits.
 */
let _cache: { value: AuthorityMap; at: number } | null = null;
const TTL = 60_000;

export function invalidateAuthorityMap(): void { _cache = null; }

export async function getAuthorityMap(): Promise<AuthorityMap> {
  if (_cache && Date.now() - _cache.at < TTL) return _cache.value;
  let map: AuthorityMap = DEFAULT_AUTHORITY_MAP;
  try {
    const r = await pool.query('SELECT authority_map FROM studio_configs LIMIT 1');
    const stored = normalizeAuthorityMap(r.rows[0]?.authority_map);
    if (stored) map = stored;
  } catch { /* column may not exist yet on an old DB — use the seed */ }
  _cache = { value: map, at: Date.now() };
  return map;
}

export async function saveAuthorityMap(map: AuthorityMap): Promise<void> {
  await pool.query('UPDATE studio_configs SET authority_map = $1::jsonb WHERE TRUE', [JSON.stringify(map)]);
  invalidateAuthorityMap();
}
