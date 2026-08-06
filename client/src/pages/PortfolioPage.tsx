import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { proxiedImgProps } from '../lib/imageProxy';
import { RelatedTopicsBlock } from '../components/SEO/RelatedTopicsBlock';
import { PillarLinksBlock } from '../components/SEO/PillarLinksBlock';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { SEOHead } from '../components/SEO/SEOHead';
import { SITE } from '../config/site';
import { ChevronLeft, ChevronRight, Camera, Heart, Users, Briefcase, Baby, Sparkles, Loader2 } from 'lucide-react';

// Portfolio image from API
interface PortfolioImage {
  id: number;
  category: string;
  url: string;
  alt?: string;
  title?: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

// Category configuration (static - only images come from API)
// Category "view more" links point at the services overview (the bespoke Vienna service
// pages were removed for the neutral master). A studio can wire these to its own pages.
const categoryConfig = [
  { id: 'family', icon: Users, link: '/fotoshootings' },
  { id: 'newborn', icon: Baby, link: '/fotoshootings' },
  { id: 'maternity', icon: Heart, link: '/fotoshootings' },
  { id: 'wedding', icon: Sparkles, link: '/fotoshootings' },
  { id: 'business', icon: Briefcase, link: '/fotoshootings' },
  { id: 'event', icon: Camera, link: '/fotoshootings' },
];

const categoryTitles: Record<string, { en: string; de: string }> = {
  family: { en: 'Family Portraits', de: 'Familienporträts' },
  newborn: { en: 'Newborn Photography', de: 'Neugeborenen-Fotografie' },
  maternity: { en: 'Maternity Sessions', de: 'Schwangerschafts-Sessions' },
  wedding: { en: 'Wedding Photography', de: 'Hochzeitsfotografie' },
  business: { en: 'Business & Corporate', de: 'Business & Corporate' },
  event: { en: 'Event Photography', de: 'Event-Fotografie' },
};

const categoryDescriptions: Record<string, { en: string; de: string }> = {
  family: { 
    en: 'Capturing the love, laughter, and connection that makes your family unique.', 
    de: 'Wir fangen die Liebe, das Lachen und die Verbindung ein, die Ihre Familie einzigartig macht.' 
  },
  newborn: { 
    en: 'Delicate and dreamy images of your newest family member in their first days.', 
    de: 'Zarte und verträumte Bilder Ihres neuesten Familienmitglieds in seinen ersten Tagen.' 
  },
  maternity: { 
    en: 'Celebrating the beautiful journey of motherhood with elegant, timeless portraits.', 
    de: 'Wir feiern die wunderbare Reise der Mutterschaft mit eleganten, zeitlosen Porträts.' 
  },
  wedding: { 
    en: 'Your love story told through authentic, emotional, and stunning imagery.', 
    de: 'Ihre Liebesgeschichte erzählt durch authentische, emotionale und atemberaubende Bilder.' 
  },
  business: { 
    en: 'Professional headshots and corporate photography that makes an impression.', 
    de: 'Professionelle Headshots und Corporate-Fotografie, die Eindruck hinterlässt.' 
  },
  event: { 
    en: 'Dynamic coverage of your special events, conferences, and celebrations.', 
    de: 'Dynamische Begleitung Ihrer besonderen Events, Konferenzen und Feiern.' 
  },
};

// Carousel Component for each category
const CategoryCarousel: React.FC<{
  categoryId: string;
  icon: React.ComponentType<any>;
  link: string;
  images: PortfolioImage[];
  index: number;
  isReversed: boolean;
}> = ({ categoryId, icon: Icon, link, images, index, isReversed }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true, 
    align: 'start',
    slidesToScroll: 1,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  // Auto-scroll
  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 4000 + index * 500);
    return () => clearInterval(interval);
  }, [emblaApi, index]);

  const title = categoryTitles[categoryId]?.[language] || categoryId;
  const description = categoryDescriptions[categoryId]?.[language] || '';

  // Don't render if no images
  if (!images || images.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
      className={`py-16 ${index % 2 === 0 ? 'bg-white' : 'bg-gradient-to-br from-purple-50 to-pink-50'}`}
    >
      <div className="container mx-auto px-4">
        <div className={`flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12`}>
          {/* Text Content */}
          <motion.div 
            className="lg:w-2/5"
            initial={{ opacity: 0, x: isReversed ? 50 : -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent leading-normal">
                {title}
              </h2>
            </div>
            <p className="text-gray-600 text-lg mb-6 leading-relaxed">
              {description}
            </p>
            <motion.button
              onClick={() => navigate(link)}
              className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full hover:shadow-lg hover:shadow-purple-300/50 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {language === 'de' ? 'Mehr entdecken' : 'Explore More'}
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.div>

          {/* Carousel */}
          <div className="lg:w-3/5 w-full">
            <div className="relative">
              <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
                <div className="flex">
                  {images.map((image, imgIndex) => (
                    <div 
                      key={image.id || imgIndex} 
                      className="flex-[0_0_100%] min-w-0 md:flex-[0_0_50%] lg:flex-[0_0_50%] px-2"
                    >
                      <motion.div
                        className="relative aspect-[4/3] rounded-xl overflow-hidden group cursor-pointer"
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.3 }}
                        onClick={() => navigate(link)}
                      >
                        <img
                          {...proxiedImgProps(image.url, { w: 800 })}
                          alt={image.alt || image.title || 'Portfolio image'}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-0 left-0 right-0 p-6">
                            <h3 className="text-white font-bold text-xl">{image.title}</h3>
                          </div>
                        </div>
                        {/* Shine effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      </motion.div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Buttons */}
              <button
                onClick={scrollPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white hover:scale-110 transition-all z-10"
              >
                <ChevronLeft className="w-6 h-6 text-purple-700" />
              </button>
              <button
                onClick={scrollNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white hover:scale-110 transition-all z-10"
              >
                <ChevronRight className="w-6 h-6 text-purple-700" />
              </button>

              {/* Dots */}
              <div className="flex justify-center gap-2 mt-4">
                {images.map((_, dotIndex) => (
                  <button
                    key={dotIndex}
                    onClick={() => emblaApi?.scrollTo(dotIndex)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      dotIndex === selectedIndex 
                        ? 'w-8 bg-gradient-to-r from-purple-600 to-pink-600' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

// Masonry Grid for Featured Work
const FeaturedGrid: React.FC<{ images: PortfolioImage[] }> = ({ images }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Assign sizes based on index for visual variety
  const getSizeClass = (index: number) => {
    return (index === 0 || index === 3) ? 'md:col-span-2 md:row-span-2' : '';
  };

  const getCategoryLink = (category: string) => {
    const config = categoryConfig.find(c => c.id === category);
    return config?.link || '/portfolio';
  };

  if (!images || images.length === 0) return null;

  return (
    <section className="py-20 bg-gray-900">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {language === 'de' ? 'Ausgewählte Arbeiten' : 'Featured Work'}
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {language === 'de' 
              ? 'Eine Auswahl unserer liebsten Momente aus verschiedenen Sessions'
              : 'A selection of our favorite moments from various sessions'}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
          {images.slice(0, 6).map((image, index) => (
            <motion.div
              key={image.id || index}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-xl overflow-hidden cursor-pointer group ${getSizeClass(index)}`}
              onClick={() => navigate(getCategoryLink(image.category))}
            >
              <img
                {...proxiedImgProps(image.url, { w: 1000 })}
                alt={image.alt || image.title || 'Featured image'}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-purple-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500">
                <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <span className="text-purple-300 text-sm uppercase tracking-wider">{image.category}</span>
                  <h3 className="text-white font-bold text-xl">{image.title}</h3>
                </div>
              </div>
              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Main Portfolio Page
const PortfolioPage: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  // Fetch portfolio images from API
  const { data: allImages, isLoading, error } = useQuery<PortfolioImage[]>({
    queryKey: ['/api/portfolio/images'],
    queryFn: async () => {
      const res = await fetch('/api/portfolio/images');
      if (!res.ok) throw new Error('Failed to fetch portfolio images');
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Group images by category
  const imagesByCategory = useMemo(() => {
    if (!allImages) return {};
    return allImages.reduce((acc: Record<string, PortfolioImage[]>, img) => {
      if (!acc[img.category]) acc[img.category] = [];
      acc[img.category].push(img);
      return acc;
    }, {});
  }, [allImages]);

  // Get featured images
  const featuredImages = imagesByCategory['featured'] || [];

  return (
    <Layout>
      <SEOHead
        title={language === 'de' ? `Fotografie Portfolio Wien | ${SITE.name}` : 'Photography Portfolio Vienna – Family, Newborn & Business Sessions | New Age Photography'}
        description={language === 'de' 
          ? 'Entdecken Sie unser Portfolio: Familienporträts, Neugeborenenfotos, Schwangerschaftsbilder, Hochzeitsfotografie und Business-Portraits aus Wien. Lassen Sie sich inspirieren!'
          : 'Explore our portfolio: Family portraits, newborn photos, maternity sessions, wedding photography and business portraits from Vienna. Get inspired!'}
        keywords="Portfolio Fotograf Wien, Familienfotos Wien, Hochzeitsfotografie Wien, Business Portraits Wien, Neugeborenenfotos Wien"
        canonical="/portfolio/"
      />

      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900">
          <div className="absolute inset-0 opacity-30">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-64 h-64 rounded-full bg-white/10"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.2, 0.1],
                }}
                transition={{
                  duration: 4 + Math.random() * 4,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
            >
              <Camera className="w-10 h-10 text-white" />
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              <span className="block">{language === 'de' ? 'Unser' : 'Our'}</span>
              <span className="bg-gradient-to-r from-pink-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                Portfolio
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-purple-200 max-w-3xl mx-auto mb-8">
              {language === 'de' 
                ? 'Momente, die für immer bleiben. Entdecken Sie unsere Arbeit.'
                : 'Moments that last forever. Explore our work.'}
            </p>

            <p className="text-base md:text-lg text-purple-100/90 max-w-3xl mx-auto mb-8">
              {language === 'de' ? (
                <>
                  Entdecken Sie Beispiele aus unseren{' '}
                  <Link to="/fotoshootings" className="text-pink-200 hover:text-white underline underline-offset-2">Familienfotos</Link>,{' '}
                  <Link to="/fotoshootings" className="text-pink-200 hover:text-white underline underline-offset-2">Babyfotografie</Link>{' '}
                  und{' '}
                  <Link to="/fotoshootings" className="text-pink-200 hover:text-white underline underline-offset-2">Business Portrait Shootings</Link>.
                </>
              ) : (
                <>
                  Explore examples from our{' '}
                  <Link to="/fotoshootings" className="text-pink-200 hover:text-white underline underline-offset-2">family photos</Link>,{' '}
                  <Link to="/fotoshootings" className="text-pink-200 hover:text-white underline underline-offset-2">baby photography</Link>{' '}
                  and{' '}
                  <Link to="/fotoshootings" className="text-pink-200 hover:text-white underline underline-offset-2">business portrait shoots</Link>.
                </>
              )}
            </p>

            <motion.button
              onClick={() => document.getElementById('portfolio-content')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-900 font-semibold rounded-full hover:shadow-2xl hover:shadow-white/25 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {language === 'de' ? 'Portfolio entdecken' : 'Explore Portfolio'}
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/50 flex items-start justify-center p-2">
            <motion.div
              className="w-1.5 h-3 rounded-full bg-white"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Portfolio Content */}
      <div id="portfolio-content">
        {/* Loading State */}
        {isLoading && (
          <div className="py-20 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-purple-600" />
            <p className="mt-4 text-gray-600">
              {language === 'de' ? 'Portfolio wird geladen...' : 'Loading portfolio...'}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="py-20 text-center">
            <p className="text-red-600">
              {language === 'de' ? 'Fehler beim Laden des Portfolios' : 'Error loading portfolio'}
            </p>
          </div>
        )}

        {/* Category Carousels */}
        {!isLoading && !error && categoryConfig.map((category, index) => (
          <CategoryCarousel
            key={category.id}
            categoryId={category.id}
            icon={category.icon}
            link={category.link}
            images={imagesByCategory[category.id] || []}
            index={index}
            isReversed={index % 2 === 1}
          />
        ))}

        {/* Featured Grid */}
        {!isLoading && !error && <FeaturedGrid images={featuredImages} />}

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                {language === 'de' ? 'Bereit für Ihre eigenen Erinnerungen?' : 'Ready to Create Your Own Memories?'}
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                {language === 'de'
                  ? 'Lassen Sie uns gemeinsam unvergessliche Momente festhalten.'
                  : "Let's capture unforgettable moments together."}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.button
                  onClick={() => navigate('/warteliste')}
                  className="px-8 py-4 bg-white text-purple-700 font-semibold rounded-full hover:shadow-2xl transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {language === 'de' ? 'Termin anfragen' : 'Book a Session'}
                </motion.button>
                <motion.button
                  onClick={() => navigate('/vouchers')}
                  className="px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-full hover:bg-white/10 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {language === 'de' ? 'Gutscheine ansehen' : 'View Vouchers'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Weitere Fotoshootings – compact internal link block */}
      <section className="py-12 bg-gray-50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {language === 'de' ? 'Weitere Fotoshootings' : 'More Photo Shoots'}
          </h3>
          <ul className="grid sm:grid-cols-3 gap-3 mb-6 max-w-2xl mx-auto">
            <li className="text-center">
              <Link to="/fotoshootings" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                {language === 'de' ? 'Familienfotos Wien' : 'Family Photos Vienna'}
              </Link>
            </li>
            <li className="text-center">
              <Link to="/fotoshootings" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                {language === 'de' ? 'Babyfotografie Wien' : 'Baby Photography Vienna'}
              </Link>
            </li>
            <li className="text-center">
              <Link to="/fotoshootings" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                {language === 'de' ? 'Business Portrait Wien' : 'Business Portrait Vienna'}
              </Link>
            </li>
          </ul>
          <p className="text-center text-gray-700">
            <Link to="/preise/" className="text-purple-700 hover:text-purple-900 font-semibold underline underline-offset-2">
              {language === 'de' ? 'Preise ansehen' : 'View prices'}
            </Link>
            <span className="mx-2 text-gray-400">·</span>
            <Link to="/warteliste/" className="text-purple-700 hover:text-purple-900 font-semibold underline underline-offset-2">
              {language === 'de' ? 'Termin sichern' : 'Book appointment'}
            </Link>
          </p>
        </div>
      </section>

      <PillarLinksBlock currentPath="/portfolio/" title={language === 'de' ? 'Unsere Fotoshootings in Wien' : 'Our Photo Shoots in Vienna'} />
      <RelatedTopicsBlock pathname="/portfolio" language={(language as 'de' | 'en') || 'de'} />
    </Layout>
  );
};

export default PortfolioPage;
