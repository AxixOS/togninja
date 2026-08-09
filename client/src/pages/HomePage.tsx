import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import ZoomableImageV2 from '../components/ui/ZoomableImageV2';
import Typewriter from 'typewriter-effect';
import CountUp from 'react-countup';
import { Check } from 'lucide-react';
import { proxyImage } from '../lib/imageProxy';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useManualPageContent } from '../hooks/useManualPageContent';
import { SEOHead } from '../components/SEO/SEOHead';
import { Helmet } from 'react-helmet-async';
import { getCachedData, setCachedData } from '../lib/persistentCache';
import { useImagePreloader } from '../hooks/useImagePreloader';
import { useGoogleReviews } from '../hooks/useGoogleReviews';
import HomepageConfidenceSection from '../components/home/HomepageConfidenceSection';
import { SITE } from '../config/site';

// Translation mappings for German product names and descriptions
const productNameTranslations: Record<string, string> = {
  'Hochzeitsfotografie Basic': 'Wedding Photography Basic',
  'Hochzeitsfotografie Premium': 'Wedding Photography Premium',
  'Hochzeit Basic': 'Wedding Basic',
  'Hochzeit Premium': 'Wedding Premium',
  'Immobilienfotografie': 'Real Estate Photography',
  'Immobilien Basic': 'Real Estate Basic',
  'Immobilien Premium': 'Real Estate Premium',
  'Produktfotografie': 'Product Photography',
  'Studio-Fotografie Basic': 'Studio Photography Basic',
  'Portraitfotografie Basic': 'Portrait Photography Basic',
  'Portrait Einzelperson': 'Individual Portrait',
  'Bewerbungsfotos & LinkedIn': 'Application Photos & LinkedIn',
  'Team & Mitarbeiterfotos': 'Team & Employee Photos',
  'Eventfotografie': 'Event Photography',
  'Familie Fotoshootings': 'Family Photo Session',
  'Shooting Experience Gutschein': 'Shooting Experience Voucher',
};

