import type {
  LandingPageWizardFormValues,
  LandingPagePromptPayload,
} from '../types/landingPageGeneration.types';

// ── Output contract description ──────────────────────────────────

const OUTPUT_CONTRACT = `Return a JSON object with this exact shape:
{
  "title": "Page title",
  "pageType": "string",
  "slugSuggestion": "url-friendly-slug",
  "summary": "One-sentence summary of the page",
  "content": {
    "hero": {
      "eyebrow": "optional short label above headline",
      "headline": "Main headline (powerful, benefit-driven)",
      "subheadline": "Supporting text (2-3 sentences)",
      "primaryCtaText": "CTA button text",
      "secondaryCtaText": "Optional second CTA",
      "badgeText": "Optional badge/promo label"
    },
    "trustBar": { "items": ["Trust signal 1", "Trust signal 2", ...] },
    "problemSection": { "title": "Section title", "paragraphs": ["Paragraph 1", ...] },
    "offerSection": { "title": "Section title", "intro": "Intro text", "bullets": ["Inclusion 1", ...], "urgency": "Optional urgency line" },
    "benefits": { "title": "Section title", "items": [{"title": "Benefit", "description": "Detail"}, ...] },
    "whyChooseUs": { "title": "Section title", "points": ["Point 1", ...] },
    "inclusions": { "title": "Section title", "items": ["Item 1", ...] },
    "testimonials": { "title": "Section title", "testimonials": [{"quote": "Text", "author": "Name", "source": "Context"}, ...] },
    "faq": { "title": "Section title", "items": [{"question": "Q?", "answer": "A"}, ...] },
    "finalCta": { "title": "Final headline", "body": "Closing copy", "primaryCtaText": "CTA text", "secondaryCtaText": "Optional" },
    "seo": { "seoTitle": "Under 60 chars", "metaDescription": "Under 160 chars", "keyphrase": "Focus keyphrase", "suggestedSlug": "url-slug", "suggestedInternalLinks": [], "imageAltSuggestions": [], "schemaSuggestions": [] },
    "imagePrompts": { "heroImagePrompt": "AI image generation prompt", "voucherImagePrompt": "Voucher image prompt", "socialPromoPrompt": "Social media promo prompt" }
  }
}`;

// ── System prompt ────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert landing page copywriter who specialises in photography studios, creative businesses, and local service providers.

You produce copy that is:
- High-converting and commercially sharp
- Warm, natural, and human — never robotic or generic
- Emotionally engaging without being manipulative
- Locally relevant when location context is provided
- Structured exactly as specified in the output contract

