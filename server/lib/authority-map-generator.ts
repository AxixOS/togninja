// Generate a per-studio Authority Map (topical clusters + internal-link graph) from the
// studio's niche. Mirrors the OpenAI usage in landing-generator.ts. The result is reviewed
// and saved by the studio (POST .../generate returns it; PUT /api/authority-map persists it).
import { hasOpenAI, NoOpenAIError } from './landing-generator.js';
import { normalizeAuthorityMap, type AuthorityMap } from '../../shared/authorityMap.js';
import { platformComplete, parseModelJson } from './openaiClient';

export interface AuthorityMapInput {
  businessName?: string;
  niche?: string;
  services?: string;
  city?: string;
  language?: string;
}

const SHAPE = `{
  "pillars": [
    {
      "id": "kebab-id",
      "match": "lowercase|regex|alternation|of keywords that identify this topic",
      "href": "/pillar-slug/",
      "label": "Pillar Page Title",
      "keyphrase": "primary keyphrase",
      "siblings": [ { "href": "/other-pillar/", "label": "Anchor text to a sibling pillar" } ],
      "clusters": [ { "href": "/blog/cluster-slug", "label": "Supporting cluster article title" } ]
    }
  ],
  "defaultPillar": { "href": "/main-pillar/", "label": "Main Pillar", "siblings": [ { "href": "/x/", "label": "X" } ] },
  "conversionLinks": [ { "href": "/preise/", "label": "Prices" }, { "href": "/kontakt", "label": "Contact" } ]
}`;

export async function generateAuthorityMap(input: AuthorityMapInput): Promise<AuthorityMap> {
  if (!hasOpenAI()) throw new NoOpenAIError();

  const system = `You are an SEO information-architecture strategist. You design topical-authority site structures: a small set of pillar (money/service) pages, each supported by cluster (informational blog) articles, all tied together with an internal-link graph. You output STRICT JSON only — no prose, no code fences.`;

  const user = `Design a topical-authority map for this business.

Business: ${input.businessName || 'A local service business'}
Niche: ${input.niche || input.services || 'services'}
Services offered: ${input.services || '—'}
City / service area: ${input.city || '—'}
Language for ALL labels, titles and keyphrases: ${input.language || 'English'}

Requirements:
- 4–7 pillar pages (the core service/money pages).
- Each pillar: 2–4 sibling cross-links (to OTHER pillars in this same map) and 2–4 cluster article ideas (informational posts that support that pillar).
- Slugs: lowercase kebab-case. Pillar "href" like "/slug/"; cluster "href" like "/blog/slug".
- "match": a lowercase regex alternation of 2–5 keywords a related topic/title would contain (e.g. "wedding|bridal|ceremony").
- Choose ONE pillar to also be the "defaultPillar" (fallback).
- 2–4 "conversionLinks" (prices, contact, booking, etc.) with real-ish paths.
- All sibling hrefs MUST reference pillar hrefs that exist in this map.

Return ONLY a JSON object exactly matching this shape:
${SHAPE}`;

  // Platform-funded, same reason as the landing copy it is generated alongside. Through the
  // gateway when configured, direct otherwise — and either way on the registry's parameters.
  //
  // Those parameters CHANGED here: this call sent temperature 0.6 and max_tokens 2200, and the
  // registry pins 0.7 and 4000. The map has almost twice the room it had, which matters because
  // it decides the studio's whole page structure and internal-link graph — the more consequential
  // of the two calls, and the one that was quietly the tighter-capped.
  const out = await platformComplete('ai.authority_map', [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);

  const parsed = parseModelJson(out.content, 'Authority map generation');
  const map = normalizeAuthorityMap(parsed);
  if (!map) throw new Error('Generation returned an invalid authority map');
  return map;
}
