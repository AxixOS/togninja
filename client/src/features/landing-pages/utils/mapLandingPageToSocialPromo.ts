// Map Landing Page → Social Promo (Facebook, Instagram, WhatsApp)

import type { LandingPageSocialPromo } from '../types/landingPagePromoPack.types';

interface PageData {
  title: string;
  slug: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  ctaText?: string;
  businessName?: string;
  offerSummary?: string;
}

export function mapLandingPageToSocialPromo(
  page: PageData,
  tone: string,
  objective: string,
): LandingPageSocialPromo {
  const headline = page.heroHeadline || page.title;
  const sub = page.heroSubheadline || page.offerSummary || '';
  const cta = page.ctaText || 'Book Now';
  const biz = page.businessName || 'us';

  // Facebook — longer, link-friendly
  const facebookPost = [
    tone === 'urgent' ? `⏰ ${headline}` : `✨ ${headline}`,
    sub ? `\n${sub}` : '',
    `\n${objective}`,
    `\n${cta} 👉 {{page_url}}`,
    biz !== 'us' ? `\n— ${biz}` : '',
  ]
    .filter(Boolean)
    .join('');

  // Instagram — hashtag-friendly, no link in caption
  const instagramCaption = [
    tone === 'playful' ? `Okay, this is exciting 🎉` : `${headline} ✨`,
    sub ? `\n${sub}` : '',
    `\n\n${objective}`,
    `\nLink in bio 👆`,
    '\n\n#photography #photosession #booknow #familyphotography #portraits',
    biz !== 'us' ? ` #${biz.replace(/\s+/g, '')}` : '',
  ]
    .filter(Boolean)
    .join('');

  // WhatsApp — short, personal, direct
  const whatsappPromo = [
    `Hi! 👋`,
    `\n${headline}`,
    sub ? ` — ${sub}` : '',
    `\n\n${cta}: {{page_url}}`,
    `\n\nLet me know if you'd like to book! 📸`,
  ]
    .filter(Boolean)
    .join('');

  return {
    facebookPost,
    instagramCaption,
    whatsappPromo,
  } as any;
}
