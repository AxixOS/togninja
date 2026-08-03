import { SEOHead } from '../../components/SEO/SEOHead';
import { ServiceSchema } from '../../components/SEO/ServiceSchema';
import { RelatedServices } from '../../components/SEO/RelatedServices';
import { PillarGuides } from '../../components/SEO/PillarGuides';
import { ReviewsBlock } from '../../components/SEO/ReviewsBlock';
import Layout from '../../components/layout/Layout';
import GoogleReviews from '../../components/layout/GoogleReviews';
import MarkdownCopySlot from '../../components/MarkdownCopySlot';
import { newageCopyMap } from '../../content/newageCopyMap';
import { Link } from 'react-router-dom';
import { GraduationCap, School, Users, Camera, Star, ArrowRight, Check, Clock, Mail, Building2, Shield, CalendarDays } from 'lucide-react';
import { useManualPageContent, useManualPageData } from '../../hooks/useManualPageContent';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

// This pillar is enquiry-led (schools, graduating classes and universities book
// directly – there is no voucher SKU), so every "Request a quote" CTA sends the
// visitor to the contact page rather than the cart.
export default function SchulfotografieWienPage() {
  const { data: manualPage } = useManualPageData('schulfotografie');
  // Images are the same in every language, so they use the cross-language helper
  // (falls back to whatever was uploaded, regardless of the language it was
  // saved under). Text uses `fromManual` below, which is current-language only.
  const tShared = useManualPageContent('schulfotografie');
  const { language } = useLanguage();
  const de = language === 'de';

  const fallbacks = {
    en: {
      heroTitle: 'School, College & University Photography in Vienna',
      heroSubtitle: 'Portraits a whole year group is proud of.',
      heroDescription: `From class photos and individual school portraits to Matura and graduation shoots for colleges and universities – ${SITE.name} photographs pupils, students and staff on location or in our Vienna studio. Relaxed direction, fast turnaround and a private online gallery for every family.`,
      primaryCta: 'Request a school shoot',
      secondaryCta: 'Talk to us',
    },
    de: {
      heroTitle: 'Schul-, Hochschul- & Universitätsfotografie in Wien',
      heroSubtitle: 'Portraits, auf die ein ganzer Jahrgang stolz ist.',
      heroDescription: `Von Klassenfotos und einzelnen Schulportraits bis zu Matura- und Sponsionsshootings für Schulen, Hochschulen und Universitäten – ${SITE.name} fotografiert Schüler:innen, Studierende und Lehrende vor Ort oder im Studio in Wien. Entspannte Anleitung, schnelle Lieferung und eine private Online-Galerie für jede Familie.`,
      primaryCta: 'Schul-Shooting anfragen',
      secondaryCta: 'Kontakt aufnehmen',
    },
  } as const;

  const fb = fallbacks[language] || fallbacks.de;

  // Only apply manual overrides published for the CURRENT language. This keeps
  // the language switch honest: an English visitor sees the built-in English
  // copy below (never the German-authored overrides) until an English override
  // is explicitly published, and vice-versa.
  const fromManual = (key: string, fallback: string) => {
    const value = manualPage?.publishedContent?.[key];
    return typeof value === 'string' && value.trim() ? value : fallback;
  };

  // Language-agnostic: use the uploaded image from EITHER language (studios upload
  // hero photos once, usually under German, and they should show on both).
  const fromManualImage = (key: string) => {
    const value = tShared(key);
    return value && value !== key ? value : '';
  };

  const heroTitle = fromManual('manual.schulfotografie.heroTitle', fb.heroTitle);
  const heroSubtitle = fromManual('manual.schulfotografie.heroTagline', fb.heroSubtitle);
  const heroDescription = fromManual('manual.schulfotografie.heroDescription', fb.heroDescription);
  const primaryCta = fromManual('manual.schulfotografie.primaryCta', fb.primaryCta);
  const secondaryCta = fromManual('manual.schulfotografie.secondaryCta', fb.secondaryCta);
  const heroImage1 = fromManualImage('manual.schulfotografie.heroImage1');
  const heroImage2 = fromManualImage('manual.schulfotografie.heroImage2');
  const heroImage3 = fromManualImage('manual.schulfotografie.heroImage3');
  const heroImage4 = fromManualImage('manual.schulfotografie.heroImage4');
  const heroImage5 = fromManualImage('manual.schulfotografie.heroImage5');

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        <SEOHead
          title={newageCopyMap['schul-und-hochschulfotografie-wien'].title}
          description={newageCopyMap['schul-und-hochschulfotografie-wien'].metaDescription}
          keywords="schulfotografie wien, klassenfotos wien, maturafotos wien, sponsionsfotos wien, universitätsfotograf wien, abschlussfotos wien"
          canonical="/schul-und-hochschulfotografie-wien/"
          ogImage={`${SITE.url}/images/business-hero.jpg`}
          hreflang={[
            { lang: 'de', url: '/schul-und-hochschulfotografie-wien/' },
            { lang: 'en', url: '/en/school-university-photography-vienna/' },
          ]}
        />
        <ServiceSchema
          serviceName={newageCopyMap['schul-und-hochschulfotografie-wien'].h1}
          description={newageCopyMap['schul-und-hochschulfotografie-wien'].metaDescription}
          url="/schul-und-hochschulfotografie-wien/"
          serviceType="PhotographyService"
        />

        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pt-24 pb-16">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-pink-900/20"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{heroTitle}</h1>
                <p className="text-xl text-gray-300 mb-4 leading-relaxed font-semibold">{heroSubtitle}</p>
                <p className="text-lg text-gray-400 mb-8 leading-relaxed">{heroDescription}</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    to="/kontakt"
                    className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg"
                  >
                    <Mail className="mr-2 h-5 w-5" />
                    {primaryCta}
                  </Link>
                  <Link
                    to="/kontakt"
                    className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg"
                  >
                    {secondaryCta}
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <img
                    src={heroImage1}
                    alt="Schulfotografie Wien – professionelle Klassenfotos und Schulportraits"
                    className="rounded-2xl shadow-2xl w-full h-auto object-contain"
                    loading="eager"
                  />
                </div>
                <div>
                  <img
                    src={heroImage2}
                    alt="Maturafotos Wien – Abschlussfotos für Schulen und Kollegs"
                    className="rounded-xl shadow-lg w-full h-auto object-contain"
                    loading="eager"
                  />
                </div>
                <div>
                  <img
                    src={heroImage3}
                    alt="Sponsionsfotos Wien – Universitäts- und Hochschulabschluss im Studio"
                    className="rounded-xl shadow-lg w-full h-auto object-contain"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Google Reviews Section */}
        <GoogleReviews />

        {/* Introduction Section */}
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="prose prose-lg max-w-none">
                <p className="text-lg text-gray-700 leading-relaxed">
                  {de
                    ? `Willkommen bei ${SITE.name} – Ihrem Partner für Schul-, Hochschul- und Universitätsfotografie in Wien. Ob Klassenfotos zum Schuljahresende, einzelne Schulportraits, Matura-Shootings oder die Sponsion an der Uni: Wir organisieren den Fototag reibungslos, fotografieren zügig und liefern jedem Kind bzw. jeder Familie eine private Online-Galerie.`
                    : `Welcome to ${SITE.name} – your partner for school, college and university photography in Vienna. Whether it's end-of-year class photos, individual school portraits, Matura shoots or a university graduation: we organise the photo day smoothly, shoot efficiently and give every child or family a private online gallery.`}
                </p>
                <p className="text-lg text-gray-700 leading-relaxed mt-4">
                  {de
                    ? 'Wir kommen mit unserem mobilen Studio in Ihre Schule oder Hochschule – oder Sie besuchen uns in unserem Studio in Wien 5. Kein Abo, kein Verkaufsdruck: Familien bestellen frei, was sie möchten.'
                    : 'We bring our mobile studio to your school or university – or you visit us at our studio in Vienna\'s 5th district. No subscriptions, no pressure to buy: families order freely what they want.'}
                </p>
                <p className="text-base text-gray-600 leading-relaxed mt-4">
                  {de ? (
                    <>
                      Passend dazu bieten wir auch{' '}
                      <Link to="/business-portrait-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Business Portrait Wien</Link>,{' '}
                      <Link to="/bewerbungsfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Bewerbungsfotos Wien</Link>,{' '}
                      <Link to="/teamfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Teamfotos Wien</Link> und{' '}
                      <Link to="/eventfotografie-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Eventfotografie Wien</Link> an.
                    </>
                  ) : (
                    <>
                      We also offer{' '}
                      <Link to="/business-portrait-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">business portraits Vienna</Link>,{' '}
                      <Link to="/bewerbungsfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">application photos Vienna</Link>,{' '}
                      <Link to="/teamfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">team photos Vienna</Link> and{' '}
                      <Link to="/eventfotografie-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">event photography Vienna</Link>.
                    </>
                  )}
                </p>
              </div>
              <div>
                <img
                  src={heroImage4}
                  alt="Schulfotograf Wien – natürliche Portraits von Schüler:innen und Studierenden"
                  className="rounded-2xl shadow-lg w-full h-auto object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Extended Content Section - Safe Copy Slot */}
        {de && <MarkdownCopySlot content={newageCopyMap['schul-und-hochschulfotografie-wien'].markdown} />}

        {/* What we offer – three enquiry-led segments */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {de ? 'Unser Angebot für Bildung' : 'Our Offering for Education'}
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {de
                  ? 'Ein Anbieter für den ganzen Bildungsweg – von der ersten Klasse bis zur Sponsion. Jedes Paket wird individuell nach Gruppengröße und Wünschen erstellt.'
                  : 'One provider for the whole educational journey – from first grade to graduation. Every package is quoted individually by group size and requirements.'}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Schools */}
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow flex flex-col">
                <School className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{de ? 'Schulen & Kindergärten' : 'Schools & Kindergartens'}</h3>
                <ul className="space-y-3 mb-6 flex-1">
                  {(de
                    ? ['Klassenfotos & Gruppenbilder', 'Einzelne Schulportraits', 'Geschwister-Kombis', 'Private Galerie je Familie, freie Bestellung']
                    : ['Class & group photos', 'Individual school portraits', 'Sibling combinations', 'Private gallery per family, order freely']
                  ).map((item) => (
                    <li key={item} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/kontakt"
                  className="block w-full text-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
                >
                  {de ? 'Angebot anfragen' : 'Request a quote'}
                </Link>
              </div>

              {/* Matura / graduation – highlighted */}
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl shadow-2xl p-8 sm:scale-105 relative flex flex-col">
                <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-2 rounded-bl-lg rounded-tr-2xl">
                  {de ? 'BELIEBT' : 'POPULAR'}
                </div>
                <GraduationCap className="h-10 w-10 text-yellow-300 mb-4 mt-2" />
                <h3 className="text-2xl font-bold mb-3">{de ? 'Matura & Abschluss' : 'Matura & Graduation'}</h3>
                <ul className="space-y-3 mb-6 flex-1">
                  {(de
                    ? ['Jahrgangs- & Maturafotos', 'Abschlussportraits mit Talar', 'Kreative Gruppenshootings', 'Schnelle Lieferung vor der Feier']
                    : ['Year-group & Matura photos', 'Graduation portraits with gown', 'Creative group shoots', 'Fast delivery before the ceremony']
                  ).map((item) => (
                    <li key={item} className="flex items-start">
                      <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/kontakt"
                  className="block w-full text-center px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                >
                  {de ? 'Angebot anfragen' : 'Request a quote'}
                </Link>
              </div>

              {/* Universities */}
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow flex flex-col">
                <Building2 className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{de ? 'Hochschule & Universität' : 'College & University'}</h3>
                <ul className="space-y-3 mb-6 flex-1">
                  {(de
                    ? ['Sponsions- & Promotionsfotos', 'Einzel- & Familienportraits zur Feier', 'Fakultäts- & Institutsteams', 'Studio oder vor Ort am Campus']
                    : ['Graduation & doctoral photos', 'Individual & family portraits at the ceremony', 'Faculty & department teams', 'Studio or on campus']
                  ).map((item) => (
                    <li key={item} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/kontakt"
                  className="block w-full text-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
                >
                  {de ? 'Angebot anfragen' : 'Request a quote'}
                </Link>
              </div>
            </div>

            {/* Institution note */}
            <div className="bg-white rounded-xl p-6 mt-8 border-2 border-purple-100">
              <div className="flex items-start">
                <Shield className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">{de ? 'Für Schulen & Institutionen:' : 'For schools & institutions:'}</p>
                  <p className="text-gray-600">
                    {de
                      ? 'DSGVO-konforme Abwicklung, Einverständniserklärungen und passwortgeschützte Galerien. Angebot nach Klassen-/Gruppenanzahl – schreiben Sie uns kurz Ihre Eckdaten.'
                      : 'GDPR-compliant handling, consent forms and password-protected galleries. Quoted by number of classes/groups – just send us the key details.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {heroImage5 && (
              <div className="mb-12">
                <img
                  src={heroImage5}
                  alt="Ablauf Schulfotografie Wien – organisierter Fototag mit mobilem Studio"
                  className="rounded-2xl shadow-lg w-full h-auto object-contain"
                  loading="lazy"
                />
              </div>
            )}
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{de ? 'Ablauf – organisiert & entspannt' : 'Process – Organised & Relaxed'}</h2>
            <div className="grid md:grid-cols-5 gap-6">
              {[
                { icon: Mail, t: de ? 'Anfrage' : 'Enquiry', d: de ? 'Sie schildern Schule, Klassenanzahl & Wunschtermin' : 'You tell us the school, class count & preferred date' },
                { icon: CalendarDays, t: de ? 'Planung' : 'Planning', d: de ? 'Fixer Zeitplan, Ablauf & Einverständnis-Formulare' : 'Fixed schedule, flow & consent forms' },
                { icon: Camera, t: de ? 'Fototag' : 'Photo day', d: de ? 'Mobiles Studio vor Ort – zügig & freundlich' : 'Mobile studio on site – swift & friendly' },
                { icon: Users, t: de ? 'Galerie' : 'Gallery', d: de ? 'Private Online-Galerie je Familie' : 'Private online gallery per family' },
                { icon: Clock, t: de ? 'Lieferung' : 'Delivery', d: de ? 'Freie Bestellung, schnelle Ausarbeitung' : 'Free ordering, fast fulfilment' },
              ].map((s, i) => (
                <div key={s.t} className="text-center">
                  <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-purple-600">{i + 1}</span>
                  </div>
                  <h3 className="font-semibold mb-2 text-gray-900 flex items-center justify-center gap-2">
                    <s.icon className="h-4 w-4 text-purple-600" />{s.t}
                  </h3>
                  <p className="text-gray-600 text-sm">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">{fromManual('manual.schulfotografie.faqHeading', 'FAQ')}</h2>
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.schulfotografie.faqQ1', de ? 'Kommen Sie in unsere Schule?' : 'Do you come to our school?')}</h3>
                <p className="text-gray-600">{fromManual('manual.schulfotografie.faqA1', de ? 'Ja. Wir bringen ein mobiles Studio mit und fotografieren direkt bei Ihnen vor Ort in Wien und Umgebung. Alternativ ist ein Termin im Studio möglich.' : 'Yes. We bring a mobile studio and photograph on site in Vienna and the surrounding area. Alternatively, an appointment at the studio is possible.')}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.schulfotografie.faqQ2', de ? 'Wie läuft die Bestellung für Eltern?' : 'How does ordering work for parents?')}</h3>
                <p className="text-gray-600">{fromManual('manual.schulfotografie.faqA2', de ? 'Jede Familie erhält einen privaten, passwortgeschützten Galerielink und bestellt frei, was sie möchte – kein Kaufzwang, keine Vorauszahlung.' : 'Each family receives a private, password-protected gallery link and orders freely – no obligation to buy, no prepayment.')}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.schulfotografie.faqQ3', de ? 'Wie ist es mit Datenschutz & DSGVO?' : 'What about data protection & GDPR?')}</h3>
                <p className="text-gray-600">{fromManual('manual.schulfotografie.faqA3', de ? 'Wir arbeiten DSGVO-konform: Einverständniserklärungen, passwortgeschützte Galerien und Löschung nach Ablauf der vereinbarten Frist.' : 'We work GDPR-compliant: consent forms, password-protected galleries and deletion after the agreed period.')}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.schulfotografie.faqQ4', de ? 'Was kostet ein Schul- oder Sponsionsshooting?' : 'What does a school or graduation shoot cost?')}</h3>
                <p className="text-gray-600">{fromManual('manual.schulfotografie.faqA4', de ? 'Der Preis richtet sich nach Klassen-/Gruppenanzahl und Umfang. Senden Sie uns kurz Ihre Eckdaten und Sie erhalten ein individuelles Angebot.' : 'Pricing depends on the number of classes/groups and scope. Send us the key details and you\'ll receive an individual quote.')}</p>
              </div>
            </div>
          </div>
        </section>

        <ReviewsBlock />
        <PillarGuides pillar="/schul-und-hochschulfotografie-wien/" />
        <RelatedServices currentPath="/schul-und-hochschulfotografie-wien/" />

        {/* Compact internal link block */}
        <section className="py-12 bg-gray-50 border-t border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              {de ? 'Weitere Fotoshootings' : 'More Photo Shoots'}
            </h3>
            <ul className="grid sm:grid-cols-2 gap-3 mb-6 max-w-2xl mx-auto">
              <li>
                <Link to="/business-portrait-wien/" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                  {de ? 'Business Portrait Wien' : 'Business Portraits Vienna'}
                </Link>
              </li>
              <li>
                <Link to="/bewerbungsfotos-wien/" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                  {de ? 'Bewerbungsfotos Wien' : 'Application Photos Vienna'}
                </Link>
              </li>
              <li>
                <Link to="/teamfotos-wien/" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                  {de ? 'Teamfotos Wien' : 'Team Photos Vienna'}
                </Link>
              </li>
              <li>
                <Link to="/eventfotografie-wien/" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                  {de ? 'Eventfotografie Wien' : 'Event Photography Vienna'}
                </Link>
              </li>
            </ul>
            <p className="text-center text-gray-700">
              <Link to="/kontakt" className="text-purple-700 hover:text-purple-900 font-semibold underline underline-offset-2">
                {de ? 'Kontakt & Beratung' : 'Contact & advice'}
              </Link>
            </p>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {de ? 'Planen Sie einen Fototag für Ihre Klasse oder Ihren Jahrgang?' : 'Planning a photo day for your class or year group?'}
            </h2>
            <p className="text-xl mb-8 opacity-90">
              {de ? 'Schreiben Sie uns – wir erstellen ein individuelles Angebot.' : 'Get in touch – we\'ll prepare an individual quote.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/kontakt"
                className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg"
              >
                <Mail className="mr-2 h-5 w-5" />
                {primaryCta}
              </Link>
              <Link
                to="/kontakt"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg"
              >
                {secondaryCta}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
