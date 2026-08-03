// Map Landing Page → Image Prompt Pack (hero, voucher, social creative)

import type { LandingPageImagePromptPack } from '../types/landingPagePromoPack.types';

interface PageData {
  title: string;
  slug: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  ctaText?: string;
  businessName?: string;
  offerSummary?: string;
}

export function mapLandingPageToImagePromptPack(
  page: PageData,
): LandingPageImagePromptPack {
  const headline = page.heroHeadline || page.title;
  const biz = page.businessName || 'a professional photography studio';

  const heroImagePrompt = [
    `Professional hero banner image for a photography landing page titled "${headline}".`,
    `High-quality, editorial photography style.`,
    `Warm natural light. Clean composition with space for overlay text.`,
    `Brand: ${biz}.`,
  ].join(' ');

  const voucherImagePrompt = [
    `Elegant gift voucher design for ${biz}.`,
    `Theme: "${headline}".`,
    `Luxury muted tones, fine typography, subtle floral or minimal accents.`,
    `Space for voucher amount and recipient name.`,
  ].join(' ');

  const socialCreativePrompt = [
    `Instagram/Facebook promotional graphic for "${headline}" by ${biz}.`,
    `Bold headline text overlay. Eye-catching but on-brand.`,
    `Photography studio aesthetic. 1080x1080 aspect ratio.`,
    page.ctaText ? `CTA: "${page.ctaText}".` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    heroImagePrompt,
    voucherImagePrompt,
    socialCreativePrompt,
  };
}
