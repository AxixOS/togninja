import React from 'react';
import { motion } from 'framer-motion';
import Layout from '../components/layout/Layout';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Camera, ArrowRight } from 'lucide-react';
import { useManualPageContent } from '../hooks/useManualPageContent';
import { SEOHead } from '../components/SEO/SEOHead';
import { SITE } from '../config/site';
import { useLanguage } from '../context/LanguageContext';

const FotoshootingsPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useManualPageContent('photoshoots');
  const { language } = useLanguage();
  const de = language === 'de';

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const shootingTypes = [
    {
      title: t('photoshoots.familyTitle'),
      description: t('photoshoots.familyDescription'),
      image: 'https://i.postimg.cc/gcKwDrqv/Baby-Pink-Bubbles-20x20.jpg',
      link: '/gutschein/family'
    },
    {
      title: t('photoshoots.pregnancyTitle'),
      description: t('photoshoots.pregnancyDescription'),
      image: 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg',
      link: '/gutschein/maternity'
    },
    {
      title: t('photoshoots.newbornTitle'),
      description: t('photoshoots.newbornDescription'),
      image: 'https://i.postimg.cc/43YQ9VD4/4-S8-A4770-105-1024x683-Copy.jpg',
      link: '/gutschein/newborn'
    },
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  };

  return (
    <Layout>
      <SEOHead
        title={`Fotoshootings in Wien buchen | ${SITE.name}`}
        description="Professionelle Fotoshootings in Wien: Familien-, Baby-, Neugeborenen-, Business- und Hochzeitsfotografie. Flexible Pakete ab €95, Studio & Outdoor. Jetzt Wunschtermin sichern!"
        keywords="Fotoshooting Wien buchen, Fotoshooting Pakete Wien, Familienfotoshooting Wien, Business Fotoshooting Wien"
        canonical="/fotoshootings/"
      />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 py-24 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-pink-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
            >
              <Camera className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              {t('photoshoots.title')}
            </h1>
            <p className="text-purple-100 text-xl leading-relaxed">
              {t('photoshoots.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            {shootingTypes.map((type, index) => (
              <motion.div 
                key={index} 
                variants={itemVariants}
                className="group"
              >
                <div 
                  className="relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer"
                  onClick={() => {
                    scrollToTop();
                    navigate(type.link);
                  }}
                >
                  {/* Image Container */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img 
                      src={type.image}
                      alt={type.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-900/80 via-purple-900/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                    
                    {/* Hover Content */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                      <motion.div
                        initial={{ scale: 0.8 }}
                        whileHover={{ scale: 1 }}
                        className="px-6 py-3 bg-white rounded-full font-semibold text-purple-700 flex items-center gap-2 shadow-lg"
                      >
                        {t('photoshoots.learnMore')}
                        <ArrowRight className="w-4 h-4" />
                      </motion.div>
                    </div>

                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-purple-900 mb-3 group-hover:text-purple-600 transition-colors">
                      {type.title}
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                      {type.description}
                    </p>
                  </div>

                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-purple-900 mb-4">
              {de ? 'Warum' : 'Why'} {SITE.name}?
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto rounded-full" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Clock, title: t('photoshoots.flexibleAppointments'), desc: t('photoshoots.flexibleDescription') },
              { icon: Users, title: t('photoshoots.wholeFamily'), desc: t('photoshoots.wholeFamilyDescription') },
              { icon: Camera, title: t('photoshoots.professionalEquipment'), desc: t('photoshoots.professionalDescription') },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-purple-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {de ? 'Bereit für Ihr Fotoshooting?' : 'Ready for your photoshoot?'}
            </h2>
            <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
              {de
                ? 'Kontaktieren Sie uns heute und lassen Sie uns gemeinsam unvergessliche Momente festhalten.'
                : 'Get in touch today and let’s capture unforgettable moments together.'}
            </p>
            <motion.button
              onClick={() => navigate('/warteliste')}
              className="px-8 py-4 bg-white text-purple-700 font-semibold rounded-full hover:shadow-2xl hover:shadow-white/25 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {de ? 'Termin anfragen' : 'Request an appointment'}
            </motion.button>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default FotoshootingsPage;