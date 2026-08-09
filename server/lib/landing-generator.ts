// Shared landing-page copy generator.
//
// The prompt-building + OpenAI call used to live inline in the admin route
// POST /api/admin/landing-pages/generate. It is extracted here so BOTH the admin
// route AND the onboarding homepage pipeline (which runs on the un-authenticated
// /api/setup surface) can produce the same structured page JSON from one context.

export class NoOpenAIError extends Error {
  constructor(message = 'OPENAI_API_KEY is not configured') {
    super(message);
    this.name = 'NoOpenAIError';
  }
}

export function hasOpenAI(): boolean {
  return !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
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
- Generate believable but compelling testimonials if none are provided
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
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { systemPrompt, userPrompt } = buildLandingPrompts(context);

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_LANDING_MODEL || process.env.OPENAI_PRICE_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const responseText = completion.choices[0]?.message?.content || '{}';
  const content = JSON.parse(responseText);
  return { content, usage: completion.usage, model: completion.model };
}
