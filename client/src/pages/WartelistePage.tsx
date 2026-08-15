import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { PillarLinksBlock } from '../components/SEO/PillarLinksBlock';
import { Calendar, Mail, Phone, User, Camera, Gift, ChevronRight } from 'lucide-react';
import { submitWaitlistForm } from '../lib/forms';
import { useManualPageContent } from '../hooks/useManualPageContent';
import { SEOHead } from '../components/SEO/SEOHead';
import { Helmet } from 'react-helmet-async';
import { useLanguage } from '../context/LanguageContext';
import { SITE } from '../config/site';

const WartelistePage: React.FC = () => {
  const { language } = useLanguage();
  // Page-scoped t(): checks this page's published Website Studio overrides first,
  // then falls back to the LanguageContext defaults.
  const t = useManualPageContent('waitlist');
  const [formData, setFormData] = useState({
    fullName: '',
    preferredDate: '',
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
      await submitWaitlistForm(formData);
      setSuccess(true);
      setFormData({ fullName: '', preferredDate: '', email: '', phone: '', message: '' });
    } catch (err) {
      setError(t('waitlist.anErrorOccurredPlease'));
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
        title={language === 'de' ? `Warteliste für Fotoshootings | ${SITE.name}` : `Photoshoot Waitlist | ${SITE.name}`}
        description={t('waitlist.signUpForOur')}
        keywords={t('waitlist.photoshootWaitlistPhotographerAppointment')}
        canonical="/warteliste/"
      />

      {/* Additive FAQPage schema – mirrors visible FAQ below */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: (language === 'de' ? [
              { q: 'Wie weit im Voraus sollte ich ein Fotoshooting buchen?', a: 'Wir empfehlen eine Vorlaufzeit von 2–3 Wochen, um Ihren Wunschtermin zu sichern.' },
              { q: 'Bieten Sie Termine am Wochenende an?', a: 'Ja, je nach Verfügbarkeit bieten wir Fotoshootings auch am Wochenende an.' },
              { q: 'Kann ich zwischen Studio- und Outdoor-Fotografie wählen?', a: 'Absolut. Wir bieten je nach Wunsch Studio- und Outdoor-Sessions an.' }
            ] : [
              { q: 'How far in advance should I book a photoshoot?', a: 'We recommend booking at least 2–3 weeks in advance to secure your preferred date.' },
              { q: 'Do you offer weekend appointments?', a: 'Yes, we offer weekend photoshoots depending on availability.' },
              { q: 'Can I choose between studio and outdoor photography?', a: 'Absolutely. We offer both studio and outdoor sessions based on your preference.' }
            ]).map(({ q, a }) => ({
              '@type': 'Question',
              name: q,
              acceptedAnswer: { '@type': 'Answer', text: a }
            }))
          })}
        </script>
      </Helmet>
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-purple-600 mb-4">
            {t('waitlist.title')}
          </h1>
          <p className="text-xl text-gray-600">
            {t('waitlist.subtitle')}
          </p>
          <p className="text-base text-gray-600 mt-4">
            {language === 'de' ? (
              <>
                Unsere Warteliste gilt für alle Shootings, darunter{' '}
                <Link to="/fotoshootings" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Familienfotos</Link>,{' '}
                <Link to="/fotoshootings" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Babyfotografie</Link>{' '}
                und{' '}
                <Link to="/fotoshootings" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Business Portraits</Link>.
              </>
            ) : (
              <>
                Our waitlist covers all shoots, including{' '}
                <Link to="/fotoshootings" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">family photos</Link>,{' '}
                <Link to="/fotoshootings" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">baby photography</Link>{' '}
                and{' '}
                <Link to="/fotoshootings" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">business portraits</Link>.
              </>
            )}
          </p>
        </div>

        {/* Additive SEO intro block – above form */}
        <section className="max-w-2xl mx-auto mb-10" aria-labelledby="waitlist-intro-heading">
          <h2 id="waitlist-intro-heading" className="text-2xl md:text-3xl font-bold text-purple-900 mb-3">
            {t('waitlist.bookYourProfessionalPhotoshoot')}
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {language === 'de' ? (
              <>
                Bereit für zeitlose Erinnerungen? Buchen Sie Ihr{' '}
                <Link to="/fotoshootings" className="text-purple-700 underline hover:text-purple-900">Familienfotoshooting</Link>, Ihre{' '}
                <Link to="/fotoshootings" className="text-purple-700 underline hover:text-purple-900">Neugeborenen-Session</Link>{' '}oder{' '}
                <Link to="/fotoshootings" className="text-purple-700 underline hover:text-purple-900">Business Portraits</Link>{' '}in unserem Studio. Flexible Termine inkl. Wochenende – wir begleiten Sie durch jeden Schritt.
              </>
            ) : (
              <>
                Ready to create timeless memories? Book your{' '}
                <Link to="/fotoshootings" className="text-purple-700 underline hover:text-purple-900">family photoshoot</Link>,{' '}
                <Link to="/fotoshootings" className="text-purple-700 underline hover:text-purple-900">newborn session</Link>, or{' '}
                <Link to="/fotoshootings" className="text-purple-700 underline hover:text-purple-900">business portraits</Link>{' '}with our studio. We offer flexible appointments, including weekends, and guide you through every step of the experience.
              </>
            )}
          </p>
        </section>

        <div className="max-w-xl mx-auto bg-white rounded-lg shadow-lg p-8">
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              {t('waitlist.successMessage')}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="flex items-center text-gray-700 font-medium mb-2">
                <User size={18} className="mr-2 text-purple-600" />
                {t('waitlist.fullName')} <span className="text-purple-600 ml-1">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-colors"
                placeholder={t('waitlist.fullNamePlaceholder')}
              />
            </div>

            <div>
              <label className="flex items-center text-gray-700 font-medium mb-2">
                <Calendar size={18} className="mr-2 text-purple-600" />
                {t('waitlist.preferredDate')} <span className="text-gray-400 ml-1 text-sm font-normal">(optional)</span>
              </label>
              <input
                type="date"
                name="preferredDate"
                value={formData.preferredDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center text-gray-700 font-medium mb-2">
                <Mail size={18} className="mr-2 text-purple-600" />
                {t('waitlist.email')} <span className="text-purple-600 ml-1">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-colors"
                placeholder={t('waitlist.emailPlaceholder')}
              />
            </div>

            <div>
              <label className="flex items-center text-gray-700 font-medium mb-2">
                <Phone size={18} className="mr-2 text-purple-600" />
                {t('waitlist.phone')} <span className="text-gray-400 ml-1 text-sm font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-colors"
                placeholder="Your phone number"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                {t('waitlist.message')}
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-colors"
                placeholder={t('waitlist.messagePlaceholder')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? t('waitlist.submitting') : t('waitlist.submit')}
            </button>

            <p className="text-sm text-gray-500 text-center">
              <span className="text-purple-600">*</span> {t('waitlist.requiredFields')}
            </p>
          </form>
        </div>

        {/* Additive: What happens next */}
        <section className="max-w-2xl mx-auto mt-10" aria-labelledby="waitlist-next-heading">
          <h2 id="waitlist-next-heading" className="text-2xl md:text-3xl font-bold text-purple-900 mb-3">
            {t('waitlist.whatHappensAfterYour')}
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {language === 'de' ? (
              <>
                Nach Ihrer Anfrage melden wir uns, um die Verfügbarkeit zu bestätigen, Ihre Wunschvorstellungen zu besprechen und Sie auf Ihr Shooting vorzubereiten. In der Zwischenzeit können Sie unsere{' '}
                <Link to="/preise" className="text-purple-700 underline hover:text-purple-900">Preise</Link>{' '}und unser{' '}
                <Link to="/portfolio" className="text-purple-700 underline hover:text-purple-900">Portfolio</Link>{' '}ansehen.
              </>
            ) : (
              <>
                Once you submit your request, we’ll contact you to confirm availability, discuss your photoshoot goals, and help you prepare for your session. You can also explore our{' '}
                <Link to="/preise" className="text-purple-700 underline hover:text-purple-900">pricing options</Link>{' '}and view our{' '}
                <Link to="/portfolio" className="text-purple-700 underline hover:text-purple-900">portfolio</Link>{' '}while you wait.
              </>
            )}
          </p>
        </section>

        {/* Services Sidebar/Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">{t('waitlist.whileYouWaitDiscover')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/fotoshootings" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-center group">
              <Camera className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 group-hover:text-purple-600">{t('waitlist.familyPhotos')}</h3>
            </Link>
            <Link to="/fotoshootings" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-center group">
              <Camera className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 group-hover:text-purple-600">{t('waitlist.newborn')}</h3>
            </Link>
            <Link to="/fotoshootings" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-center group">
              <Camera className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 group-hover:text-purple-600">{t('waitlist.maternity')}</h3>
            </Link>
            <Link to="/vouchers" className="bg-purple-600 text-white p-4 rounded-lg shadow hover:bg-purple-700 transition-colors text-center">
              <Gift className="w-8 h-8 mx-auto mb-2" />
              <h3 className="font-medium">{t('waitlist.vouchers')}</h3>
            </Link>
          </div>
          <p className="text-center text-gray-600 mt-6">
            <Link to="/blog" className="text-purple-600 hover:text-purple-800 font-medium inline-flex items-center">
              {t('waitlist.readOurBlogFor')} <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </p>

          {/* Additive: Explore our photography services link block */}
          <section className="mt-10" aria-labelledby="waitlist-explore-heading">
            <h3 id="waitlist-explore-heading" className="text-xl md:text-2xl font-bold text-purple-900 mb-4 text-center">
              {t('waitlist.exploreOurPhotographyServices')}
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
              <li>
                <Link to="/fotoshootings" className="block py-2 px-4 rounded-lg text-purple-700 hover:bg-purple-50 hover:text-purple-900 font-medium transition-colors text-center">
                  {t('waitlist.familyPhotographyVienna')}
                </Link>
              </li>
              <li>
                <Link to="/fotoshootings" className="block py-2 px-4 rounded-lg text-purple-700 hover:bg-purple-50 hover:text-purple-900 font-medium transition-colors text-center">
                  {t('waitlist.newbornPhotographyVienna')}
                </Link>
              </li>
              <li>
                <Link to="/fotoshootings" className="block py-2 px-4 rounded-lg text-purple-700 hover:bg-purple-50 hover:text-purple-900 font-medium transition-colors text-center">
                  {t('waitlist.maternityPhotoshootsVienna')}
                </Link>
              </li>
              <li>
                <Link to="/fotoshootings" className="block py-2 px-4 rounded-lg text-purple-700 hover:bg-purple-50 hover:text-purple-900 font-medium transition-colors text-center">
                  {t('waitlist.businessHeadshotsVienna')}
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>

      {/* Additive: FAQ section */}
      <section className="bg-white border-t border-gray-100" aria-labelledby="waitlist-faq-heading">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <h2 id="waitlist-faq-heading" className="text-2xl md:text-3xl font-bold text-purple-900 mb-6 text-center">
            {t('waitlist.frequentlyAskedQuestions')}
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                {t('waitlist.howFarInAdvance')}
              </h3>
              <p className="text-gray-700">
                {t('waitlist.weRecommendBookingAt')}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                {t('waitlist.doYouOfferWeekend')}
              </h3>
              <p className="text-gray-700">
                {t('waitlist.yesWeOfferWeekend')}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                {t('waitlist.canIChooseBetween')}
              </h3>
              <p className="text-gray-700">
                {t('waitlist.absolutelyWeOfferBoth')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <PillarLinksBlock currentPath="/warteliste/" title={t('waitlist.whichShootAreYou')} />

      {/* Additive: soft pre-footer CTA */}
      <section className="bg-purple-50/40 border-t border-gray-100">
        <div className="container mx-auto px-4 py-8 max-w-3xl text-center">
          <p className="text-gray-700">
            {language === 'de' ? (
              <>
                Noch nicht bereit zu buchen? Lassen Sie sich von unseren{' '}
                <Link to="/blog" className="text-purple-700 underline hover:text-purple-900 font-medium">Fotografie-Tipps</Link>{' '}inspirieren oder stöbern Sie in unseren{' '}
                <Link to="/vouchers" className="text-purple-700 underline hover:text-purple-900 font-medium">Geschenkgutscheinen</Link>.
              </>
            ) : (
              <>
                Not quite ready to book? Get inspired by our{' '}
                <Link to="/blog" className="text-purple-700 underline hover:text-purple-900 font-medium">photography tips</Link>{' '}or browse our{' '}
                <Link to="/vouchers" className="text-purple-700 underline hover:text-purple-900 font-medium">gift vouchers</Link>.
              </>
            )}
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default WartelistePage;