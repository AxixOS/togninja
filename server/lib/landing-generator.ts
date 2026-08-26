import { platformAiConfigured, platformComplete, parseModelJson, NoOpenAIError } from './openaiClient';
// Shared landing-page copy generator.
//
// The prompt-building + OpenAI call used to live inline in the admin route
// POST /api/admin/landing-pages/generate. It is extracted here so BOTH the admin
// route AND the onboarding homepage pipeline (which runs on the un-authenticated
// /api/setup surface) can produce the same structured page JSON from one context.

/**
 * Re-exported, not redefined. It lives in openaiClient.ts next to the code that throws it.
 *
 * Six files import it from here, so the re-export keeps them working — but there must be
 * exactly ONE class, because `instanceof` is how two of those files ask the question and a
 * second class with the same `name` answers only the ones that ask by string.
 */
export { NoOpenAIError } from './openaiClient';

/**
 * Can the platform generate? Delegates rather than deciding.
 *
 * This used to read process.env.OPENAI_API_KEY itself, which made it a second definition of
 * "the platform can pay" sitting a few lines above platformOpenAI(), the function that
 * actually resolves the client. They agreed only by coincidence of reading the same variable.
 *
 * That coincidence was about to end. The AxixOS Blueprint stops writing OPENAI_API_KEY into
 * provisioned tenants, so on every new studio this gate would have returned false and thrown
 * NoOpenAIError at the top of all three generators — before the gateway they are being pointed
 * at was ever called. Wiring up /v1/ai/complete would have changed nothing at all, and the
 * symptom would have been silence rather than an error worth reading.
 */
export function hasOpenAI(): boolean {
  return platformAiConfigured();
}

/**
 * The model that writes a studio's website.
 *
 * This is the highest-stakes model call in the product — its output IS the thing the
 * buyer paid for, it runs a handful of times per customer ever, and the cost difference
 * across an entire onboarding is cents. It was defaulting to gpt-4o-mini, the cheapest
 * option available, chosen when the input was 2,000 characters of tag-stripped nav.
 *
 * OPENAI_LANDING_MODEL overrides it without a deploy, which is how to move to a newer
 * model as one becomes available on the account.
 *
 * Deliberately NOT falling through to OPENAI_PRICE_MODEL any more: that variable is set
 * for a high-volume, low-stakes background task and quietly dragged the site-writing
 * model down with it wherever it happened to be configured.
 */
export function landingModel(): string {
  return (process.env.OPENAI_LANDING_MODEL || 'gpt-4o').trim();
}

/** The generator input. Every field is optional — the prompt fills sensible defaults. */
export interface LandingContext {
  /** The studio's own language ('en' | 'de' | …). Decides the output language. */
  language?: string;
  primaryService?: string;
  targetAudience?: string;
  city?: string;
  tone?: string;
  pageType?: string;
  offerSummary?: string;
  painPoints?: string;
  trustSignals?: string;
  ctaAction?: string;
  ctaText?: string;
  urgency?: string;
  testimonials?: string;
  keywords?: string;
  extras?: string;
}

export function buildLandingPrompts(context: LandingContext): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert landing page copywriter specializing in photography studios and creative businesses. You write high-converting, emotionally compelling landing page copy that balances warmth with persuasion.

Your output must be a valid JSON object with this exact structure:
{
  "hero": {
    "headline": "Main headline (powerful, benefit-driven)",
    "subheadline": "Supporting text (2-3 sentences, emotional hook)",
    "ctaText": "Call-to-action button text"
  },
  "trustBar": {
    "items": ["Trust signal 1", "Trust signal 2", "Trust signal 3", "Trust signal 4"]
  },
  "problemSection": {
    "headline": "Agitation headline",
    "description": "Describe the pain point the audience faces (2-3 sentences)",
    "painPoints": ["Pain point 1", "Pain point 2", "Pain point 3"]
  },
  "offerSection": {
    "headline": "Offer headline",
    "description": "Describe the offer compellingly",
    "price": "Price or pricing hint if provided",
    "urgency": "Urgency text if applicable",
    "inclusions": ["What's included 1", "What's included 2", "What's included 3"]
  },
  "benefits": [
    {"title": "Benefit 1 title", "description": "Benefit 1 detail"},
    {"title": "Benefit 2 title", "description": "Benefit 2 detail"},
    {"title": "Benefit 3 title", "description": "Benefit 3 detail"}
  ],
  "whyChooseUs": {
    "headline": "Why choose us headline",
    "reasons": [
      {"title": "Reason 1", "description": "Detail"},
      {"title": "Reason 2", "description": "Detail"},
      {"title": "Reason 3", "description": "Detail"}
    ]
  },
  "testimonials": [
    {"quote": "Testimonial text", "author": "Name", "role": "Context"}
  ],
  "faq": [
    {"question": "FAQ question 1", "answer": "Answer 1"},
    {"question": "FAQ question 2", "answer": "Answer 2"},
    {"question": "FAQ question 3", "answer": "Answer 3"},
    {"question": "FAQ question 4", "answer": "Answer 4"},
    {"question": "FAQ question 5", "answer": "Answer 5"},
    {"question": "FAQ question 6", "answer": "Answer 6"}
  ],
  "finalCta": {
    "headline": "Final closing headline",
    "description": "Final persuasive text",
    "ctaText": "Final CTA button text"
  },
  "seo": {
    "title": "SEO page title (under 60 chars)",
    "metaDescription": "Meta description (under 160 chars)",
    "slug": "suggested-url-slug"
  }
}

