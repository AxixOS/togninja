// PublicLandingPageRenderer — Phase 4 + Phase 5 Event Tracking
// Master component that renders visible sections in order with SEO metadata + JSON-LD

import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { buildLandingPageMetadata } from '../../utils/buildLandingPageMetadata';
import { buildLandingPageSchema } from '../../utils/buildLandingPageSchema';
import { getVisibleLandingPageSections } from '../../utils/landingPageVisibility';
import { normalizeAlign } from '../../utils/sectionAlignment';
import { trackPageView } from '../../utils/trackLandingPageEvent';
import type { LandingPageSectionKey } from '../../types/landingPageEditor.types';
import { SITE } from '@/config/site';
import { PublicLandingPageHero } from './PublicLandingPageHero';
import { PublicLandingPageVideoSection } from './PublicLandingPageVideoSection';
import { PublicLandingPageTrustBar } from './PublicLandingPageTrustBar';
import { PublicLandingPageProblemSection } from './PublicLandingPageProblemSection';
import { PublicLandingPageOfferSection } from './PublicLandingPageOfferSection';
import { PublicLandingPageBenefitsSection } from './PublicLandingPageBenefitsSection';
import { PublicLandingPageWhyChooseUsSection } from './PublicLandingPageWhyChooseUsSection';
import { PublicLandingPageInclusionsSection } from './PublicLandingPageInclusionsSection';
import { PublicLandingPageTestimonialsSection } from './PublicLandingPageTestimonialsSection';
import { PublicLandingPageFaqSection } from './PublicLandingPageFaqSection';
import { PublicLandingPageFinalCta } from './PublicLandingPageFinalCta';
import { PublicLandingPageSeoFooter } from './PublicLandingPageSeoFooter';
import { PublicLandingPagePreviewBanner } from './PublicLandingPagePreviewBanner';

interface PublicLandingPageRendererProps {
  page: {
    id: string;
    slug: string;
    seo_title?: string;
    meta_description?: string;
    canonical_url?: string | null;
    noindex?: boolean;
    cta_action?: string;
    cta_text?: string;
    city?: string | null;
    primary_service?: string | null;
    published_at?: string | null;
    content_json: Record<string, any>;
  };
  isPreview?: boolean;
  previewExpiresAt?: string | null;
}

function getCtaHref(page: any): string {
  const amount = Number(page.cta_voucher_amount) || 0;
  const voucherSlug = page.cta_voucher_slug;
  const ctaAction = page.cta_action || 'enquire';

  // Explicit contact destinations — for landing pages with no voucher (e.g.
  // a school-portraits enquiry). These are external links, so UTM appending
  // below is skipped and the browser opens the mail/WhatsApp app directly.
  if (ctaAction === 'email') {
    const to = String(page.cta_email || SITE.email || '').trim();
    const subject = `Anfrage: ${page.title || 'Landing Page'}`;
    return to ? `mailto:${to}?subject=${encodeURIComponent(subject)}` : '/kontakt';
  }
  if (ctaAction === 'whatsapp') {
    const num = String(page.cta_whatsapp || SITE.phone || '').replace(/[^\d]/g, '');
    const text = `Hallo, ich interessiere mich für: ${page.title || ''}`.trim();
    return num ? `https://wa.me/${num}?text=${encodeURIComponent(text)}` : '/kontakt';
  }

  let base: string;
  // Priority:
  // 1. A DYNAMIC-priced voucher offer → open the personalize → Stripe flow at
  //    exactly this amount/title (the customer pays the offer price, e.g. €225).
  // 2. A bound voucher product → that product's fixed-price personalize flow.
  // 3. The conversion action's default page.
  if (amount > 0) {
    // Prefer the server-signed offer token (tamper-proof price). Fall back to
    // raw amount/title only if the token is somehow absent.
    // Carry an explicit return URL so "Back to offer" works even on a direct
    // load/refresh (history.back() is a no-op when there's no history entry).
    const backTo = page.slug ? `&from=${encodeURIComponent(`/lp/${page.slug}`)}` : '';
    if (page.cta_offer_token) {
      base = `/cart?vf=personalization&offer=${encodeURIComponent(String(page.cta_offer_token))}${backTo}`;
    } else {
      const title = page.cta_voucher_title || page.content_json?.offerSection?.headline || page.title || 'Gutschein';
      base = `/cart?vf=personalization&amount=${encodeURIComponent(String(amount))}&title=${encodeURIComponent(String(title))}${backTo}`;
    }
  } else if (voucherSlug) {
    base = `/voucher/${voucherSlug}`;
  } else {
    switch (ctaAction) {
      // NOTE: '/booking' and '/contact' are NOT routes in this app — the old
      // mapping sent visitors to the SPA shell (homepage flash / blank page).
      case 'book_now': base = '/warteliste'; break;
      case 'buy_voucher': base = '/vouchers'; break;
      case 'waitlist': base = '/warteliste'; break;
      case 'enquire':
      case 'callback':
      default: base = '/kontakt'; break;
    }
  }
  // Propagate campaign/UTM params from the landing URL so attribution survives.
  // Never do this for external mail/WhatsApp links — it would break them.
  if (/^(mailto:|https?:\/\/wa\.me)/i.test(base)) return base;
  try {
    const src = new URLSearchParams(window.location.search);
    const keep: string[] = [];
    ['utm_campaign', 'utm_source', 'utm_medium', 'nac', 'campaign_id'].forEach((k) => {
      const v = src.get(k);
      if (v) keep.push(`${k}=${encodeURIComponent(v)}`);
    });
    if (keep.length) base += (base.includes('?') ? '&' : '?') + keep.join('&');
  } catch {}
  return base;
}

