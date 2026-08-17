import React from 'react';
import Layout from '../components/layout/Layout';
import { PillarLinksBlock } from '../components/SEO/PillarLinksBlock';
import { StudioServicesList } from '../components/SEO/StudioServicesList';
import { useManualPageContent } from '../hooks/useManualPageContent';
import { useLanguage } from '../context/LanguageContext';
import { SEOHead } from '../components/SEO/SEOHead';
import { SITE } from '../config/site';

/* Three hardcoded cards used to sit here — family / maternity / newborn, two of them
   illustrated with a Vienna client's photograph hotlinked from i.imgur.com, each a
   doorway to a /gutschein/* landing page that no longer exists. They named the origin
   studio's services, so a fashion photographer's voucher page offered newborn sessions.
   StudioServicesList reads the studio's own Authority Map instead, which is what the
   homepage grid, /contact and /waitlist already use, so none of them can drift apart. */

const GutscheinPage: React.FC = () => {
  const t = useManualPageContent('gift-cards');
  const { language } = useLanguage();
  const de = language === 'de';

  return (
    <Layout>
      <SEOHead
        title={de ? `Gutscheine für Fotoshootings | ${SITE.name}` : `Photo Shoot Gift Vouchers | ${SITE.name}`}
        description={de
          ? `Fotoshooting-Gutscheine von ${SITE.name}. Das perfekte Geschenk für Familie und Freunde.`
          : `Photo shoot gift vouchers from ${SITE.name}. The perfect gift for family and friends.`}
        keywords="Gutschein Fotoshooting, Geschenk Fotograf, Erlebnisgutschein Foto"
        canonical="/gutschein/"
      />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold text-purple-900 mb-4">
            {/* The fallback named Vienna, so an unconfigured studio advertised the origin
                studio's city in its own <h1>. Falls back to the studio's name instead. */}
            {t('giftCards.heroTitle') || (de ? `Fotoshooting-Gutscheine von ${SITE.name}` : `Photoshoot Gift Vouchers from ${SITE.name}`)}
          </h1>
          <p className="text-xl text-gray-700 mb-4">
            {t('giftCards.heroSubtitle')}
          </p>
          <p className="text-gray-600">
            {t('giftCards.sectionIntro')}
          </p>
        </div>
        
        <StudioServicesList
          heading={t('giftCards.sectionHeading') || (de ? 'Gutscheine für unsere Shootings' : 'Vouchers for our sessions')}
          variant="cards"
        />

        <div className="max-w-3xl mx-auto text-center mt-12">
          <a
            href="/vouchers"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
          >
            {t('giftCards.buttonLabel') || (de ? 'Gutscheine ansehen' : 'View vouchers')}
          </a>
        </div>
      </div>
      <PillarLinksBlock currentPath="/gutschein/" title={de ? 'Gutschein für welches Shooting?' : 'A voucher for which shoot?'} />
    </Layout>
  );
};

export default GutscheinPage;