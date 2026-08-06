import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Mail, Phone, Clock, MapPin, Train, Car, MessageCircle, Camera, Gift, ChevronRight } from 'lucide-react';
import { submitContactForm } from '../lib/forms';
import { useManualPageContent } from '../hooks/useManualPageContent';
import { useLanguage } from '../context/LanguageContext';
import { SEOHead } from '../components/SEO/SEOHead';
import { RelatedTopicsBlock } from '../components/SEO/RelatedTopicsBlock';
import { Helmet } from 'react-helmet-async';
import { SITE } from '../config/site';

const KontaktPage: React.FC = () => {
  // Use manual page content hook - allows admin to override any content
  const t = useManualPageContent('contact');
  const { language } = useLanguage();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await submitContactForm(formData);
      setSuccess(true);
      setFormData({ fullName: '', email: '', phone: '', message: '' });
    } catch (err) {
      setError(language === 'de' ? 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' : 'An error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Layout>
      <SEOHead
        title={language === 'de' ? `Fotostudio Wien kontaktieren | ${SITE.name}` : 'Contact Photo Studio Vienna – Book Appointment & Consultation | New Age Photography'}
        description={language === 'de' ? 'Kontaktieren Sie unser Fotostudio in Wien 1050. Persönliche Beratung, flexible Termine Fr–So. Telefon, WhatsApp oder E-Mail – wir freuen uns auf Ihre Anfrage!' : 'Contact our photo studio in Vienna. Personal consultation, flexible appointments Fri–Sun. Phone, WhatsApp or email – we look forward to your inquiry!'}
        keywords={language === 'de' ? `Kontakt Fotograf Wien, Fotostudio Wien Termin, Fotoshooting buchen Wien, ${SITE.name} Kontakt` : 'Contact Photographer Vienna, Photo Studio Vienna Booking, New Age Photography Contact'}
        canonical="/kontakt/"
      />
      
      {/* JSON-LD Structured Data */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'PhotoStudio',
            name: SITE.name,
            url: `${SITE.url}/`,
            telephone: SITE.phone,
            email: SITE.email,
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Wehrgasse 11A/2+5',
              addressLocality: 'Wien',
              postalCode: '1050',
              addressCountry: 'AT'
            }
          })}
        </script>
      </Helmet>
      
      {/* Hero Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">{t('contact.title')}</h1>
            <p className="mt-4 text-xl text-gray-600">{t('contact.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-gray-900">{t('contact.studioTitle')}</h2>
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Mail className="w-6 h-6 text-gray-600" />
                <span className="text-gray-700">{SITE.email}</span>
              </div>
              <div className="flex items-center space-x-4">
                <Phone className="w-6 h-6 text-gray-600" />
                <div className="flex flex-col space-y-2">
                  <span className="text-gray-700">{SITE.phone}</span>
                  <div className="flex space-x-3">
                    <a
                      href={`tel:+${SITE.phone.replace(/[^0-9]/g,'')}`}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      {t('contact.call')}
                    </a>
                    <a
                      href={`https://wa.me/${SITE.phone.replace(/[^0-9]/g,'')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Clock className="w-6 h-6 text-gray-600" />
                <span className="text-gray-700">{t('contact.openingHours')}</span>
              </div>
              <div className="flex items-center space-x-4">
                <MapPin className="w-6 h-6 text-gray-600" />
                <div className="text-gray-700">
                  <div>{t('contact.studioAddress')}</div>
                  <div className="text-sm text-gray-600 mt-1">{t('contact.addressNote')}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">{t('contact.transport')}</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Train className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">{t('contact.trainInfo')}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Car className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">{t('contact.streetParking')}</span>
                </div>
              </div>
            </div>

            {/* Google Maps Embed */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('contact.mapTitle')}</h3>
              <div className="rounded-lg overflow-hidden shadow-sm border">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2659.8!2d16.3608!3d48.1865!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x476d0774b3d4e1ab%3A0x123456789abcdef0!2sWehrgasse%2011A%2C%201050%20Wien%2C%20Austria!5e0!3m2!1sen!2sat!4v1625075400000!5m2!1sen!2sat"
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${SITE.name} Studio Location - Wehrgasse 11A/2+5, 1050 Wien`}
                />
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t('contact.contactForm')}</h2>
            {success ? (
              <div className="bg-green-50 border border-green-200 p-6 rounded-md text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-green-800 font-medium">{t('contact.successMessage')}</p>
                <p className="text-green-700 text-sm mt-1">
                  {language === 'en'
                    ? 'We typically reply within 1 hour during business hours.'
                    : 'Wir antworten in der Regel innerhalb 1 Stunde während der Geschäftszeiten.'}
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 mt-5">
                  <Link
                    to="/vouchers"
                    className="inline-flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    {language === 'en' ? 'Browse gift vouchers' : 'Gutscheine ansehen'}
                  </Link>
                  <Link
                    to="/fotoshootings/"
                    className="inline-flex items-center justify-center border border-purple-300 text-purple-700 hover:bg-purple-50 font-medium px-5 py-2.5 rounded-lg transition-colors"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {language === 'en' ? 'See our photo shoots' : 'Unsere Fotoshootings'}
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">{t('contact.fullName')}</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">{t('contact.email')}</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">{t('contact.phone')}</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">{t('contact.message')}</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                {error && (
                  <div className="bg-red-50 p-4 rounded-md">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? t('contact.submitting') : t('contact.submit')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Services CTA Section */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">{language === 'de' ? 'Unsere Beliebten Services' : 'Our Popular Services'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to="/fotoshootings" className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center mb-3">
                <Camera className="w-6 h-6 text-purple-600 mr-3" />
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-600">{language === 'de' ? 'Familienfotos' : 'Family Photos'}</h3>
              </div>
              <p className="text-gray-600 text-sm mb-2">{language === 'de' ? 'Professionelle Familienportraits in Wien' : 'Professional family portraits in Vienna'}</p>
              <span className="text-purple-600 text-sm flex items-center">{language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ChevronRight className="w-4 h-4 ml-1" /></span>
            </Link>
            <Link to="/fotoshootings" className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center mb-3">
                <Camera className="w-6 h-6 text-purple-600 mr-3" />
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-600">{language === 'de' ? 'Neugeborenenfotos' : 'Newborn Photos'}</h3>
              </div>
              <p className="text-gray-600 text-sm mb-2">{language === 'de' ? 'Zarte Babyfotografie für die ersten Tage' : 'Gentle baby photography for the first days'}</p>
              <span className="text-purple-600 text-sm flex items-center">{language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ChevronRight className="w-4 h-4 ml-1" /></span>
            </Link>
            <Link to="/fotoshootings" className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center mb-3">
                <Camera className="w-6 h-6 text-purple-600 mr-3" />
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-600">Business Portraits</h3>
              </div>
              <p className="text-gray-600 text-sm mb-2">{language === 'de' ? 'Professionelle Bewerbungs- und Businessfotos' : 'Professional headshots and business photography'}</p>
              <span className="text-purple-600 text-sm flex items-center">{language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ChevronRight className="w-4 h-4 ml-1" /></span>
            </Link>
          </div>
          <div className="text-center mt-8">
            <Link 
              to="/vouchers" 
              className="inline-flex items-center bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Gift className="w-5 h-5 mr-2" />
              {language === 'de' ? 'Geschenkgutscheine kaufen' : 'Buy Gift Vouchers'}
            </Link>
          </div>
        </div>
      </div>
      <RelatedTopicsBlock pathname="/kontakt" language={(language as 'de' | 'en') || 'de'} />
    </Layout>
  );
};

export default KontaktPage;