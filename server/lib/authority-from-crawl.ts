import { pool } from '../db';
import { generateAuthorityMap } from './authority-map-generator.js';
import { hasOpenAI } from './landing-generator.js';

/**
 * P2a — connect the onboarding site-analysis to the Authority Map.
 *
 * The crawl stores the studio's existing site in `website_pages` but that output was
 * orphaned: nothing populated the studio's topical-authority structure, so a fresh studio
 * fell back to the New Age seed. This distils a business profile from the crawled pages,
 * generates an Authority Map for THAT studio's niche, and persists it to
 * `studio_configs.authority_map` — so the analysed pillars actually flow into the product.
 *
 * Best-effort + fire-and-forget: it never throws into the caller and never clobbers a map
 * the studio has already customised (only populates when the column is still empty).
 */
export async function generateAuthorityMapFromCrawl(jobId: string): Promise<void> {
  try {
    if (!hasOpenAI()) return;

    // Single-tenant per instance: the singleton studio_configs row.
    const scRes = await pool.query(`SELECT id, authority_map FROM studio_configs LIMIT 1`);
    const studio = scRes.rows[0];
    if (!studio) return;
    // Don't overwrite a map the studio (or a prior run) has already set.
    if (studio.authority_map) return;

    const pagesRes = await pool.query(
      `SELECT title, text_content FROM website_pages WHERE crawl_job_id = $1 ORDER BY created_at ASC LIMIT 25`,
      [jobId],
    );
    const pages = pagesRes.rows || [];
    if (!pages.length) return;

    // Aggregate the crawled text (cap ~12k chars) for the distil prompt.
    const corpus = pages
      .map((p: any) => `# ${p.title || ''}\n${String(p.text_content || '').slice(0, 1500)}`)
      .join('\n\n')
      .slice(0, 12000);

    // 1) Distil a concise business profile from the crawled content.
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_LANDING_MODEL || process.env.OPENAI_PRICE_MODEL || 'gpt-4o-mini';
    const distil = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You extract a concise business profile from website text. Output STRICT JSON only — no prose, no code fences.' },
        {
          role: 'user',
          content:
            `From this website content, extract the business profile. Keys: businessName; ` +
            `niche (the photography/service specialty, e.g. "boudoir photography"); ` +
            `services (comma-separated main services); city (primary city / service area, or ""); ` +
            `language (the site's primary language name, e.g. "English").\n\n` +
            `Content:\n${corpus}\n\n` +
            `Return ONLY: {"businessName":"","niche":"","services":"","city":"","language":""}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    let profile: any = {};
    try { profile = JSON.parse(distil.choices[0]?.message?.content || '{}'); } catch { profile = {}; }

    // 2) Generate the Authority Map from the studio's own profile.
    const map = await generateAuthorityMap({
      businessName: profile.businessName || undefined,
      niche: profile.niche || undefined,
      services: profile.services || undefined,
      city: profile.city || undefined,
      language: profile.language || undefined,
    });

    // 3) Persist to the studio's config (jsonb).
    await pool.query(`UPDATE studio_configs SET authority_map = $1 WHERE id = $2`, [JSON.stringify(map), studio.id]);
    console.log('✅ Authority Map generated from crawl for studio', studio.id, '(niche:', profile.niche || 'n/a', ')');
  } catch (e: any) {
    console.warn('⚠️ generateAuthorityMapFromCrawl failed (non-fatal):', e?.message || e);
  }
}