export function PublicLandingPageRenderer({
  page,
  isPreview = false,
  previewExpiresAt = null,
}: PublicLandingPageRendererProps) {
  const content = page.content_json || {};
  const ctaAction = page.cta_action || 'enquire';
  const ctaHref = getCtaHref(page);
  const ctaText = content.hero?.ctaText || page.cta_text || 'Jetzt buchen';

  // content_json exists in TWO vocabularies: AI generation writes raw arrays
  // (benefits: [...], faq: [...]) while an editor save writes normalized
  // objects (benefits: {title, items}, faq: {title, items}, testimonials:
  // {title, testimonials}). Reading only one shape silently hid these
  // sections after any editor save — accept both.
  const listOf = (v: any, key: string): any[] =>
    Array.isArray(v) ? v : Array.isArray(v?.[key]) ? v[key] : [];
  const benefitItems = listOf(content.benefits, 'items');
  const testimonialItems = listOf(content.testimonials, 'testimonials');
  const faqItems = listOf(content.faq, 'items');

  // Build SEO metadata
  const metadata = buildLandingPageMetadata({
    seoTitle: page.seo_title || page.content_json?.seo?.title || '',
    metaDescription: page.meta_description || page.content_json?.seo?.description || page.content_json?.seo?.metaDescription || '',
    canonicalUrl: page.canonical_url || null,
    noindex: page.noindex || false,
    slug: page.slug,
    city: page.city || null,
    primaryService: page.primary_service || null,
    isPreview,
  });

  // Build JSON-LD schema blocks
  const schemaBlocks = buildLandingPageSchema({
    title: metadata.title,
    description: metadata.description,
    canonicalUrl: metadata.canonical || `${window.location.origin}/lp/${page.slug}`,
    city: page.city || null,
    primaryService: page.primary_service || null,
    faqItems: faqItems.length > 0 ? faqItems : undefined,
    offerName: content.offerSection?.headline,
    offerDescription: content.offerSection?.description,
  });

  // Phase 5: Track page view on mount (non-blocking, fire-and-forget)
  useEffect(() => {
    trackPageView(page.id, undefined, isPreview);
  }, [page.id, isPreview]);

  // Get visible sections in configured order
  const visibleSections = getVisibleLandingPageSections(content);

  // Per-section alignment (overrides the default centred layout). Stored in
  // content_json.meta.sectionAlignment by the editor.
  const alignmentMap = (content?.meta?.sectionAlignment ?? {}) as Record<string, 'left' | 'center' | 'right'>;
  const alignFor = (key: string): 'left' | 'center' | 'right' => normalizeAlign(alignmentMap[key]);

  // Hero video placement: 'hero' (background, default) | 'below' (image in the
  // hero, video as its own section) | 'both'.
  const heroVideoUrl = (page as any).hero_video_url || null;
  const videoPlacement = ((page as any).hero_video_placement || 'hero') as 'hero' | 'below' | 'both';
  const videoAsBackground = videoPlacement === 'hero' || videoPlacement === 'both';
  const showVideoSection = !!heroVideoUrl && (videoPlacement === 'below' || videoPlacement === 'both');
  // Where the in-body video section sits: 'top' (just below hero), 'middle', 'end'.
  const videoPosition = ((page as any).hero_video_position || 'top') as 'top' | 'middle' | 'end';

  // Section renderer map — uses raw DB field names from content_json
  const sectionRenderers: Partial<Record<LandingPageSectionKey, () => React.JSX.Element | null>> = {
    hero: () => content.hero ? (
      <PublicLandingPageHero
        key="hero"
        data={content.hero}
        imageUrl={(page as any).hero_image_url || null}
        videoUrl={heroVideoUrl}
        videoAsBackground={videoAsBackground}
        imagePosition={(page as any).hero_image_position || null}
        ctaHref={ctaHref}
        ctaText={ctaText}
        pageId={page.id}
        pageSlug={page.slug}
        isPreview={isPreview}
      />
    ) : null,

    trustBar: () => content.trustBar ? (
      <PublicLandingPageTrustBar key="trustBar" data={content.trustBar} />
    ) : null,

    problemSection: () => content.problemSection ? (
      <PublicLandingPageProblemSection key="problemSection" data={content.problemSection} align={alignFor('problemSection')} />
    ) : null,

    offerSection: () => content.offerSection ? (
      <PublicLandingPageOfferSection
        key="offerSection"
        data={content.offerSection}
        align={alignFor('offerSection')}
        ctaHref={ctaHref}
        ctaText={ctaText}
        pageId={page.id}
        pageSlug={page.slug}
        isPreview={isPreview}
      />
    ) : null,

    benefits: () => benefitItems.length > 0 ? (
      <PublicLandingPageBenefitsSection key="benefits" data={benefitItems} align={alignFor('benefits')} />
    ) : null,

    whyChooseUs: () => content.whyChooseUs ? (
      <PublicLandingPageWhyChooseUsSection key="whyChooseUs" data={content.whyChooseUs} align={alignFor('whyChooseUs')} />
    ) : null,

    inclusions: () => content.inclusions ? (
      <PublicLandingPageInclusionsSection
        key="inclusions"
        data={{ ...content.inclusions, headline: content.inclusions.headline || content.inclusions.title }}
        align={alignFor('inclusions')}
      />
    ) : null,

    testimonials: () => testimonialItems.length > 0 ? (
      <PublicLandingPageTestimonialsSection key="testimonials" data={testimonialItems} align={alignFor('testimonials')} />
    ) : null,

    faq: () => faqItems.length > 0 ? (
      <PublicLandingPageFaqSection key="faq" data={faqItems} align={alignFor('faq')} />
    ) : null,

    finalCta: () => content.finalCta ? (
      <PublicLandingPageFinalCta
        key="finalCta"
        data={content.finalCta}
        align={alignFor('finalCta')}
        ctaHref={ctaHref}
        ctaText={ctaText}
        pageId={page.id}
        pageSlug={page.slug}
        isPreview={isPreview}
      />
    ) : null,
  };

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <meta name="robots" content={metadata.robots} />
        {metadata.canonical && <link rel="canonical" href={metadata.canonical} />}
        <meta property="og:title" content={metadata.og.title} />
        <meta property="og:description" content={metadata.og.description} />
        <meta property="og:type" content={metadata.og.type} />
        {metadata.og.url && <meta property="og:url" content={metadata.og.url} />}
        <meta name="twitter:card" content={metadata.twitter.card} />
        <meta name="twitter:title" content={metadata.twitter.title} />
        <meta name="twitter:description" content={metadata.twitter.description} />
      </Helmet>

      {/* JSON-LD structured data */}
      {schemaBlocks.map((block, i) => (
        <Helmet key={`schema-${i}`}>
          <script type="application/ld+json">{JSON.stringify(block)}</script>
        </Helmet>
      ))}

      {isPreview && <PublicLandingPagePreviewBanner expiresAt={previewExpiresAt} />}

      <div className={`min-h-screen bg-white font-sans ${isPreview ? 'pt-10' : ''}`}>
        {(() => {
          // Render the visible sections, then splice the video section in at the
          // chosen position (top = just below hero, middle, or end).
          const els = visibleSections
            .map((key) => {
              const r = sectionRenderers[key];
              return r ? r() : null;
            })
            .filter(Boolean) as React.JSX.Element[];

          if (showVideoSection) {
            const videoEl = <PublicLandingPageVideoSection key="video-section" videoUrl={heroVideoUrl} />;
            let idx: number;
            if (videoPosition === 'end') idx = els.length;
            else if (videoPosition === 'middle') idx = Math.max(1, Math.ceil(els.length / 2));
            else idx = 1; // 'top' → straight after the hero (first section)
            els.splice(Math.min(idx, els.length), 0, videoEl);
          }
          return els;
        })()}

        <PublicLandingPageSeoFooter city={page.city} />
      </div>
    </>
  );
}
