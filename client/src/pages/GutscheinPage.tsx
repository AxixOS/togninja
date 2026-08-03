import React from 'react';
import Layout from '../components/layout/Layout';
import { PillarLinksBlock } from '../components/SEO/PillarLinksBlock';
import { useNavigate } from 'react-router-dom';
import { Camera, Heart, Baby } from 'lucide-react';
import { useManualPageContent } from '../hooks/useManualPageContent';
import { useLanguage } from '../context/LanguageContext';
import { SEOHead } from '../components/SEO/SEOHead';
import { SITE } from '../config/site';

const giftCardPackages = [
  {
    titleKey: 'giftCards.familyTitle',
    descriptionKey: 'giftCards.familyDescription',
    icon: Camera,
    image: 'https://i.imgur.com/4m5hoL9.jpg',
    link: '/gutschein/family'
  },
  {
    titleKey: 'giftCards.pregnancyTitle',
    descriptionKey: 'giftCards.pregnancyDescription',
    icon: Heart,
    image: 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg',
    link: '/gutschein/maternity'
  },
  {
    titleKey: 'giftCards.newbornTitle',
    descriptionKey: 'giftCards.newbornDescription',
    icon: Baby,
    image: 'https://i.imgur.com/QWOgLqX.jpg',
    link: '/gutschein/newborn'
  }
];

const GutscheinPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useManualPageContent('gift-cards');
  const { language } = useLanguage();
  const de = language === 'de';

  return (
    <Layout>
      <SEOHead
        title={`Gutscheine für Fotoshootings | ${SITE.name}`}
        description={`Fotoshooting-Gutscheine von ${SITE.name}. Das perfekte Geschenk für Familie und Freunde in Wien.`}
        keywords="Gutschein Fotoshooting, Geschenk Fotograf Wien, Erlebnisgutschein Foto"
        canonical="/gutschein/"
      />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold text-purple-900 mb-4">
            {t('giftCards.heroTitle') || (de ? 'Fotoshooting-Gutscheine Wien – Das perfekte Geschenk' : 'Photoshoot Gift Vouchers Vienna – The Perfect Gift')}
          </h1>
          <p className="text-xl text-gray-700 mb-4">
            {t('giftCards.heroSubtitle')}
          </p>
          <p className="text-gray-600">
            {t('giftCards.sectionIntro')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {giftCardPackages.map((pkg) => {
            const Icon = pkg.icon;
            return (
              <div 
                key={pkg.titleKey}
                onClick={() => navigate(pkg.link)}
                className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-48">
                  <img 
                    src={pkg.image}
                    alt={t(pkg.titleKey)}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-lg">
                    <Icon className="text-purple-600" size={24} />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-purple-900 mb-2">
                    {t(pkg.titleKey)}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {t(pkg.descriptionKey)}
                  </p>
                  <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    {t('giftCards.buttonLabel')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <PillarLinksBlock currentPath="/gutschein/" title={de ? 'Gutschein für welches Shooting?' : 'A voucher for which shoot?'} />
    </Layout>
  );
};

export default GutscheinPage;