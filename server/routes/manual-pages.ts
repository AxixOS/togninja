import express from 'express';
import { db } from '../db';
import { manualPageContent, studioConfigs } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../auth';
import { getSiteIdentity } from '../lib/siteIdentity';
import { config as appConfig } from '../config-reader';
import { tenantOpenAI } from '../lib/openaiClient';

const router = express.Router();

// The studio this deployment belongs to. Single-tenant per deployment (one DB = one
// studio), so the truth is simply the studio_configs singleton row — NOT req.user, and
// NOT the env/canonical fallback on its own. Both mattered:
//   • Writes ran as req.user?.studioId while the PUBLIC read (no session) used the env
//     fallback, so published edits were saved under one id and read back under another
//     — the studio's changes never reached the live site.
//   • manual_page_content.studio_id carries an FK to studio_configs on any DB created by
//     drizzle push, so writing a canonical id that has no studio_configs row failed the
//     FK outright — the "Publish failed" toast, with the real cause only in the logs.
// Resolved once and cached; the row id cannot change under a running process.
let cachedStudioId: string | null = null;
const FALLBACK_STUDIO_ID = process.env.STUDIO_ID || '550e8400-e29b-41d4-a716-446655440000';

async function resolveStudioId(): Promise<string> {
  if (cachedStudioId) return cachedStudioId;
  try {
    const [row] = await db.select({ id: studioConfigs.id }).from(studioConfigs).limit(1);
    if (row?.id) {
      cachedStudioId = row.id;
      return cachedStudioId;
    }
  } catch (e: any) {
    console.warn('[manual-pages] studio_configs lookup failed, using fallback id:', e?.message || e);
  }
  return FALLBACK_STUDIO_ID;
}

// Pages whose values are properties of the STUDIO, not of a language: the logo, the
// brand colours, the reviews link. manual_page_content is keyed per language, so these
// were being stored once per language and silently diverging — a logo uploaded while
// the editor was on English was invisible to the German site and to /api/studio-config
// (which reads 'de' by default), so the panel showed one logo and the live header
// another. Writes to these pages mirror across every language the studio has.
const GLOBAL_PAGES = new Set(['site-settings']);

/** Every language this studio already has rows for, plus the one being written. */
async function languagesForStudio(studioId: string, include: string): Promise<string[]> {
  const rows = await db
    .select({ language: manualPageContent.language })
    .from(manualPageContent)
    .where(eq(manualPageContent.studioId, studioId));
  const set = new Set<string>(rows.map((r) => r.language).filter(Boolean) as string[]);
  set.add(include);
  return [...set];
}

// Build the studio's brand + locale context for AI copy from the TENANT'S OWN identity
// (env/config via siteIdentity) — never a hardcoded studio. Neutral when unconfigured, so
// a boudoir studio in the UK doesn't get "New Age Fotografie in Vienna" or German.
async function buildStudioContext(reqLanguage: string) {
  const id = getSiteIdentity();
  let name = id.name;
  try { name = (await appConfig.get('business_name')) || (await appConfig.get('studio_name')) || id.name; } catch { /* env fallback */ }
  const description = (id.description || '').trim();
  const city = (id.address?.city || '').trim();
  const country = (id.address?.country || '').trim();
  const location = [city, country].filter(Boolean).join(', ');
  const studioName = name && name !== 'My Studio' ? name : 'the studio';
  const persona = description
    ? `${studioName} — ${description}${location ? ` (based in ${location})` : ''}.`
    : `${studioName}, a professional photography studio${location ? ` in ${location}` : ''}.`;
  const brand = `${persona} Warm, human, confident but never salesy; short, natural sentences.`;
  // Honour the editor's toggle (it now defaults to the studio's language); fall back to the
  // studio's configured locale rather than assuming German.
  const lang = reqLanguage === 'en' ? 'English'
    : reqLanguage === 'de' ? 'German'
    : (id.lang || 'en').toLowerCase().startsWith('de') ? 'German' : 'English';
  return { brand, lang, city, location };
}

// GET /api/manual-pages - List all manual page content records for this studio
router.get('/', requireAuth, async (req, res) => {
  try {
    const studioId = await resolveStudioId();
    const { language = 'de' } = req.query;

    const records = await db
      .select()
      .from(manualPageContent)
      .where(
        and(
          eq(manualPageContent.studioId, studioId),
          eq(manualPageContent.language, language as string)
        )
      );

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json(records);
  } catch (error) {
    console.error('Failed to fetch manual page content:', error);
    res.status(500).json({ error: 'Failed to fetch manual page content' });
  }
});

