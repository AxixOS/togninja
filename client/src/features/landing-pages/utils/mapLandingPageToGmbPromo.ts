// Map Landing Page → Google My Business Post

interface PageData {
  title: string;
  slug: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  ctaText?: string;
  businessName?: string;
  offerSummary?: string;
}

export function mapLandingPageToGmbPromo(
  page: PageData,
  tone: string,
  _objective: string,
): { gmbPost: string; gmbCta: string; gmbUrl: string } {
  const headline = page.heroHeadline || page.title;
  const sub = page.heroSubheadline || page.offerSummary || '';
  const cta = page.ctaText || 'Book Now';

  // GMB posts have a 1500 char limit and support a CTA button
  const gmbPost = [
    headline,
    sub ? `\n${sub}` : '',
    tone === 'urgent' ? "\n\nLimited spots available — don't miss out!" : '',
    `\n\n${cta} at {{page_url}}`,
  ]
    .filter(Boolean)
    .join('');

  return {
    gmbPost,
    gmbCta: cta,
    gmbUrl: '{{page_url}}',
  };
}
