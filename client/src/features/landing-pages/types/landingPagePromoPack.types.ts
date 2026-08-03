// Landing Page Promo Pack Types — Phase 5

export interface LandingPagePromoPackRequest {
  landingPageId?: string;
  channels?: LandingPagePromoChannel[];
  tone?: string;
  promoObjective?: string;
}

export type LandingPagePromoChannel =
  | 'facebook'
  | 'gmb'
  | 'instagram'
  | 'whatsapp'
  | 'email'
  | 'hero_image'
  | 'voucher_image'
  | 'social_creative';

export interface LandingPagePromoPackResponse {
  landingPageId: string;
  generatedAt: string;
  facebookPost: string | null;
  gmbPost: string | null;
  instagramCaption: string | null;
  whatsappPromo: string | null;
  emailSubject: string | null;
  emailBody: string | null;
  heroImagePrompt: string | null;
  voucherImagePrompt: string | null;
  socialCreativePrompt: string | null;
}

export interface LandingPageSocialPromo {
  platform: string;
  body: string;
  hashtags?: string[];
  cta?: string;
}

export interface LandingPageEmailPromo {
  subject: string;
  preheader?: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
}

export interface LandingPageGmbPromo {
  title: string;
  body: string;
  ctaType: 'BOOK' | 'LEARN_MORE' | 'ORDER' | 'SIGN_UP' | 'CALL';
  ctaUrl: string;
}

export interface LandingPageImagePromptPack {
  heroImagePrompt: string;
  voucherImagePrompt: string;
  socialCreativePrompt: string;
}