const productDescriptionTranslations: Record<string, string> = {
  // Family products
  '60 Min Shooting; 1 retuschiertes Portrait digital + Leinwand 40×30 cm; Auswahlgalerie online; Nutzungsrechte privat': 
    '60 Min Shooting; 1 retouched portrait digital + Canvas 40×30 cm; Online gallery; Private usage rights',
  '60 Min Shooting; 2 retuschiertes Portrait digital + 2x Leinwand 30×40 cm; Auswahlgalerie online; Nutzungsrechte privat': 
    '60 Min Shooting; 2 retouched portraits digital + 2x Canvas 30×40 cm; Online gallery; Private usage rights',
  '60 Min Shooting; 5 retuschierte Fotos digital; Leinwand 40×30 cm; Auswahlgalerie & Nutzungsrechte privat':
    '60 Min Shooting; 5 retouched photos digital; Canvas 40×30 cm; Online gallery & Private usage rights',
  // Wedding
  'Hochzeitsbegleitung (Auszug) inkl. 30 bearbeiteter Fotos': 
    'Wedding coverage (excerpt) incl. 30 edited photos',
  'Standesamt oder kleine Feier inkl. alle Portraits als Datei - Halber Tag, Stunden nach Wunsch\n':
    'Registry office or small celebration incl. all portraits as file - Half day, hours as desired',
  'Ganztägige Hochzeit - inkl. alle Bilder, Online-Galerie, Prints und Leinwand-Collage als Geschenk (Porträts nach Wahl)':
    'Full day wedding - incl. all images, online gallery, prints and canvas collage as gift (portraits of your choice)',
  // Real Estate
  'Immobilienfotos Paket für Wohnungen & Häuser — Innen und Exterieur. Alle Bilder in Vollauflösung dabei, 360°-Bilder, Google Maps-Update\n':
    'Real estate photo package for apartments & houses — Interior and exterior. All images in full resolution, 360° images, Google Maps update',
  'Kleine Wohnungen & Studios inkl. alle Bilder als Datei':
    'Small apartments & studios incl. all images as file',
  'Wohnungen & Häuser  alle Bilder als Datei, Interaktiver Video-Rundgang und professionell gezeichneter Grundriss':
    'Apartments & houses all images as file, interactive video tour and professionally drawn floor plan',
  // Portrait/Business
  'Portraitsession im Studio; 30-45 Minuten; 1 retuschiertes Foto':
    'Portrait session in studio; 30-45 minutes; 1 retouched photo',
  'Bewerbungsfotos Paket inkl. 2 retuschierte Bilder für Bewerbungen & LinkedIn':
    'Application photos package incl. 2 retouched images for applications & LinkedIn',
  'Team- & Mitarbeiterfotos; Paketpreise by headcount; In-Studio or Onsite options z.B:. 50€ pro Kopf mit alle Portäts als Datei dazu.':
    'Team & employee photos; Package prices by headcount; In-studio or onsite options e.g.: €50 per person with all portraits as files',
  'Studio-Miete inkl. Fotosession; perfekte Option für Produkt- oder Portraitaufnahmen':
    'Studio rental incl. photo session; perfect option for product or portrait shots',
  'Produktfotografie Basic — 5 retuschierte Bilder, ideal für Shops & Social':
    'Product Photography Basic — 5 retouched images, ideal for shops & social media',
  'Business-Headshot; 30 Minuten; 1 retuschiertes Foto suitable for LinkedIn':
    'Business headshot; 30 minutes; 1 retouched photo suitable for LinkedIn',
  'Klassisches Porträt - 5x Portäts nach Wahl':
    'Classic portrait - 5x portraits of your choice',
  // Business packages
  'Schnell & effizient inkl. x2 Bilder nach Wahl als Datei ':
    'Quick & efficient incl. 2 images of your choice as file',
  'Für Professionals inkl. alle Bilder als Datei ':
    'For professionals incl. all images as file',
  'Maximale Wirkung für deine Produkte und deine Marke.\n\nInklusive 10 hochauflösender High-Impact-Fotos deiner Wahl – mit kommerziellen Nutzungsrechten für unbegrenzte Drucke und uneingeschränkte Online-Nutzung.':
    'Maximum impact for your products and brand.\n\nIncluding 10 high-resolution high-impact photos of your choice – with commercial usage rights for unlimited prints and unrestricted online use.',
  // Event
  'Eventfotografie Paket — Kurzauftrag inkl. 30 bearbeiteter Fotos':
    'Event photography package — Short assignment incl. 30 edited photos',
  'Ganztägige Event-Coverage - inkl. alle Bilder als Datei, in Vollauflösung geliefert':
    'Full day event coverage - incl. all images as file, delivered in full resolution',
  // Newborn
  'ca. 60 Minuten im Studio; 5 retuschierte Lieblingsfotos digital; Leinwand 40×30 cm; 2–3 Sets (Wraps + Detail-Makros)':
    'approx. 60 minutes in studio; 5 retouched favorite photos digital; Canvas 40×30 cm; 2-3 sets (wraps + detail macros)',
};

const DEFAULT_PRICING_EMBED_URL = 'https://pricingembed.com/embed/embed_ai_1780913691468_2effx16uy';
const PRICING_EMBED_URLS = {
  de: (import.meta as any).env?.VITE_PRICING_EMBED_URL_DE || DEFAULT_PRICING_EMBED_URL,
  en: (import.meta as any).env?.VITE_PRICING_EMBED_URL_EN || DEFAULT_PRICING_EMBED_URL,
} as const;

