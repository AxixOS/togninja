// Phase 2 — scaffold a landing-page DRAFT for each pillar in the studio's Authority Map.
// Reuses the landing-page engine (generateLandingContent -> mapGeneratedToLandingPage ->
// neonDb.createLandingPage), the same path the onboarding homepage pipeline uses. Pages are
// created as drafts with a preview token, reachable at /lp/<slug> and editable in the admin
// editor. Idempotent: a pillar whose slug already has a page is skipped.
import crypto from 'crypto';
import { generateLandingContent, NoOpenAIError, type LandingContext } from './landing-generator';
import { mapGeneratedToLandingPage, slugify } from './landing-mapping';
import { getAuthorityMap } from './authority-map';

const neonDb = require('../../database.js');

export interface ScaffoldResult {
  pillar: string;
  slug: string;
  status: 'created' | 'skipped' | 'error';
  id?: string;
  previewUrl?: string;
  editUrl?: string;
  error?: string;
}

export async function scaffoldPillarPages(
  opts: { city?: string; limit?: number; publish?: boolean; language?: string } = {},
): Promise<{ results: ScaffoldResult[]; created: number; skipped: number; remaining: number }> {
  const map = await getAuthorityMap();
  const cap = Math.max(1, Math.min(opts.limit || 6, 8)); // bound OpenAI cost/latency per call
  const results: ScaffoldResult[] = [];
  let created = 0;
  let skipped = 0;
  let processed = 0;

  for (const pillar of map.pillars) {
    const slug = slugify(pillar.href.replace(/^\/+|\/+$/g, '') || pillar.label);

    // Idempotent: if a landing page with this slug already exists, skip.
    const available = await neonDb.checkSlugAvailable(slug);
    if (!available) { results.push({ pillar: pillar.label, slug, status: 'skipped' }); skipped++; continue; }

    if (processed >= cap) continue; // leave the rest for a follow-up "Build" click
    processed++;

    try {
      const context: LandingContext = {
        primaryService: pillar.label,
        city: opts.city || undefined,
        // Without this the generator defaulted to English regardless of the studio, so a
        // Spanish or German studio got English pillar pages under its own nav.
        language: opts.language || undefined,
        tone: 'warm',
        pageType: 'landing',
        keywords: pillar.keyphrase || undefined,
        offerSummary: pillar.keyphrase ? `${pillar.label} — ${pillar.keyphrase}` : pillar.label,
      };
      const gen = await generateLandingContent(context);
      const payload = mapGeneratedToLandingPage(gen.content, context, { userId: null });
      payload.slug = slug; // pin to the pillar slug (confirmed available above)
      payload.page_type = 'landing';

      const page = await neonDb.createLandingPage(payload);
      const previewToken = crypto.randomBytes(24).toString('hex');
      await neonDb.updateLandingPage(page.id, {
        preview_token: previewToken,
        preview_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        // Onboarding publishes; the admin "Build pillar pages" button does not.
        //
        // Pages are drafts by default so a studio reviews additions before they go live.
        // During ONBOARDING that default produced the opposite of what the wizard
        // promises: the nav listed the studio's five services, every one of them resolved
        // to a page with no copy, because getLandingPageBySlug only ever returns
        // published rows. Onboarding already publishes the five main pages it generates;
        // pillars are the same kind of output and belong in the same state.
        ...(opts.publish ? { status: 'published', published_at: new Date().toISOString() } : {}),
      });
      results.push({
        pillar: pillar.label, slug: page.slug, status: 'created', id: page.id,
        previewUrl: `/lp/${page.slug}?preview=${previewToken}`,
        editUrl: `/admin/landing-pages/${page.id}`,
      });
      created++;
    } catch (e: any) {
      if (e instanceof NoOpenAIError) throw e; // surface to the endpoint as a 400
      results.push({ pillar: pillar.label, slug, status: 'error', error: String(e?.message || e).slice(0, 200) });
    }
  }

  return { results, created, skipped, remaining: Math.max(0, map.pillars.length - results.length) };
}