// GET /api/manual-pages/published/all - PUBLIC: merged published content for
// the whole studio as one flat {translationKey: value} map. The public site's
// LanguageContext overlays this on the built-in copy — this is the link that
// makes Manual Website Update edits actually reach the live pages.
router.get('/published/all', async (req, res) => {
  try {
    const studioId = await resolveStudioId();
    const { language = 'de' } = req.query;

    const records = await db
      .select()
      .from(manualPageContent)
      .where(
        and(
          eq(manualPageContent.studioId, studioId),
          eq(manualPageContent.language, language as string)
        )
      );

    const content: Record<string, string> = {};
    for (const r of records) {
      const pub = (r.publishedContent || {}) as Record<string, unknown>;
      for (const [k, v] of Object.entries(pub)) {
        if (typeof v === 'string' && v.trim()) content[k] = v;
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json({ language, content });
  } catch (error) {
    // Table missing or DB error — the site must still render its built-in copy.
    console.warn('Published manual content fallback:', (error as any)?.message || error);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ language: req.query.language || 'de', content: {} });
  }
});

// GET /api/manual-pages/:pageId - Get content for a specific page
router.get('/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const { language = 'de', studioId: queryStudioId } = req.query;
    
    // Allow public access for frontend rendering
    const studioId = queryStudioId || await resolveStudioId();

    const [record] = await db
      .select()
      .from(manualPageContent)
      .where(
        and(
          eq(manualPageContent.studioId, studioId as string),
          eq(manualPageContent.pageId, pageId),
          eq(manualPageContent.language, language as string)
        )
      )
      .limit(1);

    // The logo the studio uploaded during onboarding lives on studio_configs. Website
    // Studio edits a separate key (site.logo), so an untouched Logo & Branding panel
    // rendered an empty box next to a site whose header was already showing the real
    // logo. Fill the field from the studio's own logo whenever the key is unset.
    const withLogoFallback = async (content: Record<string, any>) => {
      if (pageId !== 'site-settings') return content;
      if (String(content?.['site.logo'] || '').trim()) return content;
      try {
        const [cfg] = await db.select({ logo: studioConfigs.logoUrl }).from(studioConfigs).limit(1);
        if (cfg?.logo) return { ...content, 'site.logo': cfg.logo };
      } catch { /* the panel is still usable without it */ }
      return content;
    };

    if (!record) {
      // Return empty published content if no record exists (fallback to translation keys)
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      return res.json({
        pageId,
        language,
        publishedContent: await withLogoFallback({}),
        status: 'none'
      });
    }

    // For public requests, only return published content
    const isAuthenticated = req.user || req.session?.userId;
    if (!isAuthenticated) {
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      return res.json({
        pageId: record.pageId,
        language: record.language,
        publishedContent: await withLogoFallback((record.publishedContent || {}) as any),
        status: record.status,
        publishedAt: record.publishedAt
      });
    }

    // For authenticated admin users, return full record including drafts (never cached)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({
      ...record,
      draftContent: await withLogoFallback((record.draftContent || {}) as any),
      publishedContent: await withLogoFallback((record.publishedContent || {}) as any),
    });
  } catch (error) {
    // If the table doesn't exist yet or any DB error occurs, return a safe fallback
    console.warn('Manual page fetch fallback:', (error as any)?.message || error);
    const { pageId } = req.params;
    const { language = 'de' } = req.query;
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json({
      pageId,
      language,
      publishedContent: {},
      status: 'none'
    });
  }
});

