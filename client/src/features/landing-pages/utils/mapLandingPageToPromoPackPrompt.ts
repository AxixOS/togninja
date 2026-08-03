// Map Landing Page to Promo Pack Prompt — Master Mapper
// Delegates to channel-specific mappers

import type {
  LandingPagePromoPackRequest,
  LandingPagePromoPackResponse,
} from '../types/landingPagePromoPack.types';
import { mapLandingPageToEmailPromo } from './mapLandingPageToEmailPromo';
import { mapLandingPageToSocialPromo } from './mapLandingPageToSocialPromo';
import { mapLandingPageToGmbPromo } from './mapLandingPageToGmbPromo';
import { mapLandingPageToImagePromptPack } from './mapLandingPageToImagePromptPack';

interface PageData {
  title: string;
  slug: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  ctaText?: string;
  businessName?: string;
  offerSummary?: string;
  sections?: { type: string; content?: Record<string, unknown> }[];
}

/**
 * Builds all promo pack outputs from page data + request options.
 * Each channel mapper is a pure function — no AI calls here.
 * AI enrichment (if enabled) happens at the server service layer.
 */
export function mapLandingPageToPromoPackPrompt(
  page: PageData,
  request: LandingPagePromoPackRequest,
): LandingPagePromoPackResponse {
  const channels = request.channels ?? [
    'facebook',
    'gmb',
    'instagram',
    'whatsapp',
    'email',
    'hero_image',
    'voucher_image',
    'social_creative',
  ];

  const tone = request.tone ?? 'friendly';
  const objective = request.promoObjective ?? 'Drive bookings for this session/offer';

  const social = mapLandingPageToSocialPromo(page, tone, objective) as any;
  const email = mapLandingPageToEmailPromo(page, tone, objective) as any;
  const gmb = mapLandingPageToGmbPromo(page, tone, objective) as any;
  const images = mapLandingPageToImagePromptPack(page);

  return {
    landingPageId: request.landingPageId || '',
    generatedAt: new Date().toISOString(),
    facebookPost: channels.includes('facebook') ? social.facebookPost : null,
    instagramCaption: channels.includes('instagram') ? social.instagramCaption : null,
    whatsappPromo: channels.includes('whatsapp') ? social.whatsappPromo : null,
    gmbPost: channels.includes('gmb') ? (gmb.body || gmb.gmbPost) : null,
    emailSubject: channels.includes('email') ? (email.subject || email.emailSubject) : null,
    emailBody: channels.includes('email') ? (email.body || email.emailBody) : null,
    heroImagePrompt: channels.includes('hero_image') ? images.heroImagePrompt : null,
    voucherImagePrompt: channels.includes('voucher_image') ? images.voucherImagePrompt : null,
    socialCreativePrompt: channels.includes('social_creative') ? images.socialCreativePrompt : null,
  };
}