Rules:
- Write copy that sounds natural, warm, and human — not robotic
- Include local relevance when city/area is provided
- Use emotional triggers appropriate for the audience
- Create urgency where deadline or limited availability is mentioned
- Write ALL copy in the target language given below, regardless of the language of
  the source material. (This rule used to say "same language as the user's input"
  with a special case for German, which produced German copy for an English-market
  studio because the crawled source happened to lean that way.)
- NEVER invent testimonials, reviews, ratings, client names, awards, press mentions or
  statistics. This instruction previously read "Generate believable but compelling
  testimonials if none are provided", and the output was rendered into crawlable HTML
  under a five-star badge reading "Echte Google-Bewertungen" — fabricated quotes,
  attributed to invented people, presented to search engines and to the studio's own
  visitors as verified Google reviews. If the source material contains no testimonial,
  return an empty array; the page hides the section.
- Keep headlines concise and impactful
- Return SIX FAQ entries, all about THIS studio's own services. The homepage has six
  FAQ slots; any you leave short keeps a generic default that may describe services
  this studio does not offer.
- Return ONLY the JSON object, no markdown, no code fences`;

  // The studio's own language decides the output, not whatever the crawled source
  // happened to be written in.
  const langNames: Record<string, string> = { en: 'English', de: 'German', fr: 'French', es: 'Spanish' };
  const langCode = String((context as any).language || 'en').slice(0, 2).toLowerCase();
  const targetLanguage = langNames[langCode] || 'English';

  const userPrompt = `Generate a high-converting landing page for a photography studio with these details:

TARGET LANGUAGE: ${targetLanguage} — write every headline, sentence and FAQ in ${targetLanguage}.

Service Type: ${context.primaryService || 'Photography'}
Target Audience: ${context.targetAudience || 'General'}
City/Area: ${context.city || 'Not specified'}
Tone: ${context.tone || 'warm'}
Page Purpose: ${context.pageType || 'leads'}

Offer Details:
${context.offerSummary || 'Professional photography services'}

Pain Points:
${context.painPoints || 'Finding a trustworthy photographer who captures authentic moments'}

Trust Signals:
${context.trustSignals || 'Years of experience, professional equipment, hundreds of happy clients'}

CTA Action: ${context.ctaAction || 'Book Now'}
CTA Text: ${context.ctaText || 'Book Now'}

${context.urgency ? `Urgency/Deadline: ${context.urgency}` : ''}
${context.testimonials ? `Existing Testimonials: ${context.testimonials}` : ''}
${context.keywords ? `Target Keywords: ${context.keywords}` : ''}
${context.extras || ''}`;

  return { systemPrompt, userPrompt };
}

/**
 * Generate landing-page content JSON from a context object.
 * Throws NoOpenAIError when no key is configured (callers decide fallback),
 * or a JSON parse error if the model returns non-JSON.
 * Returns the same shape the admin route has always returned.
 */
export async function generateLandingContent(
  context: LandingContext,
): Promise<{ content: any; usage: any; model: string }> {
  if (!hasOpenAI()) throw new NoOpenAIError();
  const { systemPrompt, userPrompt } = buildLandingPrompts(context);

  // Platform-funded: this is the site a studio sees before they have configured or paid for
  // anything. Never their key. platformComplete() routes it through the AxixOS gateway when
  // one is configured and falls back to a direct OpenAI call when it is not.
  //
  // Model, token ceiling and temperature are no longer sent from here. The gateway pins every
  // parameter that costs money — sending them is a validation error, not an ignored field —
  // and the direct path applies the same pins so the two produce the same page. That makes
  // OPENAI_LANDING_MAX_TOKENS dead; it was the knob for the truncation bug the 8000 pin fixed.
  const out = await platformComplete('ai.landing', [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  // Guarded. This was a bare JSON.parse that survived only because response_format was set on
  // the call; the gateway's published registry does not list response_format among its pins.
  const content = parseModelJson(out.content, 'Homepage generation');
  return { content, usage: out.usage, model: out.model };
}
