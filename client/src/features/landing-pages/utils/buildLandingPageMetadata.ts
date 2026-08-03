// Landing Page Metadata Builder — Phase 4

import type { PublicLandingPageMetadataInput } from '../types/landingPagePublic.types';

export interface LandingPageMetadata {
  title: string;
  description: string;
  robots: string;
  canonical: string | null;
  og: {
    title: string;
    description: string;
    type: string;
    url: string | null;
  };
  twitter: {
    card: string;
    title: string;
    description: string;
  };
}

export function buildLandingPageMetadata(input: PublicLandingPageMetadataInput): LandingPageMetadata {
  const title = input.seoTitle || 'Landing Page';
  const description = input.metaDescription || '';
  const noindex = input.noindex || input.isPreview;
  const robots = noindex ? 'noindex, nofollow' : 'index, follow';

  return {
    title,
    description,
    robots,
    canonical: input.canonicalUrl,
    og: {
      title,
      description,
      type: 'website',
      url: input.canonicalUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
