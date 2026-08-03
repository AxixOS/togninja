import type { LandingPageSectionKey } from '../types/landingPageEditor.types';
import type { LandingPageSectionRegenerationMode } from '../types/landingPageRegeneration.types';
import type { LandingPageRecord } from '../types/landingPage.types';

interface RegenerationPrompt {
  systemPrompt: string;
  editorContext: string;
  currentSectionData: unknown;
  surroundingContextSummary: string;
  requestedTransformation: string;
  outputContract: string;
}

const MODE_INSTRUCTIONS: Record<LandingPageSectionRegenerationMode, string> = {
  improve: 'Improve the quality, clarity, and conversion power of this section. Keep the same overall direction.',
  rewrite: 'Completely rewrite this section from scratch with fresh wording and approach.',
  shorten: 'Make this section significantly shorter and more concise while keeping key messages.',
  'make-more-direct': 'Make the language more direct, action-oriented, and clear.',
  'make-more-emotional': 'Add more emotional depth and empathy while keeping it authentic.',
  localize: 'Strengthen the local relevance — emphasize location, neighbourhood, or community.',
  'seo-refresh': 'Optimize for search engines. Naturally incorporate the focus keyphrase and related terms.',
  'custom-instruction': '', // Will use provided custom text
};

export function mapSectionRegenerationPrompt(
  page: LandingPageRecord,
  sectionKey: LandingPageSectionKey,
  mode: LandingPageSectionRegenerationMode,
  customInstruction?: string
): RegenerationPrompt {
  const contentJson = (page.content_json ?? {}) as Record<string, unknown>;
  const currentSectionData = contentJson[sectionKey] ?? {};

  const transformation = mode === 'custom-instruction' && customInstruction
    ? customInstruction
    : MODE_INSTRUCTIONS[mode];

  const surroundingContext = [
    page.primary_service && `Service: ${page.primary_service}`,
    page.city && `Location: ${page.city}`,
    page.target_audience && `Audience: ${page.target_audience}`,
    page.tone && `Tone: ${page.tone}`,
    page.offer_summary && `Offer: ${page.offer_summary}`,
  ].filter(Boolean).join(' | ');

  const systemPrompt = `You are an expert landing page copywriter. Regenerate ONLY the "${sectionKey}" section of a landing page.

Rules:
- Return ONLY a valid JSON object matching exactly the structure of that section
- Keep the same tone and brand direction unless instructed otherwise
- Write in the same language as the existing content
- Do not fabricate awards, credentials, or testimonials
- If the content is German, write in German
- Return the JSON object only — no markdown, no code fences`;

  const outputContract = `Return a single JSON object for the "${sectionKey}" section only. Match the existing section structure exactly.`;

  return {
    systemPrompt,
    editorContext: surroundingContext,
    currentSectionData,
    surroundingContextSummary: surroundingContext,
    requestedTransformation: transformation,
    outputContract,
  };
}
