import { pool } from '../db';
import { generateAuthorityMap } from './authority-map-generator.js';
import { hasOpenAI } from './landing-generator.js';
import { saveAuthorityMap } from './authority-map.js';
import { complete, parseModelJson, type Payer } from './openaiClient';

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
    //
    // Platform-funded, through the gateway when configured. This call distils the profile the
    // site copy and the Authority Map are both built from, so anything weaker here degrades
    // everything after it — which is why it runs on the same pinned model as the other two.
    //
    // The parameters moved: this sent temperature 0.2 and max_tokens 300, and the registry
    // pins 0.7 and 4000. 0.7 is a creative-writing temperature on what is a field-extraction
    // job, and it is worth asking AxixOS to lower. Matching the pin anyway is deliberate: a
    // fallback that behaves differently from the gateway is a difference nothing reports.
    let profile: any = {};
    try {
      const distil = await complete('platform', 'ai.authority_from_crawl', [
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
      ]);
      profile = parseModelJson(distil.content, 'Business profile extraction');
    } catch (e: any) {
      // Fire-and-forget by contract: this function must never throw into its caller. An
      // unfunded platform, a spent allowance and a malformed reply all mean the same thing
      // here — no map this time, and never 'your site could not be read'.
      console.warn(`[authority-from-crawl] profile extraction unavailable (${e?.code || e?.message}) — skipping map generation`);
      return null as any;
    }

    // 2) Generate the Authority Map from the studio's own profile.
    // Onboarding: the platform funds the map, same as the profile it was distilled from.
    const map = await generateAuthorityMap({
      businessName: profile.businessName || undefined,
      niche: profile.niche || undefined,
      services: profile.services || undefined,
      city: profile.city || undefined,
      language: profile.language || undefined,
    }, 'platform');

    // 3) Persist to the studio's config, THROUGH saveAuthorityMap so the read cache is
    //    invalidated. Writing with a raw UPDATE left getAuthorityMap()'s 60-second cache
    //    holding the pre-write value, and scaffoldPillarPages reads through that cache
    //    immediately afterwards — so the map was correct in the database while the
    //    scaffolder saw an empty one and built nothing. Observed live: "Authority Map
    //    generated" followed by "pillar pages: 0 created, 0 already existed, 0 left".
    //    Because ordinary traffic primes the cache, whether a studio got its pillar pages
    //    depended on whether anyone had loaded a page in the previous minute.
    await saveAuthorityMap(map);
    console.log('✅ Authority Map generated from crawl for studio', studio.id, '(niche:', profile.niche || 'n/a', ')');
  } catch (e: any) {
    console.warn('⚠️ generateAuthorityMapFromCrawl failed (non-fatal):', e?.message || e);
  }
}
