import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import CategoryFilter from '../components/vouchers/CategoryFilter';
import { useAppContext } from '../context/AppContext';
import { Search, Gift } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import HeroDealsAuto from '@/components/HeroDealsAuto';
import { useCart } from '../context/CartContext';
import { SEOHead } from '../components/SEO/SEOHead';
import { Helmet } from 'react-helmet-async';
import { SITE } from '../config/site';
import { getCachedData, setCachedData } from '../lib/persistentCache';
import { useImagePreloader } from '../hooks/useImagePreloader';

const VouchersPage: React.FC = () => {
  const { selectedCategory } = useAppContext();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState('');

  // Memoize the title to prevent flashing
  const vouchersTitle = useMemo(() => {
    const title = t('vouchers.title');
    // Fallback to prevent flashing if translation isn't ready
    return title && title !== 'vouchers.title' ? title : 
           (language === 'en' ? 'Photoshoot Vouchers Vienna' : 'Fotoshooting Gutscheine Wien');
  }, [t, language]);

  // Fetch voucher products from API with shorter cache (images update frequently)
  const { data: apiProducts, isLoading } = useQuery({
    queryKey: ['/api/vouchers/products', 'v3-no-flash', language],
    queryFn: async () => {
      console.log('🔄 Fetching fresh voucher data from API...');
      const res = await fetch('/api/vouchers/products?_t=' + Date.now() + '&language=' + language); // Cache busting + language
      if (!res.ok) throw new Error('Failed to fetch vouchers');
      const data = await res.json();
      console.log('✅ Voucher products fetched:', data.length, 'products');
      // Don't cache to localStorage - always fetch fresh
      return data;
    },
    // NO initialData - prevents flash of old/placeholder images
    staleTime: 0, // Always fetch fresh data for latest images
    cacheTime: 1000 * 60 * 2, // Keep in memory for 2 minutes only
    refetchOnMount: 'always', // Always refetch to get latest uploaded images
    refetchOnWindowFocus: true, // Refetch on window focus
  });

  // NO fallback vouchers - always load from API to prevent placeholder flash

  // Translation is now handled server-side via the language parameter in the API request

  // Transform API products to match expected format
  const voucherProducts = useMemo(() => {
    // ALWAYS wait for API data - NEVER show defaultVouchers fallback
    if (!apiProducts || !Array.isArray(apiProducts) || apiProducts.length === 0) {
      console.log('⏳ Waiting for API data...');
      return null; // null = loading state, not empty array
    }
    
    console.log('📦 API Products received:', apiProducts.length, apiProducts);
    return apiProducts
      .filter((p: any) => p.isActive !== false && p.is_active !== false)
      .map((p: any) => {
        const imageUrl = p.imageUrl || p.image_url || p.thumbnailUrl || p.thumbnail_url;
        console.log(`📷 Product: ${p.name}, imageUrl:`, imageUrl);
        const rawDescription = p.description || '';
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: rawDescription,
          price: parseFloat(p.price) || 0,
          originalPrice: p.originalPrice || p.original_price ? parseFloat(p.originalPrice || p.original_price) : parseFloat(p.price) * 1.3,
          image: imageUrl || '', // Use actual uploaded image or empty string
          category: p.category || 'family',
          route: `/vouchers/${p.id}`,
          validityMonths: Math.floor((p.validityPeriod || p.validity_period || 365) / 30),
          isActive: p.isActive !== false && p.is_active !== false,
          badge: p.badge || null,
          featured: p.featured || false
        };
      });
  }, [apiProducts, language]);

  // Preload all voucher images to prevent flashing
  const imageUrlsToPreload = useMemo(() => {
    const urls: string[] = [];
    
    if (voucherProducts && Array.isArray(voucherProducts)) {
      voucherProducts.forEach((product: any) => {
        if (product?.image) urls.push(product.image);
        if (product?.thumbnailUrl) urls.push(product.thumbnailUrl);
        if (product?.image_url) urls.push(product.image_url);
      });
    }
    
    return urls;
  }, [voucherProducts]);
  
  useImagePreloader(imageUrlsToPreload);

  // Prepare hero items mapping once - ONLY if data is loaded
  const heroItems = useMemo(() => {
    if (!voucherProducts) return [];
    return voucherProducts.map(v => ({
      id: v.id,
      name: v.name,
      slug: v.slug,
      description: v.description,
      image: v.image,
      price: v.price,
      originalPrice: v.originalPrice,
      route: v.route,
      url: v.route,
    }));
  }, [voucherProducts]);

  // Show loading skeleton while data is fetching.
  // IMPORTANT: this state is what the build-time prerenderer captures (the
  // voucher API isn't available during the build), so it must carry the FULL
  // page SEO (title/description/canonical) and a real H1 — previously it had
  // only a bare 28-char title, no canonical and an <h2>, which the SEO audit
  // flagged as thin/missing-H1/missing-canonical on /vouchers.
  if (isLoading || !voucherProducts) {
    return (
      <Layout>
        <SEOHead
          title={language === 'de' ? `Fotoshooting Gutscheine in Wien | ${SITE.name}` : 'Photoshoot Vouchers in Vienna | New Age Photography'}
          description={language === 'de' ? 'Fotoshooting Gutscheine als perfektes Geschenk. Wählen Sie aus Familie, Baby oder Business Paketen. Sofort per E-Mail!' : 'Photoshoot vouchers as the perfect gift. Choose from family, baby or business packages. Instantly via email!'}
          keywords={language === 'de' ? 'Fotoshooting Gutschein Wien, Geschenkgutschein Fotograf, Gutschein Fotoshooting' : 'Photoshoot Voucher Vienna, Gift voucher photographer, Voucher photoshoot'}
          canonical="/vouchers/"
        />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {vouchersTitle}
              </h1>
              <p className="text-lg text-gray-600 mb-4">
                {language === 'de'
                  ? 'Fotoshooting-Gutscheine als perfektes Geschenk: Familie, Baby, Schwangerschaft oder Business — sofort per E-Mail, bis zu 2 Jahre gültig.'
                  : 'Photoshoot vouchers as the perfect gift: family, baby, maternity or business — delivered instantly by email, valid for up to 2 years.'}
              </p>
              <p className="text-lg text-gray-600 animate-pulse">Loading vouchers...</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
                  <div className="h-64 bg-gray-200"></div>
                  <div className="p-6 space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Filter vouchers based on search term and category
  const filteredByCategory = selectedCategory && selectedCategory !== 'Alle' as any
    ? voucherProducts.filter(voucher => {
        const voucherCategory = (voucher.category || '').toLowerCase();
        const selectedCat = (selectedCategory || '').toLowerCase();
        
        // Direct match
        if (voucherCategory === selectedCat) return true;
        
        // Category mapping for compatibility
        const categoryMap: Record<string, string[]> = {
          'familie': ['family', 'familie'],
          'baby': ['newborn', 'baby'],
          'schwangerschaft': ['pregnancy', 'maternity', 'schwangerschaft'],
          'business': ['business'],
          'event': ['event'],
          'hochzeit': ['wedding', 'hochzeit']
        };
        
        const matchTerms = categoryMap[selectedCat] || [selectedCat];
        return matchTerms.some(term => voucherCategory.includes(term));
      })
    : voucherProducts;
  
  const displayedVouchers = searchTerm 
    ? filteredByCategory.filter(voucher => 
        voucher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voucher.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : filteredByCategory;

  const { addItem } = useCart();

  const handlePurchaseVoucher = (voucher: any) => {
    // Add voucher to cart
    addItem({
      title: voucher.name,
      price: voucher.price,
      quantity: 1,
      packageType: voucher.category || 'Voucher',
      type: 'voucher',
      productId: voucher.id,
      productSlug: voucher.slug,
      description: voucher.description,
      imageUrl: voucher.image
    });
    // Navigate to cart page
    navigate('/cart');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout>
      <SEOHead
        title={language === 'de' ? `Fotoshooting Gutscheine in Wien | ${SITE.name}` : 'Photoshoot Vouchers in Vienna | New Age Photography'}
        description={language === 'de' ? 'Fotoshooting Gutscheine als perfektes Geschenk. Wählen Sie aus Familie, Baby oder Business Paketen. Sofort per E-Mail!' : 'Photoshoot vouchers as the perfect gift. Choose from family, baby or business packages. Instantly via email!'}
        keywords={language === 'de' ? 'Fotoshooting Gutschein Wien, Geschenkgutschein Fotograf, Gutschein Fotoshooting' : 'Photoshoot Voucher Vienna, Gift voucher photographer, Voucher photoshoot'}
        canonical="/vouchers/"
        ogImage="https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1200&h=630&fit=crop"
        hreflang={[
          { lang: 'de', url: '/vouchers/' },
          { lang: 'en', url: '/en/vouchers/' }
        ]}
      />

      {/* JSON-LD Structured Data for Products */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement: voucherProducts
              .filter((v) => v.price > 0)
              .map((voucher, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: {
                  '@type': 'Product',
                  name: voucher.name,
                  description: (voucher.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300),
                  image: voucher.image?.startsWith('http')
                    ? voucher.image
                    : voucher.image ? `${SITE.url}${voucher.image}` : undefined,
                  sku: String(voucher.slug || voucher.id),
                  brand: { '@type': 'Brand', name: SITE.name },
                  offers: {
                    '@type': 'Offer',
                    price: voucher.price,
                    priceCurrency: 'EUR',
                    availability: 'https://schema.org/InStock',
                    url: `${SITE.url}${voucher.route}`,
                    seller: { '@type': 'Organization', name: SITE.name },
                  },
                },
              })),
          })}
        </script>

        {/* FAQPage schema – mirrors visible FAQs added below */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: (language === 'de' ? [
              { q: 'Wie funktionieren Fotoshooting Gutscheine in Wien?', a: 'Unsere Gutscheine können online gekauft und für ein professionelles Fotoshooting in unserem Studio in Wien oder an Outdoor-Locations eingelöst werden.' },
              { q: 'Kann ich ein Familienfotoshooting verschenken?', a: 'Ja, Familienfotografie-Gutscheine gehören zu den beliebtesten Geschenken und lassen sich für jeden Anlass individualisieren.' },
              { q: 'Verfallen die Gutscheine?', a: 'Die Gültigkeit hängt vom gewählten Paket ab. Alle Details werden beim Checkout angezeigt.' }
            ] : [
              { q: 'How do photography vouchers work in Vienna?', a: 'Our vouchers can be purchased online and redeemed for a professional photoshoot at our Vienna studio or outdoor locations.' },
              { q: 'Can I gift a family photoshoot?', a: 'Yes, family photography vouchers are one of the most popular gifts and can be customised for any occasion.' },
              { q: 'Do vouchers expire?', a: 'Voucher validity depends on the package selected. Full details are provided at checkout.' }
            ]).map(({ q, a }) => ({
              '@type': 'Question',
              name: q,
              acceptedAnswer: { '@type': 'Answer', text: a }
            }))
          })}
        </script>
      </Helmet>

      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {vouchersTitle}
          </h1>
          <p className="text-xl md:text-2xl mb-2">
            {language === 'de' ? 'Fotoshooting Gutscheine für jeden Anlass' : 'Photoshoot Vouchers for Every Occasion'}
          </p>
          <p className="text-lg opacity-90">
            {language === 'de' ? 'Wählen Sie aus unseren Kategorien: Familie, Baby, Schwangerschaft, Business & Event' : 'Choose from our categories: Family, Baby, Maternity, Business & Event'}
          </p>
        </div>
      </div>

      {/* Additive SEO intro block – immediately below H1 hero, no layout change */}
      <section className="bg-white border-b border-gray-100" aria-labelledby="vouchers-intro-heading">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h2 id="vouchers-intro-heading" className="text-2xl md:text-3xl font-bold text-purple-900 mb-3">
            {language === 'de' ? 'Fotoshooting Gutscheine in Wien für jeden Anlass' : 'Photoshoot Vouchers in Vienna for Every Occasion'}
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {language === 'de' ? (
              <>
                Auf der Suche nach der perfekten Geschenkidee in Wien? Unsere professionellen Fotoshooting Gutscheine reichen von{' '}
                <Link to="/familienfotos-wien/" className="text-purple-700 underline hover:text-purple-900">Familienfotografie</Link>{' '}und{' '}
                <Link to="/neugeborenenfotos-wien/" className="text-purple-700 underline hover:text-purple-900">Neugeborenen-Sessions</Link>{' '}bis hin zu{' '}
                <Link to="/business-portrait-wien/" className="text-purple-700 underline hover:text-purple-900">Business Headshots</Link>{' '}und besonderen Events. Jeder Gutschein steht für bleibende Erinnerungen mit hochwertiger Studio- oder Outdoor-Fotografie.
              </>
            ) : (
              <>
                Looking for the perfect gift idea in Vienna? Our professional photoshoot vouchers cover everything from{' '}
                <Link to="/familienfotos-wien/" className="text-purple-700 underline hover:text-purple-900">family photography</Link>{' '}and{' '}
                <Link to="/neugeborenenfotos-wien/" className="text-purple-700 underline hover:text-purple-900">newborn sessions</Link>{' '}to{' '}
                <Link to="/business-portrait-wien/" className="text-purple-700 underline hover:text-purple-900">business headshots</Link>{' '}and special events. Each voucher is designed to create lasting memories with high-quality studio or outdoor photography.
              </>
            )}
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Category Filter - Prominent at top */}
        <div className="mb-8 text-center">
          <CategoryFilter />
        </div>
        
        {/* Search Bar - Centered */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder={t('vouchers.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-colors text-lg"
            />
            <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        
        {/* Main content with vouchers */}
        <div>
          {displayedVouchers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayedVouchers.map(voucher => (
                  <div key={voucher.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow relative">
                    {/* Badge */}
                    {voucher.badge && (() => {
                      const badgeConfig: Record<string, { label: string; bg: string; text: string; icon: string }> = {
                        'BESTSELLER': { label: language === 'de' ? 'Bestseller' : 'Best Seller', bg: 'bg-amber-500', text: 'text-white', icon: '⭐' },
                        'TOP_SELLER': { label: language === 'de' ? 'Top Seller' : 'Top Seller', bg: 'bg-red-500', text: 'text-white', icon: '🔥' },
                        'NEW': { label: language === 'de' ? 'Neu' : 'New', bg: 'bg-emerald-500', text: 'text-white', icon: '✨' },
                        'POPULAR': { label: language === 'de' ? 'Beliebt' : 'Popular', bg: 'bg-pink-500', text: 'text-white', icon: '❤️' },
                        'LIMITED': { label: language === 'de' ? 'Limitiert' : 'Limited', bg: 'bg-purple-600', text: 'text-white', icon: '⏳' },
                        'SALE': { label: language === 'de' ? 'Angebot' : 'Sale', bg: 'bg-orange-500', text: 'text-white', icon: '💰' },
                        'RECOMMENDED': { label: language === 'de' ? 'Empfohlen' : 'Recommended', bg: 'bg-blue-500', text: 'text-white', icon: '👍' },
                        'GIFT_IDEA': { label: language === 'de' ? 'Geschenkidee' : 'Gift Idea', bg: 'bg-fuchsia-500', text: 'text-white', icon: '🎁' },
                        'SEASONAL': { label: language === 'de' ? 'Saisonal' : 'Seasonal', bg: 'bg-teal-500', text: 'text-white', icon: '🌸' },
                      };
                      const cfg = badgeConfig[voucher.badge] || { label: voucher.badge, bg: 'bg-gray-700', text: 'text-white', icon: '' };
                      return (
                        <div className={`absolute top-3 left-3 z-10 ${cfg.bg} ${cfg.text} px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg flex items-center gap-1`}>
                          <span>{cfg.icon}</span>
                          <span>{cfg.label}</span>
                        </div>
                      );
                    })()}
                    {/* Image */}
                    <div className="relative">
                      <div className="aspect-[4/3] overflow-hidden">
                        <img 
                          src={voucher.image}
                          alt={voucher.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-purple-900 mb-2">{voucher.name}</h3>
                      <p className="text-gray-600 mb-4">{voucher.description}</p>
                      
                      {/* Validity */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-500">
                          {t('vouchers.validUntil')} {t('vouchers.validityPeriod')}
                        </span>
                      </div>
                      
                      {/* Price and Button */}
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500 uppercase tracking-wide">{language === 'de' ? 'AB' : 'FROM'}</span>
                          <span className="text-2xl font-bold text-purple-600">€{voucher.price}</span>
                        </div>
                        <button 
                          onClick={() => handlePurchaseVoucher(voucher)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full transition-colors"
                        >
                          {t('home.bookNowButton')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-800">
                  {searchTerm || selectedCategory !== null ? t('vouchers.noVouchersFound') : t('vouchers.noVouchersAvailable')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedCategory !== null 
                    ? t('vouchers.noVouchersFoundMessage')
                    : t('vouchers.noVouchersAvailableMessage')
                  }
                </p>
                {(searchTerm || selectedCategory !== null) && (
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                    }}
                    className="text-purple-600 hover:text-purple-800 font-medium transition-colors"
                  >
                    {t('vouchers.resetFilters')}
                  </button>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Additive: Category context section */}
      <section className="bg-purple-50/40 border-t border-gray-100" aria-labelledby="vouchers-context-heading">
        <div className="container mx-auto px-4 py-10 max-w-4xl">
          <h2 id="vouchers-context-heading" className="text-2xl md:text-3xl font-bold text-purple-900 mb-3">
            {language === 'de' ? 'Das passende Foto-Erlebnis wählen' : 'Choose the Right Photography Experience'}
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {language === 'de' ? (
              <>
                Ob Sie ein{' '}
                <Link to="/familienfotos-wien/" className="text-purple-700 underline hover:text-purple-900">Familienfotoshooting</Link>{' '}verschenken, ein Neugeborenes feiern oder Ihr professionelles Auftreten mit{' '}
                <Link to="/business-portrait-wien/" className="text-purple-700 underline hover:text-purple-900">Business Portraits</Link>{' '}aufwerten möchten – unsere Wiener Fotografie-Gutscheine bieten Flexibilität und Premium-Qualität.
              </>
            ) : (
              <>
                Whether you're gifting a{' '}
                <Link to="/familienfotos-wien/" className="text-purple-700 underline hover:text-purple-900">family photoshoot</Link>, celebrating a newborn, or upgrading your professional image with{' '}
                <Link to="/business-portrait-wien/" className="text-purple-700 underline hover:text-purple-900">business portraits</Link>, our Vienna photography vouchers offer flexibility and premium quality.
              </>
            )}
          </p>
        </div>
      </section>

      {/* Additive: Explore our photography services link block */}
      <section className="bg-white border-t border-gray-100" aria-labelledby="vouchers-explore-heading">
        <div className="container mx-auto px-4 py-10 max-w-4xl">
          <h3 id="vouchers-explore-heading" className="text-xl md:text-2xl font-bold text-purple-900 mb-4 text-center">
            {language === 'de' ? 'Unsere Fotografie-Leistungen entdecken' : 'Explore Our Photography Services'}
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-center">
            <li>
              <Link to="/familienfotos-wien/" className="block py-2 px-4 rounded-lg text-purple-700 hover:bg-purple-50 hover:text-purple-900 font-medium transition-colors">
                {language === 'de' ? 'Familienfotos Wien' : 'Family Photography Vienna'}
              </Link>
            </li>
            <li>
              <Link to="/neugeborenenfotos-wien/" className="block py-2 px-4 rounded-lg text-purple-700 hover:bg-purple-50 hover:text-purple-900 font-medium transition-colors">
                {language === 'de' ? 'Neugeborenenfotos Wien' : 'Newborn Photography Vienna'}
              </Link>
            </li>
            <li>
              <Link to="/schwangerschaftsfotos-wien/" className="block py-2 px-4 rounded-lg text-purple-700 hover:bg-purple-50 hover:text-purple-900 font-medium transition-colors">
                {language === 'de' ? 'Schwangerschaftsfotos Wien' : 'Maternity Photography Vienna'}
              </Link>
            </li>
            <li>
              <Link to="/business-portrait-wien/" className="block py-2 px-4 rounded-lg text-purple-700 hover:bg-purple-50 hover:text-purple-900 font-medium transition-colors">
                {language === 'de' ? 'Business Portraits Wien' : 'Business Headshots Vienna'}
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* Additive: FAQ section */}
      <section className="bg-gray-50 border-t border-gray-100" aria-labelledby="vouchers-faq-heading">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <h2 id="vouchers-faq-heading" className="text-2xl md:text-3xl font-bold text-purple-900 mb-6 text-center">
            {language === 'de' ? 'Häufige Fragen zu Fotoshooting Gutscheinen' : 'Frequently Asked Questions About Photoshoot Vouchers'}
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                {language === 'de' ? 'Wie funktionieren Fotoshooting Gutscheine in Wien?' : 'How do photography vouchers work in Vienna?'}
              </h3>
              <p className="text-gray-700">
                {language === 'de' ? 'Unsere Gutscheine können online gekauft und für ein professionelles Fotoshooting in unserem Studio in Wien oder an Outdoor-Locations eingelöst werden.' : 'Our vouchers can be purchased online and redeemed for a professional photoshoot at our Vienna studio or outdoor locations.'}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                {language === 'de' ? 'Kann ich ein Familienfotoshooting verschenken?' : 'Can I gift a family photoshoot?'}
              </h3>
              <p className="text-gray-700">
                {language === 'de' ? 'Ja, Familienfotografie-Gutscheine gehören zu den beliebtesten Geschenken und lassen sich für jeden Anlass individualisieren.' : 'Yes, family photography vouchers are one of the most popular gifts and can be customised for any occasion.'}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                {language === 'de' ? 'Verfallen die Gutscheine?' : 'Do vouchers expire?'}
              </h3>
              <p className="text-gray-700">
                {language === 'de' ? 'Die Gültigkeit hängt vom gewählten Paket ab. Alle Details werden beim Checkout angezeigt.' : 'Voucher validity depends on the package selected. Full details are provided at checkout.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Additive: pre-footer CTA */}
      <section className="bg-white border-t border-gray-100">
        <div className="container mx-auto px-4 py-8 max-w-3xl text-center">
          <p className="text-gray-700">
            {language === 'de' ? (
              <>
                Nicht sicher, welcher Gutschein passt? Sehen Sie unsere{' '}
                <Link to="/preise" className="text-purple-700 underline hover:text-purple-900 font-medium">Preise</Link>{' '}oder{' '}
                <Link to="/kontakt" className="text-purple-700 underline hover:text-purple-900 font-medium">kontaktieren Sie uns</Link>{' '}für eine persönliche Beratung.
              </>
            ) : (
              <>
                Not sure which voucher to choose? Explore our{' '}
                <Link to="/preise" className="text-purple-700 underline hover:text-purple-900 font-medium">pricing options</Link>{' '}or{' '}
                <Link to="/kontakt" className="text-purple-700 underline hover:text-purple-900 font-medium">contact us</Link>{' '}for personalised advice.
              </>
            )}
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default VouchersPage;