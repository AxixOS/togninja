// Map Landing Page → Email Promo (Subject + Body + CTA)

import type { LandingPageEmailPromo } from '../types/landingPagePromoPack.types';

interface PageData {
  title: string;
  slug: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  ctaText?: string;
  businessName?: string;
  offerSummary?: string;
}

export function mapLandingPageToEmailPromo(
  page: PageData,
  tone: string,
  objective: string,
): LandingPageEmailPromo {
  const headline = page.heroHeadline || page.title;
  const sub = page.heroSubheadline || page.offerSummary || '';
  const cta = page.ctaText || 'Book Now';
  const biz = page.businessName || '';

  const subjectOptions: Record<string, string> = {
    friendly: `${headline} — You're Going to Love This!`,
    professional: `${headline} — Now Booking`,
    urgent: `Last Chance: ${headline}`,
    playful: `Guess what? ${headline} 🎉`,
  };

  const subject = subjectOptions[tone] || subjectOptions.friendly;

  const body = [
    biz ? `Hi from ${biz}!` : 'Hi there!',
    '',
    sub ? `${headline} — ${sub}` : headline,
    '',
    objective ? `${objective}.` : '',
    '',
    `👉 ${cta}: {{page_url}}`,
    '',
    "We'd love to see you!",
    biz || 'Your Photographer',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject,
    body,
    ctaText: cta,
    ctaUrl: '{{page_url}}',
  };
}
