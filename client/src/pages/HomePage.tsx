import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import ZoomableImageV2 from '../components/ui/ZoomableImageV2';
import CountUp from 'react-countup';
import { Check } from 'lucide-react';
import { proxyImage } from '../lib/imageProxy';
import { useLanguage } from '../context/LanguageContext';
import { useStudioCurrency } from '../hooks/useStudioCurrency';
import { useAuthorityMap } from '../hooks/useAuthorityMap';
import { useCart } from '../context/CartContext';
import { useManualPageContent } from '../hooks/useManualPageContent';
import { SEOHead } from '../components/SEO/SEOHead';
import { Helmet } from 'react-helmet-async';
import { getCachedData, setCachedData } from '../lib/persistentCache';
import { useImagePreloader } from '../hooks/useImagePreloader';
import { useGoogleReviews } from '../hooks/useGoogleReviews';
import HomepageConfidenceSection from '../components/home/HomepageConfidenceSection';
import { SITE } from '../config/site';




/**
 * An <img> that renders nothing when it has no src. Section images resolve to '' when
 * the studio has not uploaded a photo for that slot — they used to fall back to a
 * bundled collage of another studio's clients — and <img src=""> paints a
 * broken-image icon, which looks worse than the leak it replaced.
 */
const SectionImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = ({ src, ...rest }) => {
  if (!src || !String(src).trim()) return null;
  return <img src={src} {...rest} />;
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  // Prices in the STUDIO'S currency, not a hardcoded euro sign.
  const { format: formatPrice } = useStudioCurrency();

  // Use manual page content hook - allows admin to override any content.
  // Must stay ABOVE serviceCards: that useMemo lists `t` in its dependency array,
  // which is evaluated eagerly as an argument at the call. Declared any later, `t`
  // is still in its temporal dead zone and EVERY render throws a ReferenceError —
  // whatever the studio's Authority Map holds.
  const t = useManualPageContent('home');

  // The service cards below. Built from the studio's own Authority Map — the same source
  // the nav uses — so the homepage advertises what this studio actually offers. Pillars
  // without a live page are excluded: a card is a link, and a link must go somewhere.
  const { map: authorityMap } = useAuthorityMap();
  const serviceCards = React.useMemo(() => {
    const pillars = (authorityMap?.pillars || []).filter((p: any) => p?.href && p?.label && (p as any).hasPage !== false);
    if (pillars.length) {
      return pillars.map((p: any) => ({
        path: p.href,
        label: p.label,
        description: p.keyphrase ? `Professional ${String(p.keyphrase).toLowerCase()}.` : '',
        imageSection: 'services-' + String(p.href || '').replace(/^\/+|\/+$/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      }));
    }
    // No map yet — no cards. The three that stood here were Family Portraits, Pregnancy
    // Photography and Newborn Photography, all linking to /fotoshootings, and they are
    // what a wedding or fashion photographer saw under the heading "Our Photography
    // Services" on their own homepage. Same rule as every other block since v1.9.0: the
    // studio's own data or nothing.
    return [];
  }, [authorityMap]);
  const { addToCart } = useCart();

  // Fetch homepage images from API with persistent cache
  const { data: homepageImages, isLoading: isLoadingImages } = useQuery({
    queryKey: ['/api/homepage/images'],
    queryFn: async () => {
      const endpoints = ['/api/homepage/images', `${SITE.url}/api/homepage/images`];
      let data: any[] | null = null;

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint);
          if (!res.ok) continue;
          data = await res.json();
          break;
        } catch {
          // Try the next source.
        }
      }

      if (!data) throw new Error('Failed to fetch homepage images');
      // Cache the response for 24 hours
      setCachedData('homepage-images', data);
      return data;
    },
    // Use cached data as initial data to prevent flashing.
    // NOTE: key must match the setCachedData('homepage-images', ...) write above —
    // a previous mismatch meant the cache was never reused, so every load waited
    // on the network before image URLs were known.
    initialData: () => getCachedData('homepage-images', 1000 * 60 * 60 * 24), // 24 hour cache
    // Keep data fresh but allow brief caching to prevent flash
    staleTime: 1000 * 60 * 5, // 5 minutes - images don't change that often
    cacheTime: 1000 * 60 * 10, // 10 minutes
    refetchOnMount: false, // Don't refetch if we have cached data
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Utility: resolve image URL by section with local fallback
  // Homepage photos were served as full-resolution originals (multi-MB), which
  // is why the grid took seconds to appear. Serve a right-sized WebP instead.
  // Returns '' when the studio has not uploaded an image for this slot. It used to
  // fall back to a BUNDLED COLLAGE of New Age Fotografie's own client photographs
  // (client/src/assets/photo-grid.jpg), so every studio's homepage, FAQ cards and
  // section images showed another studio's clients — and the hero flashed that
  // collage on every load before the real image arrived. Callers must handle ''.
  const imageForSection = (section: string, fallback?: string, width = 800) => {
    const hit = (homepageImages as any[])?.find((img: any) => img.section === section);
    const url = (hit && (hit.url as string)) || fallback || '';
    return url ? proxyImage(url, { w: width }) : '';
  };

  const heroImageUrl = useMemo(() => {
    return imageForSection('hero', undefined);
  }, [homepageImages]);

  // Declared here, beside heroImageUrl and AFTER imageForSection — a const read above its
  // own declaration is a temporal dead zone, which esbuild does not flag and the build
  // does not catch. See HANDOVER §9.
  const content1Image = useMemo(() => imageForSection('content-1'), [homepageImages]);
  const content2Image = useMemo(() => imageForSection('content-2'), [homepageImages]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };



  // Fetch voucher products from API with persistent cache
  const { data: apiProducts } = useQuery({
    queryKey: ['/api/vouchers/products', 'home-v3'],
    queryFn: async () => {
      console.log('🏠 [HomePage] Fetching fresh voucher data...');
      const res = await fetch('/api/vouchers/products?_t=' + Date.now());
      if (!res.ok) throw new Error('Failed to fetch vouchers');
      const data = await res.json();
      console.log('🏠 [HomePage] Loaded', data.length, 'vouchers');
      return data;
    },
    // Short staleTime instead of always-refetch: a repeat visitor within the
    // window reuses the cached data (faster LCP, less jitter) while newly
    // uploaded images still appear within a minute.
    staleTime: 1000 * 60, // 1 minute
    cacheTime: 1000 * 60 * 5, // Keep in memory for 5 minutes
    refetchOnMount: true, // Refetch only when stale
    refetchOnWindowFocus: false, // Don't refetch on window focus for homepage
  });

  // There is no such thing as a fallback voucher product.
  //
  // Three packages used to be declared here — Pregnancy/Family/Newborn Shooting, €95 each,
  // struck through from €195/€295/€395 — and they rendered on the homepage of any studio
  // whose own catalogue was empty, which is every studio that has just onboarded. They were
  // not illustrations: each carried a working Add to Cart into the checkout, so a buyer's
  // visitor could purchase a package the buyer does not sell, at a price they never set,
  // in a currency that may not be theirs. The struck-through "original" prices are a
  // discount claim made on the buyer's behalf.
  //
  // A studio with no products sells nothing until it has some. The section hides itself
  // (see voucherProducts.length below) rather than inventing a catalogue.

  // Transform API products or use fallback
  const voucherProducts = useMemo(() => {
    if (apiProducts && Array.isArray(apiProducts) && apiProducts.length > 0) {
      // Map API products, then exclude newborn/baby products from homepage
      const mapped = apiProducts
        .filter((p: any) => p.isActive !== false && p.is_active !== false)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: parseFloat(p.price) || 0,
          originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : parseFloat(p.price) * 1.3,
          image: p.thumbnailUrl || p.imageUrl || '', // NO PLACEHOLDER - use empty string
          category: p.category || 'family',
          route: `/gutschein/${p.slug || p.id}`
        }))
        .filter((p: any) => {
          const s = `${p.category} ${p.id} ${p.name}`.toString().toLowerCase();
          // exclude newborn/baby related items (English + German terms)
          return !(/newborn|neugeboren|neugeborenen|neugeborenes|baby/i.test(s));
        });

      // Show what the studio actually has, however many that is. Topping up to three from
      // a default list meant a studio with one real package had two invented ones beside
      // it, indistinguishable to a visitor.
      let final = mapped.slice(0, 3);

      // Ensure the family package is featured in the middle (index 1) when present
      if (final.length >= 2) {
        const familyIdx = final.findIndex((p: any) => {
          const s = `${p.category} ${p.id} ${p.name}`.toString().toLowerCase();
          return /family|familien|familie/.test(s);
        });
        if (familyIdx > -1 && familyIdx !== 1) {
          const [fam] = final.splice(familyIdx, 1);
          final.splice(1, 0, fam);
        }
      }

      return final;
    }
    return [];
  }, [apiProducts]);

  // Preload all images to prevent flashing
  const imageUrlsToPreload = useMemo(() => {
    const urls: string[] = [];

    // IMPORTANT: preload the SAME resized URLs the page renders. This used to
    // push the full-resolution originals, so every homepage + voucher photo was
    // downloaded at full size on load — the reason the photo grid took seconds
    // to appear. Preloading a different URL than the one rendered is pure waste.
    if (homepageImages && Array.isArray(homepageImages)) {
      homepageImages.forEach((img: any) => {
        if (img?.url) urls.push(proxyImage(img.url, { w: 800 }));
      });
    }

    // Voucher thumbnails are small on screen — request them small too.
    if (voucherProducts && Array.isArray(voucherProducts)) {
      voucherProducts.forEach((product: any) => {
        if (product?.thumbnailUrl) urls.push(proxyImage(product.thumbnailUrl, { w: 500 }));
        else if (product?.image) urls.push(proxyImage(product.image, { w: 500 }));
      });
    }

    return urls;
  }, [homepageImages, voucherProducts]);
  
  useImagePreloader(imageUrlsToPreload);

  // Google reviews are rendered site-wide by <GoogleReviews /> in Layout, so the
  // homepage no longer keeps its own inline testimonials list. We still read the
  // live rating/count here so the LocalBusiness aggregateRating in structured
  // data stays in sync with the number shown in the reviews widget (instead of a
  // hardcoded value that silently drifts from Google).
  const { data: liveGoogle } = useGoogleReviews();
  // Ratings come from the studio's OWN live Google profile or not at all. The old
  // fallback published 4.8★/306 reviews — another studio's numbers — as this
  // studio's rating, in schema Google reads as a factual claim.
  const ratingValue = liveGoogle?.rating != null ? liveGoogle.rating.toFixed(1) : null;
  const reviewCount = liveGoogle?.count != null ? String(liveGoogle.count) : null;

  // Milestone figures the studio supplies for itself (Website Studio → homepage keys).
  // A key that is unset, non-numeric or zero contributes nothing, so a new studio shows
  // no counters at all rather than inheriting someone else's.
  const milestones = [
    { valueKey: 'home.statFamiliesValue', labelKey: 'home.happyFamilies' },
    { valueKey: 'home.statPortraitsValue', labelKey: 'home.portraitsCaptured' },
    { valueKey: 'home.statYearsValue', labelKey: 'home.yearsExperience' },
  ]
    .map(({ valueKey, labelKey }) => {
      const raw = t(valueKey);
      const value = raw && raw !== valueKey ? Number(String(raw).replace(/[^\d]/g, '')) : NaN;
      return Number.isFinite(value) && value > 0 ? { value, labelKey } : null;
    })
    .filter((m): m is { value: number; labelKey: string } => m !== null);

  // Homepage SEO built from the studio's own identity + its editable homepage copy.
  // Was hardcoded "Familienfotograf Wien | …" with a Vienna keyword list and a claim
  // of 27,000 families photographed — served verbatim by every instance.
  const seoCity = SITE.address.city;
  const seoTitle = seoCity ? `${SITE.name} | Photography in ${seoCity}` : SITE.name;
  const homeDescription = t('home.description');
  const seoDescription =
    homeDescription && homeDescription !== 'home.description'
      ? homeDescription.slice(0, 160)
      : `${SITE.name} — professional photography${seoCity ? ` in ${seoCity}` : ''}.`;
  // Keywords are only meaningful once we know the studio's city; a generic list is
  // noise, and the Vienna one was actively wrong.
  const seoKeywords = seoCity
    ? `photographer ${seoCity}, photo studio ${seoCity}, portrait photography ${seoCity}`
    : undefined;

  const faqImages =
    (homepageImages &&
      (homepageImages as any[])
        .filter((img: any) => img.section === 'faq')
        .map((i: any) => ({
          title: i.title || '',
          image: i.url,
          alt: i.alt || i.title || 'Image',
        }))) || [
      { title: t('home.faqQuestion1'), image: '', alt: '' },
      { title: t('home.faqQuestion2'), image: '', alt: '' },
      { title: t('home.faqQuestion3'), image: '', alt: '' },
      { title: t('home.faqQuestion4'), image: '', alt: '' },
      { title: t('home.faqQuestion5'), image: '', alt: '' },
      { title: t('home.faqQuestion6'), image: '', alt: '' },
    ];

  // LocalBusiness schema built ONLY from this studio's own identity. Anything the
  // studio hasn't configured is OMITTED rather than guessed: a hardcoded locality,
  // street and coordinates told Google every instance was a business in Vienna's
  // 1050, which is worse than saying nothing at all. Geo coordinates are dropped
  // entirely — we have no per-studio source for them, and inventing them is exactly
  // the bug being fixed here.
  const localBusinessSchema = (() => {
    const { street, city, postalCode, country } = SITE.address;
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': `${SITE.url}/#business`,
      name: SITE.name,
      url: SITE.url,
    };
    if (heroImageUrl) schema.image = heroImageUrl;

    const description = t('home.description');
    if (description && description !== 'home.description') schema.description = description;

    // Premises only when there is a street — see server/lib/siteIdentity.ts. A city on
    // its own is where the studio works, not an address it can be visited at.
    if (street) {
      schema.address = {
        '@type': 'PostalAddress',
        streetAddress: street,
        ...(city ? { addressLocality: city } : {}),
        ...(postalCode ? { postalCode } : {}),
        ...(country ? { addressCountry: country } : {}),
      };
    }
    if (SITE.phone) schema.telephone = SITE.phone;
    // Array, not a bare object: a studio covering several places is the norm, and this
    // was declaring a UK-wide company as serving one city.
    if (city) schema.areaServed = [{ '@type': 'City', name: city }];
    if (SITE.social?.length) schema.sameAs = SITE.social;

    // Service names come from the studio's own translated copy, same
    // filter-the-misses pattern as the FAQ schema below.
    const services = [
      'home.familyPortraitsTitle',
      'home.pregnancyTitle',
      'home.newbornTitle',
      'home.businessHeadshotsTitle',
    ]
      .map((key) => {
        const name = t(key);
        return name && name !== key ? { '@type': 'Offer', itemOffered: { '@type': 'Service', name } } : null;
      })
      .filter(Boolean);
    if (services.length) {
      schema.hasOfferCatalog = { '@type': 'OfferCatalog', name: SITE.name, itemListElement: services };
    }

    if (ratingValue && reviewCount) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue,
        reviewCount,
        bestRating: '5',
        worstRating: '1',
      };
    }
    return schema;
  })();

  return (
    <Layout>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonical="/"
        ogImage={heroImageUrl || undefined}
        hreflang={[
          { lang: 'de', url: '/' },
          { lang: 'en', url: '/en/' }
        ]}
      />

      {/* JSON-LD Structured Data for LocalBusiness */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(localBusinessSchema)}
        </script>

        {/* FAQPage schema – mirrors visible FAQ content in HomepageConfidenceSection */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              'faq.worry1', 'faq.worry2', 'faq.worry3', 'faq.worry4', 'faq.worry5', 'faq.worry6',
              'faq.clarity1', 'faq.clarity2', 'faq.clarity3'
            ]
              .map((base) => {
                const q = t(`${base}.q`);
                const a = t(`${base}.full`);
                if (!q || q === `${base}.q` || !a || a === `${base}.full`) return null;
                return {
                  '@type': 'Question',
                  name: q,
                  acceptedAnswer: { '@type': 'Answer', text: a }
                };
              })
              .filter(Boolean)
          })}
        </script>

        {/* BreadcrumbList schema – root homepage */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.url}/` }
            ]
          })}
        </script>
      </Helmet>

      {/* Hero Section */}
      <section className="bg-white">
        <div className="container mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center justify-between">
          <div className={heroImageUrl ? 'max-w-2xl md:w-3/5 mb-8 md:mb-0' : 'max-w-3xl w-full'}>
            {/* The hero used to stack THREE headings: this line at 24px/700 in a
                gradient, a typewriter span at 36px/700 in the same gradient, and the
                real h1 at the same 36px/700. Two of the three were not headings, all
                three were bold, and the largest thing on the page was tied for size
                with a <span>. Now: one small tracked label, one display h1, one quiet
                deck — four distinct roles from four distinct elements. */}
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              {t('home.heroTitle')}
            </p>
            <div className="mb-8">
              <h1 className="text-gray-900">
                {/* Was an inline hardcoded string, so no studio could change its own
                    H1 from Website Studio — and it named Vienna. Now a normal key.
                    Size, weight and tracking come from the theme's type scale; the
                    utilities that used to set them here made every preset identical. */}
                {t('home.heroHeading')}
              </h1>
              {/* The rotator was deleted, not restyled. It looped forever with the
                  cursor switched off, so the line was a partial word most of the time
                  and never settled on a complete sentence — a screenshot of the page
                  caught "Authe". It also rendered empty on first paint, so the h1
                  jumped on every load. A heading that is permanently mid-animation is
                  the opposite of premium. The four rotator strings remain in the DB
                  and in Website Studio; nothing was thrown away. */}
              <p className="mt-5 text-lg sm:text-xl text-gray-600">
                {t('home.heroDescription')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Was "Calculate package & price", scrolling to the price calculator. That
                  section is gone, so the button pointed at nothing; it now goes to the
                  studio's own prices page, which is what a visitor wanted from it. */}
              <Link
                to="/preise/"
                className="inline-flex items-center justify-center bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium py-3 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                {t('homePage.calculatePackagePrice')}
              </Link>
              <Link
                to="/warteliste/"
                className="inline-flex items-center justify-center rounded-full border border-purple-200 px-6 py-3 text-lg font-medium text-purple-700 transition-colors duration-300 hover:border-purple-300 hover:bg-purple-50"
              >
                {t('home.bookShootingButton')}
              </Link>
            </div>
          </div>
          {/* The column itself is gated now, not just its contents. It used to hold
              w-full md:w-2/5 whether or not there was an image, so a studio without one
              got a text block pinned to the left third of the viewport beside 40% of
              nothing. No image → the copy column takes the full width.
              No hero image → no box either: the fallback here was New Age's collage,
              which is what flashed on every load before the studio's own image resolved. */}
          {heroImageUrl && (
            <div className="w-full md:w-2/5">
              <div className="aspect-square max-w-md mx-auto overflow-hidden rounded-lg shadow-lg">
                <ZoomableImageV2
                  src={heroImageUrl}
                  alt={SITE.name}
                  className="w-full h-full object-cover"
                  priority={true}
                  width={600}
                  height={600}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Description Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
              {t('home.description')}
            </p>
          </div>
        </div>
      </section>

      {/* Counter Section — the studio's OWN milestones. The figures were hardcoded
          (27,156 families / 5,431,977 portraits / 27 years), so every instance
          animated one studio's numbers as its own. They now come from editable
          keys with EMPTY defaults: a studio sets them in Website Studio, and until
          it does the band renders nothing rather than something invented. */}
      {milestones.length > 0 && (
        <section className="bg-gradient-to-r from-pink-500 to-purple-600 py-16">
          <div className="container mx-auto px-4">
            <div className={`grid grid-cols-1 gap-8 text-center ${milestones.length >= 3 ? 'md:grid-cols-3' : milestones.length === 2 ? 'md:grid-cols-2' : ''}`}>
              {milestones.map((m) => (
                <div className="text-white" key={m.labelKey}>
                  <div className="text-3xl md:text-4xl font-bold mb-2">
                    <CountUp end={m.value} duration={2.5} separator="," />
                  </div>
                  <div className="text-base md:text-lg text-white/90">{t(m.labelKey)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}


      {/* Content Sections */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {/* First Content Block.
              The image column is gated the way the hero already is at :474. ZoomableImageV2
              returns null on an empty src, but the aspect-square wrapper around it did not,
              so a studio that had not uploaded this slot got an empty shadowed square. The
              column div goes with it — otherwise the copy keeps two thirds of the row and
              leaves a third blank beside it. */}
          <div className="flex flex-col md:flex-row items-center gap-8 mb-16">
            {content1Image && (
              <div className="md:w-1/3">
                <div className="aspect-square overflow-hidden rounded-lg shadow-lg">
                  <ZoomableImageV2
                    src={content1Image}
                    alt=""
                    className="w-full h-full object-cover"
                    priority={true}
                    width={400}
                    height={400}
                  />
                </div>
              </div>
            )}
            <div className={content1Image ? 'md:w-2/3' : 'w-full'}>
              <h2 className="text-2xl md:text-3xl font-bold text-purple-600 mb-4">
                {t('home.pregnancyAndFamilyTitle')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('home.pregnancyDescription1')}
              </p>
              <p className="text-gray-700 mb-4">
                {t('home.pregnancyDescription2')}
              </p>
              <p className="text-gray-700">
                {t('home.pregnancyDescription3')}
              </p>
            </div>
          </div>

          {/* Second Content Block — same gating as the first. */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-8">
            {content2Image && (
              <div className="md:w-1/3">
                <div className="aspect-square max-w-sm mx-auto overflow-hidden rounded-lg shadow-lg">
                  <ZoomableImageV2
                    src={content2Image}
                    alt=""
                    className="w-full h-full object-cover object-top"
                    priority={true}
                    width={400}
                    height={400}
                  />
                </div>
              </div>
            )}
            <div className={content2Image ? 'md:w-2/3' : 'w-full'}>
              <h2 className="text-2xl md:text-3xl font-bold text-purple-600 mb-4">
                {t('home.businessHeadshotsTitle')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('home.businessDescription1')}
              </p>
              <p className="text-gray-700 mb-4">
                {t('home.businessDescription2')}
              </p>
              <p className="text-gray-700">
                {t('home.businessDescription3')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Services Section — hidden until the studio has services of its own. A heading
          reading "Our Photography Services" over an empty grid is worse than no section,
          and a grid of another studio's services is worse still. */}
      {serviceCards.length > 0 && (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('home.servicesTitle')}</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('home.servicesSubtitle')}
            </p>
          </div>

          {/* The studio's OWN services.
              This was eight hardcoded cards — Family Portraits, Pregnancy, Newborn,
              Wedding, Event, Product — that onboarding never touched, so a Brighton
              boudoir studio advertised newborn and wedding sessions on its homepage as
              though it offered them. The services already exist in exactly one place: the
              Authority Map built from the studio's own site. Same source as the nav, so
              the menu and the homepage can never disagree.
              A studio with no map yet keeps the built-in cards rather than an empty grid. */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {serviceCards.map((card) => (
              <Link
                key={card.path}
                to={card.path}
                className="bg-white rounded-lg shadow-lg overflow-hidden block cursor-pointer transform transition-transform hover:-translate-y-1 hover:shadow-xl"
              >
                {/* Gated: SectionImage returns null on an empty src but this 4:3 wrapper
                    did not, so a service with no photograph yet showed an empty grey box
                    above its own title. The card still reads as a card without it. */}
                {imageForSection(card.imageSection) && (
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <SectionImage
                      src={imageForSection(card.imageSection)}
                      alt={card.label}
                      className="w-full h-full object-cover transition-all duration-500 hover:scale-110"
                      loading="lazy"
                      width="400"
                      height="300"
                      style={{ backgroundColor: '#f3f4f6' }}
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-purple-900 mb-2">{card.label}</h3>
                  {card.description && <p className="text-gray-600 mb-4">{card.description}</p>}
                  <span className="text-purple-600 font-semibold inline-flex items-center">
                    {t('home.learnMore')} →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* View All Services CTA */}
          <div className="text-center mt-12">
            <Link
              to="/fotoshootings/"
              className="inline-flex items-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg shadow-lg"
            >
              {t('home.viewAllServices')}
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* Testimonials handled site-wide by <GoogleReviews /> in Layout — inline grid removed to avoid duplicate reviews on the homepage */}

      {/* Gift Voucher Section — only when the studio has products of its own. This block
          used to fall back to three invented packages with live Add to Cart buttons. */}
      {voucherProducts.length > 0 && (
      <section className="py-16 bg-purple-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-purple-900">
            {t('home.giftVouchersTitle')}
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            {t('home.giftVouchersSubtitle')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
            {voucherProducts.map((voucher, idx) => (
              <div
                key={voucher.id}
                className={idx === 1 ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-xl shadow-2xl p-8 transform sm:scale-105' : 'bg-white rounded-xl shadow-lg p-8'}
              >
                {idx === 1 && (
                  <div className="bg-yellow-400 text-gray-900 text-sm font-bold px-3 py-1 rounded-full inline-block mb-4 ml-auto">
                    BESTSELLER
                  </div>
                )}

                <h3 className={idx === 1 ? 'text-2xl font-bold mb-4' : 'text-2xl font-bold mb-4 text-purple-900'}>
                  {voucher.name}
                </h3>

                <div className={idx === 1 ? 'text-3xl font-bold mb-6' : 'text-3xl font-bold text-purple-600 mb-6'}>
                  {formatPrice(voucher.price)}
                </div>

                <ul className={idx === 1 ? 'space-y-3 mb-8 text-white/90' : 'space-y-3 mb-8 text-gray-700'}>
                  <li className="flex items-start">
                    <Check className={idx === 1 ? 'h-5 w-5 text-white mr-2 flex-shrink-0 mt-0.5' : 'h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5'} />
                    <span>{voucher.description || t('home.voucherOnlineGallery')}</span>
                  </li>
                  <li className="flex items-start">
                    <Check className={idx === 1 ? 'h-5 w-5 text-white mr-2 flex-shrink-0 mt-0.5' : 'h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5'} />
                    <span>{t('home.voucherPrivateUsage')}</span>
                  </li>
                  <li className="flex items-start">
                    <Check className={idx === 1 ? 'h-5 w-5 text-white mr-2 flex-shrink-0 mt-0.5' : 'h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5'} />
                    <span>{t('home.voucherFlexibleDelivery')}</span>
                  </li>
                </ul>

                <button
                  onClick={() => {
                    addToCart({
                      title: voucher.name,
                      productId: voucher.id,
                      productSlug: voucher.route || voucher.id,
                      price: Number(voucher.price) || 0,
                      quantity: 1,
                      packageType: language === 'en' ? 'Photo Shoot Voucher' : 'Fotoshooting Gutschein',
                      type: 'voucher'
                    });
                    navigate('/cart');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={idx === 1 ? 'block w-full bg-white text-purple-700 font-semibold py-3 px-6 rounded-lg' : 'block w-full bg-gray-900 text-white font-semibold py-3 px-6 rounded-lg'}
                >
                  {t('home.bookNowButton')}
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => {
                navigate('/vouchers');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-block bg-white text-purple-600 border-2 border-purple-600 hover:bg-purple-600 hover:text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              {t('home.viewAllVouchers')} →
            </button>
          </div>

          <div className="text-center mt-12">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
              <h3 className="text-xl font-bold text-purple-900 mb-4">
                {t('home.whyOurVouchers')}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl mb-2">🎨</div>
                  <h4 className="font-semibold text-purple-700">{t('home.voucherCustomizable')}</h4>
                  <p className="text-sm text-gray-600">{t('home.voucherCustomizableDesc')}</p>
                </div>
                <div>
                  <div className="text-3xl mb-2">📦</div>
                  <h4 className="font-semibold text-purple-700">{t('home.voucherFlexibleDeliveryTitle')}</h4>
                  <p className="text-sm text-gray-600">{t('home.voucherFlexibleDeliveryDesc')}</p>
                </div>
                <div>
                  <div className="text-3xl mb-2">⏰</div>
                  <h4 className="font-semibold text-purple-700">{t('home.voucherInstantAvailable')}</h4>
                  <p className="text-sm text-gray-600">{t('home.voucherInstantAvailableDesc')}</p>
                </div>
                <div>
                  <div className="text-3xl mb-2">💝</div>
                  <h4 className="font-semibold text-purple-700">{t('home.voucherPerfectGift')}</h4>
                  <p className="text-sm text-gray-600">{t('home.voucherPerfectGiftDesc')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* FAQ / Confidence Section */}
      <HomepageConfidenceSection />

    </Layout>
  );
};

export default HomePage;