// POST /api/manual-pages/enhance-field - AI refine or SEO-optimise a single
// field's text, in the studio's tone. Registered BEFORE POST /:pageId so the
// literal path isn't captured as a pageId.
router.post('/enhance-field', requireAuth, async (req, res) => {
  try {
    const { text, mode = 'refine', label = '', helperText = '', pageName = '', context = [], language = 'de' } = req.body || {};
    // refine/seo improve existing copy; generate writes from scratch (no text needed).
    if (mode !== 'generate' && (!text || typeof text !== 'string' || !text.trim())) {
      return res.status(400).json({ error: 'text is required' });
    }

    const OpenAI = (await import('openai')).default;
    const openai = await tenantOpenAI('manual-pages');
    if (!openai) {
      return res.status(503).json({ error: 'not_configured', message: 'Add an OpenAI key to have pages written for you.' });
    }

    const { brand, lang, city, location } = await buildStudioContext(language);
    const localePhrase = location ? ` in ${location}` : '';
    const cityKeyword = city ? ` plus "${city}"` : '';

    // Compact, safe rendering of the page's other fields so generated copy stays
    // coherent with what's already on the page.
    const contextBlock = Array.isArray(context) && context.length
      ? '\n\nOther fields already on this page (for consistency — do not repeat them verbatim):\n' +
        context
          .filter((c: any) => c && typeof c.value === 'string' && c.value.trim())
          .slice(0, 12)
          .map((c: any) => `- ${String(c.label || '').slice(0, 60)}: ${String(c.value).slice(0, 300)}`)
          .join('\n')
      : '';

    let system: string;
    let userContent: string;
    if (mode === 'generate') {
      system = `You are a senior website copywriter for ${brand} Write ONE website field from scratch, in ${lang}, that is high-converting and SEO-aware for local photography search${localePhrase}. Match the length and format to the field type implied by its label: a "title/heading" is one short punchy line (no period); a "subtitle/tagline" is a single short line; a "description" is 2–3 warm, concrete sentences; an FAQ "question" is a short natural question; an FAQ "answer" is 1–3 helpful sentences; a CTA/button is 2–4 words. Naturally include a relevant keyword (e.g. the service named in the label${cityKeyword}) without keyword-stuffing. Do NOT invent specific prices, dates, awards or guarantees. Output plain text only (no markdown, no surrounding quotes). Return ONLY a JSON object: {"result": "the generated text", "tips": ["2-4 very short tips on what makes this copy convert"]}.`;
      userContent = `Field label: "${label}"${helperText ? `\nField purpose: "${helperText}"` : ''}\nPage: "${pageName}"\nLanguage: ${lang}${contextBlock}\n\nWrite the "${label}" field now.`;
    } else if (mode === 'seo') {
      system = `You are an SEO copywriter for ${brand} Rewrite the given website field so it ranks better for local photography search${localePhrase}, while keeping the SAME meaning, the SAME language (${lang}) and the author's warm tone. Naturally weave in relevant keywords (e.g. the service named in the field label${cityKeyword}) without keyword-stuffing. Keep it concise and human. Return ONLY a JSON object: {"result": "the improved text", "tips": ["2-4 very short SEO tips"]}.`;
      userContent = `Field label: "${label}"\nPage: "${pageName}"\nLanguage: ${lang}${contextBlock}\n\nText to SEO-optimise:\n${text}`;
    } else {
      system = `You are a copy editor for ${brand} Refine the given website field: fix grammar and flow and make it warm and natural in the studio's tone, keeping the SAME meaning and the SAME language (${lang}). Do NOT invent new facts, prices or claims, and keep roughly the same length. Return ONLY a JSON object: {"result": "the improved text"}.`;
      userContent = `Field label: "${label}"\nPage: "${pageName}"\nLanguage: ${lang}\n\nText to refine:\n${text}`;
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_LANDING_MODEL || process.env.OPENAI_PRICE_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      temperature: mode === 'refine' ? 0.5 : 0.7,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { return res.status(500).json({ error: 'AI returned an invalid response' }); }
    const result = typeof parsed.result === 'string' ? parsed.result.trim() : '';
    if (!result) return res.status(500).json({ error: 'AI returned no text' });

    res.json({ result, tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 4).filter((t: any) => typeof t === 'string') : [] });
  } catch (error: any) {
    console.error('Enhance field failed:', error?.message || error);
    res.status(500).json({ error: 'Failed to enhance field. Check the OpenAI key is set.' });
  }
});