Rules:
- Write in the SAME LANGUAGE as the user input. If inputs are German, ALL output must be German.
- Include urgency only when justified by the input (deadline, limited slots, seasonal offer).
- Do not fabricate awards, reviews, or credentials. If proof is missing, use tasteful placeholders.
- Keep claims believable and grounded.
- Every section should feel purposeful — no filler.
- Generate 3-5 FAQ items relevant to the service and audience.
- Testimonials: use provided snippets when available. If none, generate realistic but clearly marked placeholders.
- Support offers, vouchers, seasonal campaigns, and lead pages equally well.
- CTA copy should be action-oriented and specific. Not generic "Click Here".`;

// ── Build compact context summary ────────────────────────────────

export function buildContextSummary(values: LandingPageWizardFormValues): string {
  const parts: string[] = [];

  if (values.serviceType) parts.push(`Service: ${values.serviceType}`);
  if (values.city) parts.push(`Location: ${values.city}`);
  if (values.targetAudience) parts.push(`Audience: ${values.targetAudience}`);
  if (values.mainOffer) parts.push(`Offer: ${values.mainOffer}`);
  if (values.tone) parts.push(`Tone: ${values.tone}`);
  if (values.pagePurpose) parts.push(`Goal: ${values.pagePurpose}`);
  if (values.urgency) parts.push(`Urgency: ${values.urgency}`);
  if (values.primaryCta) parts.push(`CTA: ${values.primaryCta}`);
  if (values.primaryKeyphrase) parts.push(`Keyphrase: ${values.primaryKeyphrase}`);

  const nonEmptyPainPoints = values.painPoints.filter(p => p.trim());
  if (nonEmptyPainPoints.length) parts.push(`Pain points: ${nonEmptyPainPoints.join(', ')}`);

  const nonEmptyTrust = values.trustPoints.filter(p => p.trim());
  if (nonEmptyTrust.length) parts.push(`Trust: ${nonEmptyTrust.join(', ')}`);

  return parts.join(' | ');
}

// ── Build structured input for user message ──────────────────────

function buildStructuredInput(
  values: LandingPageWizardFormValues,
  businessProfile?: Record<string, unknown>
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    pagePurpose: values.pagePurpose,
    pageType: values.pageType,
    serviceType: values.serviceType || 'Photography',
    city: values.city || undefined,
    title: values.title || undefined,
    tone: values.tone,

    offer: {
      mainOffer: values.mainOffer,
      discountOrBonus: values.discountOrBonus || undefined,
      urgency: values.urgency || undefined,
      voucherValidity: values.voucherValidity || undefined,
      weekendAvailability: values.weekendAvailability,
      numberOfPeopleAllowed: values.numberOfPeopleAllowed || undefined,
      petsAllowed: values.petsAllowed,
      personalisedVoucher: values.personalisedVoucher,
      packageInclusions: values.packageInclusions || undefined,
    },

    audience: {
      targetAudience: values.targetAudience,
      painPoints: values.painPoints.filter(p => p.trim()),
      desiredOutcomes: values.desiredOutcomes.filter(p => p.trim()),
      seasonalAngle: values.seasonalAngle || undefined,
    },

    trust: {
      yearsInBusiness: values.yearsInBusiness || undefined,
      studioLocation: values.studioLocation || undefined,
      trustPoints: values.trustPoints.filter(p => p.trim()),
      reviewSnippets: values.reviewSnippets.filter(p => p.trim()),
      whyChooseYou: values.whyChooseYou || undefined,
      uniqueStyle: values.uniqueStyle || undefined,
    },

    cta: {
      primaryCta: values.primaryCta,
      secondaryCta: values.secondaryCta || undefined,
      conversionGoal: values.conversionGoal || undefined,
      preferredAction: values.preferredAction || undefined,
    },

    seo: {
      primaryKeyphrase: values.primaryKeyphrase || undefined,
      secondaryKeyphrases: values.secondaryKeyphrases || undefined,
      internalLinkUrl: values.internalLinkUrl || undefined,
      faqTopics: values.faqTopics.filter(t => t.trim()),
    },

    assets: {
      heroImageUrl: values.heroImageUrl || undefined,
      aiImagePrompt: values.aiImagePrompt || undefined,
      visualNotes: values.visualNotes || undefined,
      brandColorNotes: values.brandColorNotes || undefined,
      promoBadgeText: values.promoBadgeText || undefined,
    },
  };

  if (businessProfile && Object.keys(businessProfile).length > 0) {
    input.businessProfile = businessProfile;
  }

  return input;
}

// ── Build user message ───────────────────────────────────────────

function buildUserMessage(values: LandingPageWizardFormValues): string {
  const lines: string[] = [];

  lines.push(`Generate a high-converting landing page for the following:`);
  lines.push('');
  lines.push(`## Service & Context`);
  lines.push(`- Service: ${values.serviceType || 'Photography'}`);
  lines.push(`- Page Purpose: ${values.pagePurpose}`);
  lines.push(`- Page Type: ${values.pageType}`);
  if (values.city) lines.push(`- City/Area: ${values.city}`);
  if (values.title) lines.push(`- Suggested Title: ${values.title}`);
  lines.push(`- Tone: ${values.tone}`);

  lines.push('');
  lines.push(`## Offer`);
  lines.push(`- Main Offer: ${values.mainOffer || 'Professional photography services'}`);
  if (values.discountOrBonus) lines.push(`- Discount/Bonus: ${values.discountOrBonus}`);
  if (values.urgency) lines.push(`- Urgency/Deadline: ${values.urgency}`);
  if (values.voucherValidity) lines.push(`- Voucher Validity: ${values.voucherValidity}`);
  if (values.packageInclusions) lines.push(`- Package Inclusions: ${values.packageInclusions}`);
  if (values.weekendAvailability) lines.push(`- Weekend sessions available`);
  if (values.petsAllowed) lines.push(`- Pets welcome`);
  if (values.personalisedVoucher) lines.push(`- Personalised voucher design available`);

  lines.push('');
  lines.push(`## Target Audience`);
  lines.push(`- Audience: ${values.targetAudience || 'General'}`);
  const painPoints = values.painPoints.filter(p => p.trim());
  if (painPoints.length) lines.push(`- Pain Points: ${painPoints.join('; ')}`);
  const outcomes = values.desiredOutcomes.filter(p => p.trim());
  if (outcomes.length) lines.push(`- Desired Outcomes: ${outcomes.join('; ')}`);
  if (values.seasonalAngle) lines.push(`- Seasonal Angle: ${values.seasonalAngle}`);

  lines.push('');
  lines.push(`## Trust & Proof`);
  if (values.yearsInBusiness) lines.push(`- Years in Business: ${values.yearsInBusiness}`);
  if (values.studioLocation) lines.push(`- Studio Location: ${values.studioLocation}`);
  const trust = values.trustPoints.filter(p => p.trim());
  if (trust.length) lines.push(`- Trust Signals: ${trust.join('; ')}`);
  const reviews = values.reviewSnippets.filter(p => p.trim());
  if (reviews.length) lines.push(`- Review Snippets: ${reviews.join(' | ')}`);
  if (values.whyChooseYou) lines.push(`- Why Choose You: ${values.whyChooseYou}`);
  if (values.uniqueStyle) lines.push(`- Unique Style: ${values.uniqueStyle}`);

  lines.push('');
  lines.push(`## Call to Action`);
  lines.push(`- Primary CTA: ${values.primaryCta || 'Book Now'}`);
  if (values.secondaryCta) lines.push(`- Secondary CTA: ${values.secondaryCta}`);
  if (values.conversionGoal) lines.push(`- Conversion Goal: ${values.conversionGoal}`);
  if (values.preferredAction) lines.push(`- Preferred Action: ${values.preferredAction}`);

  if (values.primaryKeyphrase || values.faqTopics.length) {
    lines.push('');
    lines.push(`## SEO`);
    if (values.primaryKeyphrase) lines.push(`- Primary Keyphrase: ${values.primaryKeyphrase}`);
    if (values.secondaryKeyphrases) lines.push(`- Secondary Keyphrases: ${values.secondaryKeyphrases}`);
    const topics = values.faqTopics.filter(t => t.trim());
    if (topics.length) lines.push(`- FAQ Topics: ${topics.join(', ')}`);
  }

  if (values.promoBadgeText || values.aiImagePrompt) {
    lines.push('');
    lines.push(`## Visual Notes`);
    if (values.promoBadgeText) lines.push(`- Promo Badge: ${values.promoBadgeText}`);
    if (values.aiImagePrompt) lines.push(`- Image Direction: ${values.aiImagePrompt}`);
    if (values.visualNotes) lines.push(`- Visual Notes: ${values.visualNotes}`);
    if (values.brandColorNotes) lines.push(`- Brand Colors: ${values.brandColorNotes}`);
  }

  return lines.join('\n');
}

// ── Main export ──────────────────────────────────────────────────

export function mapLandingPageFormToPrompt(
  values: LandingPageWizardFormValues,
  businessProfile?: Record<string, unknown>,
  _templateMetadata?: Record<string, unknown>
): LandingPagePromptPayload {
  return {
    systemPrompt: SYSTEM_PROMPT,
    developerInstructions: OUTPUT_CONTRACT,
    userContextSummary: buildContextSummary(values),
    structuredInput: buildStructuredInput(values, businessProfile),
    outputContractDescription: OUTPUT_CONTRACT,
  };
}

/** Build the messages array that the server sends to the AI model */
export function buildPromptMessages(
  values: LandingPageWizardFormValues,
  businessProfile?: Record<string, unknown>
): { system: string; user: string } {
  const userMessage = buildUserMessage(values);
  const businessContext = businessProfile
    ? `\n\nBusiness Context: ${JSON.stringify(businessProfile)}`
    : '';

  return {
    system: `${SYSTEM_PROMPT}\n\n${OUTPUT_CONTRACT}`,
    user: `${userMessage}${businessContext}`,
  };
}
