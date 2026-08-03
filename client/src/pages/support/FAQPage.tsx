import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Camera, Calendar, CreditCard, Image, Phone, Mail } from 'lucide-react';
import { PillarLinksBlock } from '../../components/SEO/PillarLinksBlock';
import Layout from '../../components/layout/Layout';
import { SEOHead } from '../../components/SEO/SEOHead';
import { SITE } from '../../config/site';
import { useLanguage } from '../../context/LanguageContext';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { language } = useLanguage();
  const de = language === 'de';

  const faqData: FAQItem[] = [
    // Booking & Preparation
    {
      category: de ? 'Buchung & Vorbereitung' : 'Booking & Preparation',
      question: de ? 'Wie buche ich ein Fotoshooting?' : 'How do I book a photo shoot?',
      answer: de ? `Sie können ganz einfach über unser Kontaktformular, per E-Mail (${SITE.email}) oder telefonisch (+43 660 123 4567) einen Termin vereinbaren. Wir besprechen dann alle Details mit Ihnen.` : `Booking is easy: simply reach out via our contact form, by email (${SITE.email}) or by phone (+43 660 123 4567). We'll then go through all the details with you.`
    },
    {
      category: de ? 'Buchung & Vorbereitung' : 'Booking & Preparation',
      question: de ? 'Wie weit im Voraus sollte ich buchen?' : 'How far in advance should I book?',
      answer: de ? 'Wir empfehlen eine Buchung 2-4 Wochen im Voraus, besonders für Wochenendtermine. Für Newborn-Shootings am besten bereits während der Schwangerschaft.' : 'We recommend booking 2-4 weeks ahead, especially for weekend appointments. For newborn shoots, it\'s best to book while you\'re still expecting.'
    },
    {
      category: de ? 'Buchung & Vorbereitung' : 'Booking & Preparation',
      question: de ? 'Was soll ich zum Shooting anziehen?' : 'What should I wear to the shoot?',
      answer: de ? 'Wir empfehlen bequeme Kleidung, in der Sie sich wohlfühlen. Vermeiden Sie zu auffällige Muster oder Logos. Gerne beraten wir Sie vorab individuell per WhatsApp oder E-Mail mit konkreten Stylingtipps.' : 'Wear comfortable clothes you feel great in, and avoid loud patterns or logos. We\'re happy to share personalised styling tips beforehand via WhatsApp or email.'
    },
    {
      category: de ? 'Buchung & Vorbereitung' : 'Booking & Preparation',
      question: de ? 'Kann ich Requisiten oder besondere Wünsche mitbringen?' : 'Can I bring props or special requests?',
      answer: de ? 'Absolut! Lieblingsspielzeug, besondere Outfits oder persönliche Gegenstände machen die Fotos noch individueller. Teilen Sie uns Ihre Wünsche einfach vorab mit.' : 'Absolutely! Favourite toys, special outfits or personal keepsakes make your photos even more unique. Just let us know your ideas in advance.'
    },

    // During the Shooting
    {
      category: de ? 'Während des Shootings' : 'During the Shoot',
      question: de ? 'Wie lange dauert ein Shooting?' : 'How long does a shoot take?',
      answer: de ? 'Je nach Paket zwischen 20 und 90 Minuten. Bei Babys und Kindern planen wir immer etwas Puffer ein für Pausen, Stillen oder Wickeln.' : 'Between 20 and 90 minutes, depending on the package. With babies and children we always build in extra time for breaks, feeding or nappy changes.'
    },
    {
      category: de ? 'Während des Shootings' : 'During the Shoot',
      question: de ? 'Was ist, wenn mein Baby während des Shootings weint?' : 'What if my baby cries during the shoot?',
      answer: de ? 'Das ist völlig normal! Wir arbeiten geduldig und passen uns dem Rhythmus Ihres Babys an. Füttern, wickeln und kuscheln ist jederzeit möglich. Wir haben viel Erfahrung mit kleinen Kindern.' : 'Completely normal! We work patiently and follow your baby\'s rhythm. Feeding, changing and cuddle breaks are welcome at any time — we have plenty of experience with little ones.'
    },
    {
      category: de ? 'Während des Shootings' : 'During the Shoot',
      question: de ? 'Wo finden die Shootings statt?' : 'Where do the shoots take place?',
      answer: de ? 'Je nach Paket in unserem Studio in Wien oder an einem Outdoor-Location Ihrer Wahl (Parks, Stadtlocations etc.). Gerne beraten wir Sie zu den schönsten Foto-Spots in Wien.' : 'Depending on the package, either at our studio in Vienna or at an outdoor location of your choice (parks, city spots and more). We\'re happy to recommend Vienna\'s most photogenic locations.'
    },
    {
      category: de ? 'Während des Shootings' : 'During the Shoot',
      question: de ? 'Können mehrere Personen mit aufs Shooting kommen?' : 'Can more than one person join the shoot?',
      answer: de ? 'Natürlich! Familienmitglieder sind herzlich willkommen. Bei Business-Shootings empfehlen wir weniger Begleitung für mehr Konzentration.' : 'Of course! Family members are very welcome. For business shoots we recommend keeping company to a minimum so you can stay focused.'
    },

    // After the Shooting
    {
      category: de ? 'Nach dem Shooting' : 'After the Shoot',
      question: de ? 'Wann bekomme ich meine Bilder?' : 'When will I receive my photos?',
      answer: de ? 'Die fertig bearbeiteten Bilder erhalten Sie innerhalb von 10-14 Werktagen nach dem Shooting in Ihrer persönlichen Online-Galerie.' : 'Your fully edited photos will be ready in your personal online gallery within 10-14 business days of the shoot.'
    },
    {
      category: de ? 'Nach dem Shooting' : 'After the Shoot',
      question: de ? 'In welchem Format erhalte ich die Bilder?' : 'In what format will I receive the photos?',
      answer: de ? 'Sie erhalten alle Bilder in hoher Auflösung als JPG-Dateien, optimiert zum Ausdrucken und für digitale Nutzung (Social Media etc.).' : 'You\'ll receive all photos as high-resolution JPG files, optimised for both printing and digital use (social media and more).'
    },
    {
      category: de ? 'Nach dem Shooting' : 'After the Shoot',
      question: de ? 'Kann ich die Bilder selbst bearbeiten?' : 'Can I edit the photos myself?',
      answer: de ? 'Die Bilder sind bereits professionell bearbeitet. Weitere Anpassungen empfehlen wir nicht, da diese die Qualität beeinträchtigen können. Bei speziellen Wünschen sprechen Sie uns gerne an.' : 'Your photos come professionally edited. We don\'t recommend further adjustments, as they can compromise quality — but if you have special requests, just let us know.'
    },
    {
      category: de ? 'Nach dem Shooting' : 'After the Shoot',
      question: de ? 'Darf ich die Bilder auf Social Media teilen?' : 'Can I share the photos on social media?',
      answer: de ? 'Ja! Die Nutzungsrechte für private Zwecke sind im Preis enthalten. Wir freuen uns über eine Markierung (@newagefotografie) – ist aber keine Pflicht.' : 'Yes! Usage rights for personal purposes are included in the price. We\'d love a tag (@newagefotografie) — but it\'s entirely optional.'
    },
    {
      category: de ? 'Nach dem Shooting' : 'After the Shoot',
      question: de ? 'Kann ich zusätzliche Bilder bekommen?' : 'Can I order additional photos?',
      answer: de ? 'Ja, Sie können weitere bearbeitete Bilder für €20 pro Stück nachbestellen. Kontaktieren Sie uns einfach.' : 'Yes, additional edited photos are available for €20 each. Just get in touch.'
    },

    // Payment & Cancellation
    {
      category: de ? 'Zahlung & Stornierung' : 'Payment & Cancellation',
      question: de ? 'Wie kann ich bezahlen?' : 'How can I pay?',
      answer: de ? 'Wir akzeptieren Überweisung, Barzahlung vor Ort oder PayPal. Die Zahlung erfolgt in der Regel nach dem Shooting.' : 'We accept bank transfer, cash on site or PayPal. Payment is usually made after the shoot.'
    },
    {
      category: de ? 'Zahlung & Stornierung' : 'Payment & Cancellation',
      question: de ? 'Muss ich eine Anzahlung leisten?' : 'Do I need to pay a deposit?',
      answer: de ? 'Bei den meisten Paketen ist keine Anzahlung nötig. Bei größeren Projekten (Premium-Pakete, Hochzeiten) bitten wir um eine Anzahlung von 30%.' : 'Most packages require no deposit. For larger projects (premium packages, weddings) we ask for a 30% deposit.'
    },
    {
      category: de ? 'Zahlung & Stornierung' : 'Payment & Cancellation',
      question: de ? 'Was passiert bei schlechtem Wetter (Outdoor-Shooting)?' : 'What happens if the weather is bad (outdoor shoot)?',
      answer: de ? 'Bei Outdoor-Shootings können wir bei schlechtem Wetter kostenlos verschieben oder ins Studio wechseln – ganz wie Sie möchten.' : 'If the weather turns on an outdoor shoot, we can reschedule free of charge or move to the studio — whichever you prefer.'
    },
    {
      category: de ? 'Zahlung & Stornierung' : 'Payment & Cancellation',
      question: de ? 'Kann ich einen Termin stornieren oder verschieben?' : 'Can I cancel or reschedule an appointment?',
      answer: de ? 'Bis 48 Stunden vor dem Termin können Sie kostenlos verschieben. Bei kurzfristigeren Absagen behalten wir uns eine Stornogebühr von 50% vor.' : 'You can reschedule free of charge up to 48 hours before your appointment. For later cancellations, we reserve the right to charge a 50% cancellation fee.'
    },

    // Vouchers
    {
      category: de ? 'Gutscheine' : 'Gift Vouchers',
      question: de ? 'Wie funktionieren die Fotoshooting-Gutscheine?' : 'How do the photo shoot vouchers work?',
      answer: de ? 'Gutscheine können für einen bestimmten Betrag oder ein spezifisches Paket erworben werden. Sie sind 3 Jahre gültig und können für alle unsere Leistungen eingelöst werden.' : 'Vouchers can be purchased for a set amount or a specific package. They\'re valid for 3 years and can be redeemed against any of our services.'
    },
    {
      category: de ? 'Gutscheine' : 'Gift Vouchers',
      question: de ? 'Kann ich einen Gutschein verschenken?' : 'Can I give a voucher as a gift?',
      answer: de ? 'Ja! Gutscheine sind das perfekte Geschenk. Wir senden Ihnen den Gutschein schön gestaltet per E-Mail zu – ideal zum Ausdrucken oder digitalen Verschicken.' : 'Yes! Vouchers make the perfect gift. We\'ll send you a beautifully designed voucher by email — ideal for printing or forwarding digitally.'
    },

    // Special Cases
    {
      category: de ? 'Spezielle Anliegen' : 'Special Requests',
      question: de ? 'Fotografiert ihr auch bei uns zu Hause?' : 'Do you also shoot at our home?',
      answer: de ? 'Ja! Besonders bei Newborn-Shootings kommen wir gerne zu Ihnen nach Hause. Dies ist bei den meisten Paketen als Alternative zum Studio möglich.' : 'Yes! Especially for newborn shoots, we\'re happy to come to your home. Most packages offer this as an alternative to the studio.'
    },
    {
      category: de ? 'Spezielle Anliegen' : 'Special Requests',
      question: de ? 'Bietet ihr auch Fotoshootings für größere Gruppen an?' : 'Do you offer shoots for larger groups?',
      answer: de ? 'Ja, wir fotografieren auch größere Familien, Freundesgruppen oder Firmenevents. Kontaktieren Sie uns für ein individuelles Angebot.' : 'Yes, we also photograph larger families, groups of friends and company events. Contact us for a tailored quote.'
    },
    {
      category: de ? 'Spezielle Anliegen' : 'Special Requests',
      question: de ? 'Macht ihr auch Hochzeitsfotografie?' : 'Do you do wedding photography?',
      answer: de ? 'Ja! Wir bieten Hochzeitsfotografie mit verschiedenen Paketen an. Kontaktieren Sie uns für eine persönliche Beratung und ein individuelles Angebot.' : 'Yes! We offer wedding photography with a range of packages. Get in touch for a personal consultation and a tailored quote.'
    },
    {
      category: de ? 'Spezielle Anliegen' : 'Special Requests',
      question: de ? 'Fotografiert ihr auch Haustiere?' : 'Do you photograph pets?',
      answer: de ? 'Haustiere sind bei Familien-Shootings herzlich willkommen! Reine Tierfotografie bieten wir aktuell nicht an.' : 'Pets are very welcome at family shoots! We don\'t currently offer dedicated pet photography.'
    }
  ];

  const categories = Array.from(new Set(faqData.map(item => item.category)));

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <Layout>
      <SEOHead
        title={`FAQ - Häufige Fragen | ${SITE.name}`}
        description={`Antworten auf Ihre Fragen zu Fotoshootings bei ${SITE.name} Wien. Ablauf, Preise, Termine und mehr.`}
        keywords="FAQ Fotoshooting, Fragen Fotograf Wien, Fotoshooting Ablauf"
        canonical="/faq/"
      />
      
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
                <a
                  href="tel:+436601234567"
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-purple-700 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  +43 660 123 4567
                </a>
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
      <PillarLinksBlock currentPath="/faq/" title={de ? 'Alle Fotoshootings in Wien' : 'All Photo Shoots in Vienna'} />
    </Layout>
  );
};

export default FAQPage;
