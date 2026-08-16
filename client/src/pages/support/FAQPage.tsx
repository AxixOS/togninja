import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Camera, Calendar, CreditCard, Image, Phone, Mail } from 'lucide-react';
import { PillarLinksBlock } from '../../components/SEO/PillarLinksBlock';
import Layout from '../../components/layout/Layout';
import { SEOHead } from '../../components/SEO/SEOHead';
import { SITE } from '../../config/site';
import { useLanguage } from '../../context/LanguageContext';
import { useManualPageContent } from '../../hooks/useManualPageContent';
import { Helmet } from 'react-helmet-async';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { language } = useLanguage();
  const de = language === 'de';

  // Every answer is the studio's own, edited in Website Studio → Customise → FAQ Page.
  //
  // This was 24 inline Q&As. They read as marketing copy but several were commercial
  // TERMS — a 30% deposit, a 50% fee for cancelling inside 48 hours, 3-year voucher
  // validity — stated as this studio's policy, in German, with no screen anywhere to
  // change them. A customer could hold a studio to terms it never agreed and could not
  // find. Nothing here has a default: an unanswered question simply does not render.
  const t = useManualPageContent('faq');

  const SECTIONS: { category: string; from: number; to: number }[] = [
    { category: de ? 'Buchung, Zahlung & Stornierung' : 'Booking, Payment & Cancellation', from: 1, to: 4 },
    { category: de ? 'Das Shooting' : 'The Session', from: 5, to: 8 },
    { category: de ? 'Bilder & Lieferung' : 'Images & Delivery', from: 9, to: 12 },
  ];

  const faqData: FAQItem[] = SECTIONS.flatMap(({ category, from, to }) => {
    const out: FAQItem[] = [];
    for (let i = from; i <= to; i++) {
      const question = (t(`faq.q${i}.question`) || '').trim();
      const answer = (t(`faq.q${i}.answer`) || '').trim();
      if (question && answer) out.push({ category, question, answer });
    }
    return out;
  });


  const categories = Array.from(new Set(faqData.map(item => item.category)));

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <Layout>
      <SEOHead
        title={de ? `FAQ – Häufige Fragen | ${SITE.name}` : `FAQ – Frequently Asked Questions | ${SITE.name}`}
        description={de
          ? `Antworten auf Ihre Fragen zu Fotoshootings bei ${SITE.name}. Ablauf, Preise, Termine und mehr.`
          : `Answers to your questions about photo shoots with ${SITE.name}. How it works, pricing, booking and more.`}
        keywords="FAQ Fotoshooting, Fragen Fotograf, Fotoshooting Ablauf"
        canonical="/faq/"
      />

      {/* FAQPage structured data, built from the SAME answers rendered below.
          Google's FAQ guidelines require the content to be visible on the page it is
          emitted from — which is why the equivalent block was deleted from BlogPage in
          v1.9.4, where three invented Q&As appeared nowhere on screen. Here they are the
          page. Emitted only when the studio has actually written answers; marking up an
          empty FAQ is worse than marking up none. */}
      {faqData.length > 0 && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqData.map((item) => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: { '@type': 'Answer', text: item.answer },
              })),
            })}
          </script>
        </Helmet>
      )}


      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-indigo-600 via-purple-500 to-pink-500 text-white py-24">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              {de ? 'Häufig gestellte Fragen' : 'Frequently Asked Questions'}
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              {de ? 'Hier finden Sie Antworten auf die wichtigsten Fragen rund um Ihr Fotoshooting' : 'Find answers to the most important questions about your photo shoot'}
            </p>
          </div>
        </section>

        {/* Quick Contact Banner */}
        <section className="bg-purple-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-gray-700 mb-4">
                {de ? 'Ihre Frage ist nicht dabei? Wir helfen gerne persönlich weiter!' : "Can't find your question? We're happy to help in person!"}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {/* A "call us" button with no number behind it is worse than no button. */}
                {SITE.phone && (
                <a
                  href={`tel:${String(SITE.phone).replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-purple-700 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {SITE.phone}
                </a>
                )}
                <a
                  href={`mailto:${SITE.email}`}
                  className="inline-flex items-center gap-2 bg-white text-purple-600 border-2 border-purple-600 px-6 py-2 rounded-full font-semibold hover:bg-purple-50 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {SITE.email}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Nothing answered yet — say so plainly and point at the contact details above,
            rather than rendering three category headings over empty accordions. */}
        {faqData.length === 0 && (
          <section className="bg-white py-16">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <p className="text-gray-600">
                {de
                  ? 'Hier finden Sie in Kürze Antworten auf häufige Fragen. Bis dahin schreiben Sie uns gerne direkt — wir antworten schnell.'
                  : "We're putting our answers to common questions together. In the meantime, just get in touch — we reply quickly."}
              </p>
            </div>
          </section>
        )}

        {/* FAQ Categories */}
        {categories.map((category, categoryIndex) => (
          <section key={category} className={categoryIndex % 2 === 0 ? 'bg-white py-16' : 'bg-gray-50 py-16'}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 mb-8">
                {(category === 'Buchung & Vorbereitung' || category === 'Booking & Preparation') && <Calendar className="w-8 h-8 text-purple-600" />}
                {(category === 'Während des Shootings' || category === 'During the Shoot') && <Camera className="w-8 h-8 text-purple-600" />}
                {(category === 'Nach dem Shooting' || category === 'After the Shoot') && <Image className="w-8 h-8 text-purple-600" />}
                {(category === 'Zahlung & Stornierung' || category === 'Payment & Cancellation') && <CreditCard className="w-8 h-8 text-purple-600" />}
                {(category === 'Gutscheine' || category === 'Gift Vouchers') && <span className="text-3xl">🎁</span>}
                {(category === 'Spezielle Anliegen' || category === 'Special Requests') && <span className="text-3xl">💡</span>}
                <h2 className="text-3xl font-bold text-gray-900">{category}</h2>
              </div>

              <div className="space-y-4">
                {faqData
                  .filter(item => item.category === category)
                  .map((item, index) => {
                    const globalIndex = faqData.indexOf(item);
                    const isOpen = openIndex === globalIndex;

                    return (
                      <div
                        key={globalIndex}
                        className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-purple-300 transition-colors"
                      >
                        <button
                          onClick={() => toggleFAQ(globalIndex)}
                          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-purple-50 transition-colors"
                        >
                          <span className="font-semibold text-gray-900 pr-4">{item.question}</span>
                          <ChevronDown
                            className={`w-5 h-5 text-purple-600 flex-shrink-0 transition-transform ${
                              isOpen ? 'transform rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-6 py-4 bg-purple-50 border-t-2 border-purple-100">
                            <p className="text-gray-700 leading-relaxed">{item.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>
        ))}

        {/* Related Links */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
              {de ? 'Weitere hilfreiche Informationen' : 'More Helpful Information'}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Link
                to="/preise"
                className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-xl hover:shadow-lg transition-shadow"
              >
                <CreditCard className="w-12 h-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{de ? 'Preise & Pakete' : 'Prices & Packages'}</h3>
                <p className="text-gray-600 mb-4">
                  {de ? 'Alle unsere Fotoshooting-Pakete und Preise im Überblick.' : 'All our photo shoot packages and prices at a glance.'}
                </p>
                <span className="text-purple-600 font-semibold">{de ? 'Mehr erfahren →' : 'Learn more →'}</span>
              </Link>

              <Link
                to="/ueber-uns"
                className="bg-gradient-to-br from-pink-50 to-orange-50 p-8 rounded-xl hover:shadow-lg transition-shadow"
              >
                <Camera className="w-12 h-12 text-pink-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{de ? 'Über uns' : 'About Us'}</h3>
                <p className="text-gray-600 mb-4">
                  {de ? 'Lernen Sie unser Team und unsere Philosophie kennen.' : 'Get to know our team and our philosophy.'}
                </p>
                <span className="text-pink-600 font-semibold">{de ? 'Mehr erfahren →' : 'Learn more →'}</span>
              </Link>

              <Link
                to="/kontakt"
                className="bg-gradient-to-br from-orange-50 to-yellow-50 p-8 rounded-xl hover:shadow-lg transition-shadow"
              >
                <Phone className="w-12 h-12 text-orange-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{de ? 'Kontakt' : 'Contact'}</h3>
                <p className="text-gray-600 mb-4">
                  {de ? 'Nehmen Sie Kontakt mit uns auf für eine persönliche Beratung.' : 'Get in touch with us for a personal consultation.'}
                </p>
                <span className="text-orange-600 font-semibold">{de ? 'Mehr erfahren →' : 'Learn more →'}</span>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-br from-indigo-600 via-purple-500 to-pink-500 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold mb-6">{de ? 'Bereit für Ihr Fotoshooting?' : 'Ready for Your Photo Shoot?'}</h2>
            <p className="text-xl mb-8">
              {de ? 'Buchen Sie jetzt Ihren Wunschtermin oder lassen Sie sich persönlich beraten!' : 'Book your preferred date now or get in touch for personal advice!'}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/kontakt"
                className="bg-white text-purple-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
              >
                <Phone className="w-5 h-5" />
                {de ? 'Termin vereinbaren' : 'Book an Appointment'}
              </Link>
              <Link
                to="/preise"
                className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white/10 transition-colors"
              >
                {de ? 'Preise ansehen' : 'View Prices'}
              </Link>
            </div>
          </div>
        </section>
      </div>
      {/* No title override: this one existed only to strip "in Wien" from the default
          heading. The default is the studio's own city now, so overriding it here would
          be the one page that never says where the studio is. */}
      <PillarLinksBlock currentPath="/faq/" />
    </Layout>
  );
};

export default FAQPage;
