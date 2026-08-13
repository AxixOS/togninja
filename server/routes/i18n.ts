/**
 * Multi-language UI translations.
 *
 * The client ships English + German inline. French/Spanish (and any future language)
 * are AI-generated on demand and cached in the `ui_translations` table, then served
 * to the client which merges them over the built-in strings (English is always the
 * per-key fallback, so a partially-translated language never shows blank).
 *
 * - GET  /api/i18n/settings           (public)  default + enabled languages
 * - POST /api/i18n/settings           (admin)   save language settings
 * - GET  /api/i18n/:language          (public)  cached translation map for a language
 * - POST /api/admin/i18n/generate     (admin)   AI-translate a source map -> cache
 *
 * Self-contained: creates its own tables on demand (no studio_configs / boot changes).
 */
import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireAuth } from '../auth';
import { getExplicitSiteLanguage } from '../lib/site-language';

const router = Router();

export const SUPPORTED_LANGUAGES = ['en', 'de', 'fr', 'es'] as const;
export type UiLanguage = (typeof SUPPORTED_LANGUAGES)[number];
const LANGUAGE_NAMES: Record<string, string> = { en: 'English', de: 'German', fr: 'French', es: 'Spanish' };

let _tablesReady = false;
async function ensureTables(): Promise<void> {
  if (_tablesReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ui_translations (
      language text NOT NULL,
      key text NOT NULL,
      value text NOT NULL,
      updated_at timestamptz DEFAULT now(),
      PRIMARY KEY (language, key)
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS i18n_settings (
      id integer PRIMARY KEY DEFAULT 1,
      default_language text DEFAULT 'de',
      enabled_languages jsonb DEFAULT '["en","de"]'::jsonb,
      updated_at timestamptz DEFAULT now()
    )`);
  await pool.query(`INSERT INTO i18n_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
  _tablesReady = true;
}

// GET /api/i18n/settings — public (the language provider + selector read this).
//
// PRECEDENCE LIVES HERE, and only here: this is the single reader of
// default_language, and the client applies whatever it returns. The studio's OWN
// answer (studio_configs.site_language) beats this table.
//
// It has to, because 'de' is this table's ambient default in three places — the
// column default above, the `|| 'de'` below, and the catch. The write-time sync
// (applySiteLanguageToI18n, called only from setup-routes and studio-branding)
// is best-effort and swallows its own failures, so a studio that chose English
// at onboarding could still be handed the German translation set — along with
// the origin studio's Vienna copy, down to its phone number. Resolving at read
// time cannot silently not happen; a third best-effort write could.
//
// getExplicitSiteLanguage() returns null when the studio NEVER ANSWERED the
// question (see site-language.ts) — and null must defer to this table unchanged.
// Such an instance is legitimately German and has no stored answer to promote,
// so overriding it here would flip a live site to English. Null is the whole
// safety story: on an unanswered instance this handler returns exactly what it
// returned before.
router.get('/i18n/settings', async (_req: Request, res: Response) => {
  // Resolved OUTSIDE the try so the error path honours it too. Never throws —
  // a missing column or table is swallowed into null.
  const answered = await getExplicitSiteLanguage();
  const explicit = answered && (SUPPORTED_LANGUAGES as readonly string[]).includes(answered) ? answered : null;
  try {
    await ensureTables();
    const { rows } = await pool.query(`SELECT default_language, enabled_languages FROM i18n_settings WHERE id = 1`);
    const r = rows[0] || {};
    const stored = Array.isArray(r.enabled_languages) ? r.enabled_languages : ['en', 'de'];
    const enabled = stored.filter((l: string) => (SUPPORTED_LANGUAGES as readonly string[]).includes(l));
    // The default has to be selectable, or the selector offers a set that
    // excludes the language the site is actually rendering. enabled_languages is
    // otherwise left alone — narrowing it to [code] would silently remove a
    // studio's language selector.
    if (explicit && !enabled.includes(explicit)) enabled.unshift(explicit);
    res.json({
      defaultLanguage: explicit || r.default_language || 'de',
      enabledLanguages: enabled.length ? enabled : ['en', 'de'],
    });
  } catch (e: any) {
    // Never break the site over i18n — fall back to en/de, still honouring an
    // explicit answer if we resolved one before the failure.
    res.json({
      defaultLanguage: explicit || 'de',
      enabledLanguages: explicit && explicit !== 'en' && explicit !== 'de' ? [explicit, 'en', 'de'] : ['en', 'de'],
    });
  }
});

// POST /api/i18n/settings — admin: save default + enabled languages.
router.post('/i18n/settings', requireAuth, async (req: Request, res: Response) => {
  try {
    await ensureTables();
    const body = req.body || {};
    const enabled = Array.isArray(body.enabledLanguages)
      ? body.enabledLanguages.filter((l: string) => (SUPPORTED_LANGUAGES as readonly string[]).includes(l))
      : ['en', 'de'];
    if (!enabled.includes('en')) enabled.unshift('en'); // English is the fallback — always on
    const def = (SUPPORTED_LANGUAGES as readonly string[]).includes(body.defaultLanguage) && enabled.includes(body.defaultLanguage)
      ? body.defaultLanguage : enabled[0];
    await pool.query(
      `UPDATE i18n_settings SET default_language = $1, enabled_languages = $2::jsonb, updated_at = now() WHERE id = 1`,
      [def, JSON.stringify(enabled)],
    );
    res.json({ defaultLanguage: def, enabledLanguages: enabled });
  } catch (e: any) {
    console.error('[i18n] save settings error:', e?.message || e);
    res.status(500).json({ error: 'Failed to save language settings' });
  }
});

// GET /api/i18n/:language — public: the cached translation map for one language.
router.get('/i18n/:language', async (req: Request, res: Response) => {
  try {
    const language = String(req.params.language || '').toLowerCase();
    if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(language)) return res.json({});
    await ensureTables();
    const { rows } = await pool.query(`SELECT key, value FROM ui_translations WHERE language = $1`, [language]);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    res.json(map);
  } catch (e: any) {
    res.json({});
  }
});

// POST /api/admin/i18n/generate — admin: AI-translate a source map into a language.
// Body: { language, source: {key: englishText}, force?: boolean }
// Translates only keys not already cached (unless force), in batches, preserving
// {{placeholders}}. Returns counts. Uses the instance's OPENAI_API_KEY.
router.post('/admin/i18n/generate', requireAuth, async (req: Request, res: Response) => {
  try {
    await ensureTables();
    const language = String(req.body?.language || '').toLowerCase();
    const source: Record<string, string> = req.body?.source || {};
    const force = !!req.body?.force;
    if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(language) || language === 'en') {
      return res.status(400).json({ error: 'Unsupported target language' });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'OpenAI key not configured — add it in Settings → AI & API Keys first.' });
    }
    const sourceKeys = Object.keys(source).filter((k) => typeof source[k] === 'string' && source[k].trim());
    let todo = sourceKeys;
    if (!force) {
      const { rows } = await pool.query(`SELECT key FROM ui_translations WHERE language = $1`, [language]);
      const have = new Set(rows.map((r: any) => r.key));
      todo = sourceKeys.filter((k) => !have.has(k));
    }
    if (todo.length === 0) return res.json({ language, translated: 0, total: sourceKeys.length, cached: sourceKeys.length });

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_LANDING_MODEL || process.env.OPENAI_PRICE_MODEL || 'gpt-4o-mini';
    const langName = LANGUAGE_NAMES[language] || language;

    // Batch to keep each request small and JSON-parseable.
    const BATCH = 40;
    let translated = 0;
    for (let i = 0; i < todo.length; i += BATCH) {
      const slice = todo.slice(i, i + BATCH);
      const payload: Record<string, string> = {};
      for (const k of slice) payload[k] = source[k];
      const sys = `You are a professional UI translator for a photography-studio web app. Translate the VALUES of the given JSON object into ${langName}. Rules: keep every key exactly as-is; translate only the values; preserve any placeholders like {{name}}, {firstName}, %s, and HTML tags exactly; keep it concise and natural for buttons/labels; return ONLY a valid JSON object with the same keys.`;
      try {
        const completion = await openai.chat.completions.create({
          model,
          messages: [{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify(payload) }],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        });
        const out = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
        const entries = Object.entries(out).filter(([k, v]) => slice.includes(k) && typeof v === 'string' && v);
        if (entries.length) {
          // Bulk upsert this batch.
          const values: string[] = [];
          const params: any[] = [];
          entries.forEach(([k, v], idx) => {
            params.push(language, k, v);
            values.push(`($${idx * 3 + 1}, $${idx * 3 + 2}, $${idx * 3 + 3}, now())`);
          });
          await pool.query(
            `INSERT INTO ui_translations (language, key, value, updated_at) VALUES ${values.join(', ')}
             ON CONFLICT (language, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
            params,
          );
          translated += entries.length;
        }
      } catch (batchErr: any) {
        console.warn(`[i18n] batch translate failed (${language}, +${slice.length}):`, batchErr?.message || batchErr);
        // continue with the next batch — partial coverage still improves the UI
      }
    }
    res.json({ language, translated, total: sourceKeys.length });
  } catch (e: any) {
    console.error('[i18n] generate error:', e?.message || e);
    res.status(500).json({ error: 'Translation generation failed' });
  }
});

export default router;