// Helper function to translate product text
const translateProductText = (text: string, translations: Record<string, string>, language: string): string => {
  if (language === 'de') return text; // Keep German as-is
  return translations[text] || text; // Return translation or original
};

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
  const { addToCart } = useCart();
  
  // Use manual page content hook - allows admin to override any content
  const t = useManualPageContent('home');

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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToPreisrechner = () => {
    const section = document.getElementById('preisrechner');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Per-studio PricingEmbed calculator (set in Settings → Price Calculator). Falls
  // back to the build-time env / default so existing sites keep working.
  const { data: studioConfigData } = useQuery<any>({
    queryKey: ['/api/studio-config'],
    queryFn: async () => (await fetch('/api/studio-config')).json(),
    staleTime: 300_000,
  });
  const pricingEmbedUrl = studioConfigData?.pricingEmbedUrl || PRICING_EMBED_URLS[language];
  const pricingCalculatorCopy = language === 'en'
    ? {
        heading: 'Find your perfect photoshoot package',
        subheading: 'In just 30 seconds, discover which package fits your family best.',
        body: 'No hidden prices. No surprises. Plan your personal photoshoot online with ease. Extra digital portraits are €20 each. Packages available.',
        label: `${SITE.name} Price Calculator`,
        labelSub: 'Your personal package in just a few clicks',
        badge: 'Fast & obligation-free',
        // Neutral and true for any studio. These previously asserted "Over 5 million
        // portraits created", "Family-run since 2012" and "Studio in 1050 Vienna" —
        // one studio's history, published as every instance's own.
        trustOne: 'Professional & experienced',
        trustTwo: 'Personal service',
        trustThree: SITE.address.city ? `Studio in ${SITE.address.city}` : 'Studio & outdoor sessions',
        iframeTitle: `PricingEmbed price calculator for ${SITE.name}`,
      }
    : {
        heading: 'Finden Sie Ihr perfektes Fotoshooting Paket',
        subheading: 'In nur 30 Sekunden erfahren Sie, welches Paket am besten zu Ihrer Familie passt.',
        body: 'Keine versteckten Preise. Keine Überraschungen. Planen Sie Ihr persönliches Fotoshooting ganz einfach online. Zusätzliche digitale Portraits je €20. Pakete verfügbar.',
        label: `${SITE.name} Preisrechner`,
        labelSub: 'Ihr persönliches Paket in wenigen Klicks',
        badge: 'Schnell & unverbindlich',
        trustOne: 'Professionell & erfahren',
        trustTwo: 'Persönlicher Service',
        trustThree: SITE.address.city ? `Studio in ${SITE.address.city}` : 'Studio & Outdoor',
        iframeTitle: `PricingEmbed Preisrechner für ${SITE.name}`,
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

  // Fallback voucher products - NO PLACEHOLDER IMAGES
  const defaultVouchers = [
    {
      id: 'pregnancy-shooting',
      name: t('home.pregnancyShootingTitle'),
      description: t('home.pregnancyShootingDescription'),
      originalPrice: 195,
      price: 95,
      image: '', // Removed placeholder - use actual uploaded images
      category: 'pregnancy',
      route: '/gutschein/maternity'
    },
    {
      id: 'family-shooting',
      name: t('home.familyShootingTitle'),
      description: t('home.familyShootingDescription'),
      originalPrice: 295,
      price: 95,
      image: '', // Removed placeholder - use actual uploaded images
      category: 'family',
      route: '/gutschein/family'
    },
    {
      id: 'newborn-shooting',
      name: t('home.newbornShootingTitle'),
      description: t('home.newbornShootingDescription'),
      originalPrice: 395,
      price: 95,
      image: '', // Removed placeholder - use actual uploaded images
      category: 'newborn',
      route: '/gutschein/newborn'
    }
  ];

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

      // If we have fewer than 3 after filtering, fill from defaults (also excluding newborns)
      let final = mapped.slice(0, 3);
      if (final.length < 3) {
        const defaultsFiltered = defaultVouchers.filter((d) => {
          const s = `${d.category} ${d.id} ${d.name}`.toString().toLowerCase();
          return !(/newborn|neugeboren|neugeborenen|neugeborenes|baby/i.test(s));
        });
        final = [...final, ...defaultsFiltered].slice(0, 3);
      }

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
    return defaultVouchers;
  }, [apiProducts, t]);

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

    if (street || city || postalCode || country) {
      schema.address = {
        '@type': 'PostalAddress',
        ...(street ? { streetAddress: street } : {}),
        ...(city ? { addressLocality: city } : {}),
        ...(postalCode ? { postalCode } : {}),
        ...(country ? { addressCountry: country } : {}),
      };
    }
    if (SITE.phone) schema.telephone = SITE.phone;
    if (city) schema.areaServed = { '@type': 'City', name: city };
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
          <div className="max-w-2xl md:w-3/5 mb-8 md:mb-0">
            <p className="mb-4 leading-tight text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 text-transparent bg-clip-text">
              {t('home.heroTitle')}
            </p>
            <div className="mb-6">
              <span className="block text-xl sm:text-2xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-pink-500 to-purple-600 text-transparent bg-clip-text">
                <Typewriter
                  options={{
                    // Rotates through several COMPLETE value props (the effect
                    // loops the array) — far stronger than one trailing sentence.
                    strings: [
                      t('home.heroRotator1'),
                      t('home.heroRotator2'),
                      t('home.heroRotator3'),
                      t('home.heroRotator4'),
                    ],
                    autoStart: true,
                    loop: true,
                    cursor: '',
                    delay: 45,
                    deleteSpeed: 30
                  }}
                />
              </span>
              <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-gray-900 tracking-tighter animate-fade-in-up">
                {/* Was an inline hardcoded string, so no studio could change its own
                    H1 from Website Studio — and it named Vienna. Now a normal key. */}
                {t('home.heroHeading')}
              </h1>
              <p className="text-lg sm:text-xl text-gray-700 mt-2">
                {t('home.heroDescription')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <button
                type="button"
                onClick={scrollToPreisrechner}
                className="inline-flex items-center justify-center bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium py-3 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                💜 {t('homePage.calculatePackagePrice')}
              </button>
              <Link
                to="/warteliste/"
                className="inline-flex items-center justify-center rounded-full border border-purple-200 px-6 py-3 text-lg font-medium text-purple-700 transition-colors duration-300 hover:border-purple-300 hover:bg-purple-50"
              >
                {t('home.bookShootingButton')}
              </Link>
            </div>
          </div>
          <div className="w-full md:w-2/5">
            {/* No hero image → no box. The fallback here was New Age's collage, which
                is what flashed on every load before the studio's own image resolved. */}
            {heroImageUrl && (
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
            )}
          </div>
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

      <section id="preisrechner" className="bg-white py-16 md:py-24 scroll-mt-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">
              {pricingCalculatorCopy.heading}
            </h2>
            <p className="mt-4 text-lg font-medium bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent md:text-xl">
              {pricingCalculatorCopy.subheading}
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-gray-600 md:text-lg">
              {pricingCalculatorCopy.body}
            </p>
          </div>

          {/* Static anchor prices — visitors see real numbers immediately,
              without waiting on the third-party (lazy-loaded) calculator below.
              Photography buyers bounce when no price is visible. */}
          <div className="mx-auto mt-8 max-w-3xl text-center">
            <p className="text-lg font-semibold text-gray-900">
              {language === 'en' ? 'Packages from €95 — no hidden costs' : 'Pakete ab €95 – keine versteckten Kosten'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {[
                { en: 'Family from €95', de: 'Familie ab €95' },
                { en: 'Newborn from €95', de: 'Newborn ab €95' },
                { en: 'Maternity from €95', de: 'Schwangerschaft ab €95' },
                { en: 'Business Portraits from €95', de: 'Business Portraits ab €95' },
              ].map((chip, i) => (
                <span key={i} className="rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-sm font-medium text-purple-800">
                  {language === 'en' ? chip.en : chip.de}
                </span>
              ))}
            </div>
            <div className="mt-4">
              <Link to="/preise/" className="font-semibold text-purple-600 underline underline-offset-2 hover:text-purple-700">
                {language === 'en' ? 'See all prices →' : 'Alle Preise ansehen →'}
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-5xl rounded-[32px] border border-purple-100 bg-white p-4 shadow-[0_30px_80px_rgba(168,85,247,0.12)] md:p-8">
            <div className="rounded-[24px] bg-gradient-to-br from-white via-pink-50/40 to-purple-50/60 p-3 md:p-5">
              <div className="mx-auto max-w-[850px] overflow-hidden rounded-[20px] border border-white/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-left">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-purple-500">
                      {pricingCalculatorCopy.label}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {pricingCalculatorCopy.labelSub}
                    </p>
                  </div>
                  <div className="hidden rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-3 py-1 text-xs font-semibold text-white sm:block">
                    {pricingCalculatorCopy.badge}
                  </div>
                </div>

                <div className="bg-white p-2 sm:p-4">
                  <div className="qk-widget mx-auto max-w-[720px]">
                    <iframe
                      title={pricingCalculatorCopy.iframeTitle}
                      src={pricingEmbedUrl}
                      width="100%"
                      height="600"
                      frameBorder="0"
                      loading="lazy"
                      className="block w-full rounded-xl border-none"
                      style={{ border: 'none', borderRadius: '12px' }}
                    />
                    <div className="qk-credit px-2 py-3 text-center text-[13px] font-sans opacity-70">
                      <a
                        href="https://pricingembed.com"
                        target="_blank"
                        rel="noopener"
                        className="text-green-500 no-underline"
                      >
                        ⚡ Powered by PricingEmbed
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-center text-sm font-medium text-gray-600 md:text-base">
            <span className="inline-flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              {pricingCalculatorCopy.trustOne}
            </span>
            <span className="inline-flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              {pricingCalculatorCopy.trustTwo}
            </span>
            <span className="inline-flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              {pricingCalculatorCopy.trustThree}
            </span>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {/* First Content Block */}
          <div className="flex flex-col md:flex-row items-center gap-8 mb-16">
            <div className="md:w-1/3">
              <div className="aspect-square overflow-hidden rounded-lg shadow-lg">
                <ZoomableImageV2 
                  src={imageForSection('content-1')}
                  alt="Professionelle Familienporträts im Studio"
                  className="w-full h-full object-cover"
                  priority={true}
                  width={400}
                  height={400}
                />
              </div>
            </div>
            <div className="md:w-2/3">
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

          {/* Second Content Block */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-8">
            <div className="md:w-1/3">
              <div className="aspect-square max-w-sm mx-auto overflow-hidden rounded-lg shadow-lg">
                <ZoomableImageV2
                  src={imageForSection('content-2')}
                  alt="Professionelle Businessfotografie im Studio"
                  className="w-full h-full object-cover object-top"
                  priority={true}
                  width={400}
                  height={400}
                />
              </div>
            </div>
            <div className="md:w-2/3">
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

      {/* Our Services Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('home.servicesTitle')}</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('home.servicesSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Family Portraits */}
            <Link 
              to="/fotoshootings"
              className="bg-white rounded-lg shadow-lg overflow-hidden block cursor-pointer transform transition-transform hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                <SectionImage 
                  src={imageForSection('services-family')}
                  alt="Natürliche Familienfotografie im Studio und Outdoor"
                  className="w-full h-full object-cover transition-all duration-500 hover:scale-110"
                  loading="lazy"
                  width="400"
                  height="300"
                  style={{ backgroundColor: '#f3f4f6' }}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-2">{t('home.familyPortraitsTitle')}</h3>
                <p className="text-gray-600 mb-4">
                  {t('home.familyPortraitsDescription')}
                </p>
                <span className="text-purple-600 font-semibold inline-flex items-center">
                  {t('home.learnMore')} →
                </span>
              </div>
            </Link>

            {/* Pregnancy Photography */}
            <Link 
              to="/fotoshootings"
              className="bg-white rounded-lg shadow-lg overflow-hidden block cursor-pointer transform transition-transform hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                <SectionImage 
                  src={imageForSection('services-pregnancy')}
                  alt={language === 'en' 
                    ? "Professional Pregnancy Photoshoot in Studio"
                    : "Professionelle Schwangerschaftsfotos im Studio"}
                  className="w-full h-full object-cover transition-all duration-500 hover:scale-110"
                  loading="lazy"
                  width="400"
                  height="300"
                  style={{ backgroundColor: '#f3f4f6' }}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-2">{t('home.pregnancyPhotographyTitle')}</h3>
                <p className="text-gray-600 mb-4">
                  {t('home.pregnancyPhotographyDescription')}
                </p>
                <span className="text-purple-600 font-semibold inline-flex items-center">
                  {t('home.learnMore')} →
                </span>
              </div>
            </Link>

            {/* Newborn Photography */}
            <Link 
              to="/fotoshootings"
              className="bg-white rounded-lg shadow-lg overflow-hidden block cursor-pointer transform transition-transform hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                <SectionImage 
                  src={imageForSection('services-newborn')}
                  alt={language === 'en'
                    ? "Professional Baby Photoshoot in Studio"
                    : "Professionelle Babyfotografie im Studio"}
                  className="w-full h-full object-cover transition-all duration-500 hover:scale-110"
                  loading="lazy"
                  width="400"
                  height="300"
                  style={{ backgroundColor: '#f3f4f6' }}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-2">{t('home.newbornPhotographyTitle')}</h3>
                <p className="text-gray-600 mb-4">
                  {t('home.newbornPhotographyDescription')}
                </p>
                <span className="text-purple-600 font-semibold inline-flex items-center">
                  {t('home.learnMore')} →
                </span>
              </div>
            </Link>

            {/* Business Photography */}
            <Link 
              to="/fotoshootings"
              className="bg-white rounded-lg shadow-lg overflow-hidden block cursor-pointer transform transition-transform hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                <SectionImage
                  src={imageForSection('services-business')}
                  alt="Professionelle Businessfotografie im Studio"
                  className="w-full h-full object-cover transition-all duration-500 hover:scale-110"
                  loading="lazy"
                  width="400"
                  height="300"
                  style={{ backgroundColor: '#f3f4f6' }}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-2">{t('home.businessPhotographyTitle')}</h3>
                <p className="text-gray-600 mb-4">
                  {t('home.businessPhotographyDescription')}
                </p>
                <span className="text-purple-600 font-semibold inline-flex items-center">
                  {t('home.learnMore')} →
                </span>
              </div>
            </Link>

            {/* Event Photography */}
            <Link 
              to="/fotoshootings"
              className="bg-white rounded-lg shadow-lg overflow-hidden block cursor-pointer transform transition-transform hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                <SectionImage 
                  src={imageForSection('services-event')}
                  alt="Professionelle Event & Konferenzfotografie"
                  className="w-full h-full object-cover transition-all duration-500 hover:scale-110"
                  loading="lazy"
                  width="400"
                  height="300"
                  style={{ backgroundColor: '#f3f4f6' }}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-2">{t('home.eventPhotographyTitle')}</h3>
                <p className="text-gray-600 mb-4">
                  {t('home.eventPhotographyDescription')}
                </p>
                <span className="text-purple-600 font-semibold inline-flex items-center">
                  {t('home.learnMore')} →
                </span>
              </div>
            </Link>

            {/* Product Photography */}
            <Link 
              to="/fotoshootings"
              className="bg-white rounded-lg shadow-lg overflow-hidden block cursor-pointer transform transition-transform hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                <SectionImage 
                  src={imageForSection('services-product')}
                  alt="E-Commerce & Amazon Produktfotos im Studio"
                  className="w-full h-full object-cover transition-all duration-500 hover:scale-110"
                  loading="lazy"
                  width="400"
                  height="300"
                  style={{ backgroundColor: '#f3f4f6' }}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-2">{t('home.productPhotographyTitle')}</h3>
                <p className="text-gray-600 mb-4">
                  {t('home.productPhotographyDescription')}
                </p>
                <span className="text-purple-600 font-semibold inline-flex items-center">
                  {t('home.learnMore')} →
                </span>
              </div>
            </Link>
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

      {/* Testimonials handled site-wide by <GoogleReviews /> in Layout — inline grid removed to avoid duplicate reviews on the homepage */}

      {/* Gift Voucher Section */}
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
                  {translateProductText(voucher.name, productNameTranslations, language)}
                </h3>

                <div className={idx === 1 ? 'text-3xl font-bold mb-6' : 'text-3xl font-bold text-purple-600 mb-6'}>
                  €{voucher.price}
                </div>

                <ul className={idx === 1 ? 'space-y-3 mb-8 text-white/90' : 'space-y-3 mb-8 text-gray-700'}>
                  <li className="flex items-start">
                    <Check className={idx === 1 ? 'h-5 w-5 text-white mr-2 flex-shrink-0 mt-0.5' : 'h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5'} />
                    <span>{translateProductText(voucher.description || t('home.voucherOnlineGallery'), productDescriptionTranslations, language)}</span>
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
                      title: translateProductText(voucher.name, productNameTranslations, language),
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

      {/* FAQ / Confidence Section */}
      <HomepageConfidenceSection />

    </Layout>
  );
};

export default HomePage;