// POST /api/manual-pages/:pageId - Create or update page content
router.post('/:pageId', requireAuth, async (req, res) => {
  try {
    const { pageId } = req.params;
    const studioId = await resolveStudioId();
    const { language = 'de', draftContent, action = 'save_draft' } = req.body;

    if (!draftContent || typeof draftContent !== 'object') {
      return res.status(400).json({ error: 'draftContent is required and must be an object' });
    }

    // Check if record exists
    const [existing] = await db
      .select()
      .from(manualPageContent)
      .where(
        and(
          eq(manualPageContent.studioId, studioId),
          eq(manualPageContent.pageId, pageId),
          eq(manualPageContent.language, language)
        )
      )
      .limit(1);

    let result;

    if (existing) {
      // Update existing record
      const updates: any = {
        draftContent,
        updatedAt: new Date()
      };

      // If action is 'publish', also update published content
      if (action === 'publish') {
        updates.publishedContent = draftContent;
        updates.publishedAt = new Date();
        updates.status = 'published';
      }

      [result] = await db
        .update(manualPageContent)
        .set(updates)
        .where(eq(manualPageContent.id, existing.id))
        .returning();
    } else {
      // Create new record
      const newRecord: any = {
        studioId,
        pageId,
        language,
        draftContent,
        publishedContent: action === 'publish' ? draftContent : {},
        status: action === 'publish' ? 'published' : 'draft',
        publishedAt: action === 'publish' ? new Date() : null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      [result] = await db
        .insert(manualPageContent)
        .values(newRecord)
        .returning();
    }

    // A global page belongs to the studio, not to a language — mirror it to every
    // language so the editor, the live site and /api/studio-config cannot disagree
    // about something like the logo just because they read different rows.
    if (GLOBAL_PAGES.has(pageId)) {
      try {
        const langs = (await languagesForStudio(studioId, language)).filter((l) => l !== language);
        for (const lang of langs) {
          const [peer] = await db
            .select()
            .from(manualPageContent)
            .where(
              and(
                eq(manualPageContent.studioId, studioId),
                eq(manualPageContent.pageId, pageId),
                eq(manualPageContent.language, lang),
              ),
            )
            .limit(1);

          const mirrored: any = { draftContent, updatedAt: new Date() };
          if (action === 'publish') {
            mirrored.publishedContent = draftContent;
            mirrored.publishedAt = new Date();
            mirrored.status = 'published';
          }

          if (peer) {
            await db.update(manualPageContent).set(mirrored).where(eq(manualPageContent.id, peer.id));
          } else {
            await db.insert(manualPageContent).values({
              studioId, pageId, language: lang,
              draftContent,
              publishedContent: action === 'publish' ? draftContent : {},
              status: action === 'publish' ? 'published' : 'draft',
              publishedAt: action === 'publish' ? new Date() : null,
              createdAt: new Date(), updatedAt: new Date(),
            } as any);
          }
        }
      } catch (e: any) {
        // Mirroring is a consistency improvement, not the save itself — never fail the
        // studio's edit because a peer-language row could not be written.
        console.warn('[manual-pages] global page mirror failed:', e?.message || e);
      }
    }

    res.json(result);
  } catch (error: any) {
    // Return the real reason — a bare "Failed to save" left the studio staring at
    // "Publish failed. Please try again." with no way to know it was, say, an FK
    // violation on studio_id, and nothing to report but a screenshot.
    console.error('Failed to save page content:', error);
    res.status(500).json({
      error: 'Failed to save page content',
      detail: String(error?.message || error).slice(0, 300)
    });
  }
});

// POST /api/manual-pages/:pageId/publish - Publish draft content
router.post('/:pageId/publish', requireAuth, async (req, res) => {
  try {
    const { pageId } = req.params;
    const studioId = await resolveStudioId();
    const { language = 'de' } = req.body;

    const [existing] = await db
      .select()
      .from(manualPageContent)
      .where(
        and(
          eq(manualPageContent.studioId, studioId),
          eq(manualPageContent.pageId, pageId),
          eq(manualPageContent.language, language)
        )
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Page content not found' });
    }

    const [result] = await db
      .update(manualPageContent)
      .set({
        publishedContent: existing.draftContent,
        publishedAt: new Date(),
        status: 'published',
        updatedAt: new Date()
      })
      .where(eq(manualPageContent.id, existing.id))
      .returning();

    res.json(result);
  } catch (error) {
    console.error('Failed to publish page content:', error);
    res.status(500).json({ error: 'Failed to publish page content' });
  }
});

// DELETE /api/manual-pages/:pageId - Delete page content (reset to defaults)
router.delete('/:pageId', requireAuth, async (req, res) => {
  try {
    const { pageId } = req.params;
    const studioId = await resolveStudioId();
    const { language = 'de' } = req.query;

    await db
      .delete(manualPageContent)
      .where(
        and(
          eq(manualPageContent.studioId, studioId),
          eq(manualPageContent.pageId, pageId),
          eq(manualPageContent.language, language as string)
        )
      );

    res.json({ success: true, message: 'Page content reset to defaults' });
  } catch (error) {
    console.error('Failed to delete page content:', error);
    res.status(500).json({ error: 'Failed to delete page content' });
  }
});

export default router;
