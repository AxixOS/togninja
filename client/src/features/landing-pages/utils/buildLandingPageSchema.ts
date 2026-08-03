// Landing Page JSON-LD Schema Builder — Phase 4

import type { PublicLandingPageSchemaInput } from '../types/landingPagePublic.types';

interface JsonLdBlock {
  '@context': string;
  '@type': string;
  [key: string]: unknown;
}

/**
 * Build JSON-LD structured data blocks for a public landing page.
 * Only includes schemas supported by actual content — never fabricates claims.
 */
export function buildLandingPageSchema(input: PublicLandingPageSchemaInput): JsonLdBlock[] {
  const blocks: JsonLdBlock[] = [];

  // WebPage — always included
  blocks.push({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: input.title,
    description: input.description,
    url: input.canonicalUrl,
  });

  // FAQPage — only when FAQ items exist
  if (input.faqItems && input.faqItems.length > 0) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: input.faqItems.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    });
  }

  // Offer — only when offer details are present
  if (input.offerName && input.offerDescription) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'Offer',
      name: input.offerName,
      description: input.offerDescription,
      url: input.canonicalUrl,
    });
  }

  // LocalBusiness reference — only when city is known
  if (input.city) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: input.primaryService
        ? `${input.primaryService} — ${input.city}`
        : `Photography Studio — ${input.city}`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: input.city,
      },
      url: input.canonicalUrl,
    });
  }

  return blocks;
}
