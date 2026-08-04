import { pool } from '../db';
import { getThemePreset, DEFAULT_THEME_ID, type ThemePreset } from '../../shared/themePresets.js';

// Resolve the studio's public-site theme preset (studio_configs.site_theme_preset),
// falling back to the default. Cached briefly — read on the public studio-config path.
let _cache: { preset: ThemePreset; at: number } | null = null;
const TTL = 30_000;

export function invalidateSiteTheme(): void { _cache = null; }

export async function getSiteTheme(): Promise<ThemePreset> {
  if (_cache && Date.now() - _cache.at < TTL) return _cache.preset;
  let id: string | null = null;
  try {
    const r = await pool.query('SELECT site_theme_preset FROM studio_configs LIMIT 1');
    id = (r.rows[0]?.site_theme_preset || '').trim() || null;
  } catch { /* column may not exist yet */ }
  const preset = getThemePreset(id || DEFAULT_THEME_ID);
  _cache = { preset, at: Date.now() };
  return preset;
}

export async function saveSiteTheme(id: string): Promise<ThemePreset> {
  const preset = getThemePreset(id);
  await pool.query('UPDATE studio_configs SET site_theme_preset = $1 WHERE TRUE', [preset.id]);
  invalidateSiteTheme();
  return preset;
}
