import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, User, Phone, Mail, MapPin, Camera,
  Scale, Shield, FileText, ExternalLink
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { SEOHead } from '../../components/SEO/SEOHead';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

const ImpressumPage: React.FC = () => {
  const { language } = useLanguage();
  const de = language === 'de';

  return (
    <Layout>
      <SEOHead
        title={`Impressum & Datenschutz | ${SITE.name}`}
        description={`Impressum und Datenschutzerklärung von ${SITE.name} in Wien. Rechtliche Informationen, Kontaktdaten und Datenschutzhinweise.`}
        keywords={`Impressum ${SITE.name}, Datenschutz Fotograf Wien, Rechtliche Informationen`}
        canonical="/impressum/"
      />

      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-700 to-pink-600 text-white py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{de ? 'Impressum & Datenschutz' : 'Legal Notice & Privacy'}</h1>
            <p className="text-xl text-purple-100 max-w-2xl">
              {de
                ? `Rechtliche Informationen und Datenschutzerklärung von ${SITE.name}`
                : `Legal information and privacy policy of ${SITE.name}`}
            </p>
            {!de && (
              <p className="text-sm text-purple-200 mt-3 max-w-2xl">
                English translation for convenience — the legally binding version is the German original.
              </p>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto space-y-12">

            {/* Impressum Section */}
            <section className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center mb-6">
                <Building2 className="w-8 h-8 text-purple-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">{de ? 'Impressum' : 'Legal Notice'}</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Company Info */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Building2 className="w-5 h-5 mr-2 text-purple-500" />
                      {de ? 'Unternehmensname' : 'Company name'}
                    </h3>
                    <p className="text-gray-700">{SITE.name}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <User className="w-5 h-5 mr-2 text-purple-500" />
                      {de ? 'Inhaber' : 'Owner'}
                    </h3>
                    <p className="text-gray-700">Simon Parrott</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Phone className="w-5 h-5 mr-2 text-purple-500" />
                      {de ? 'Telefon' : 'Phone'}
                    </h3>
                    <a
                      href={`tel:+${SITE.phone.replace(/[^0-9]/g,'')}`}
                      className="text-purple-600 hover:text-purple-700 transition-colors"
                    >
                      {SITE.phone}
                    </a>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Mail className="w-5 h-5 mr-2 text-purple-500" />
                      {de ? 'E-Mail' : 'Email'}
                    </h3>
                    <a
                      href={`mailto:${SITE.email}`}
                      className="text-purple-600 hover:text-purple-700 transition-colors"
                    >
                      {SITE.email}
                    </a>
                  </div>
                </div>

                {/* Business Registration */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">GLN (Global Location Number)</h3>
                    <p className="text-gray-700 font-mono">9110013674127</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{de ? 'GISA-Zahl' : 'GISA number'}</h3>
                    <p className="text-gray-700 font-mono">35529712</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{de ? 'Berechtigungen' : 'Authorisations'}</h3>
                    <p className="text-gray-700">LI Berufsfotografie</p>
                    <p className="text-gray-700">Berufsfotograf</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{de ? 'Gewerberechtliche Geschäftsführung' : 'Managing director (trade law)'}</h3>
                    <p className="text-gray-700">—</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Addresses Section */}
            <section className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center mb-6">
                <MapPin className="w-8 h-8 text-purple-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">{de ? 'Adressen' : 'Addresses'}</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-purple-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Camera className="w-5 h-5 mr-2 text-purple-500" />
                    {de ? 'Studioadresse' : 'Studio address'}
                  </h3>
                  <p className="text-gray-700 text-sm mb-2 italic">
                    {de ? '(Eingang Ecke Schönbrunnerstraße)' : '(Entrance on the corner of Schönbrunnerstraße)'}
                  </p>
                  <address className="text-gray-700 not-italic">
                    Wehrgasse 11A / 2+5<br />
                    1050 {de ? 'Wien' : 'Vienna'}<br />
                    {de ? 'Österreich' : 'Austria'}
                  </address>
                  <a
                    href="https://maps.google.com/?q=Wehrgasse+11A,+1050+Wien"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center mt-3 text-purple-600 hover:text-purple-700 text-sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    {de ? 'Auf Google Maps anzeigen' : 'View on Google Maps'}
                  </a>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-purple-500" />
                    {de ? 'Büro & Korrespondenzadresse' : 'Office & correspondence address'}
                  </h3>
                  <address className="text-gray-700 not-italic">
                    Julius-Tandler-Platz 5 / 13<br />
                    1090 {de ? 'Wien' : 'Vienna'}<br />
                    {de ? 'Österreich' : 'Austria'}
                  </address>
                </div>
              </div>
            </section>

            {/* Business Subject */}
            <section className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center mb-6">
                <Camera className="w-8 h-8 text-purple-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">{de ? 'Unternehmensgegenstand' : 'Business activity'}</h2>
              </div>
              <p className="text-gray-700">
                {de
                  ? 'Fotografie, insbesondere Familien-, Baby-, Portrait- und Businessfotografie.'
                  : 'Photography, in particular family, baby, portrait and business photography.'}
              </p>
            </section>

            {/* Disclaimer */}
            <section className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center mb-6">
                <Scale className="w-8 h-8 text-purple-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">{de ? 'Haftungsausschluss' : 'Disclaimer'}</h2>
              </div>
              <p className="text-gray-700">
                {de
                  ? 'Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für externe Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.'
                  : 'Despite careful review of the content, we accept no liability for external links. The operators of the linked pages are solely responsible for their content.'}
              </p>
            </section>

            {/* Copyright */}
            <section className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center mb-6">
                <FileText className="w-8 h-8 text-purple-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">{de ? 'Urheberrecht' : 'Copyright'}</h2>
              </div>
              <p className="text-gray-700">
                {de
                  ? `Die auf dieser Website veröffentlichten Inhalte und Bilder unterliegen dem österreichischen Urheberrecht. Eine Verwendung außerhalb der Grenzen des Urheberrechts bedarf der vorherigen schriftlichen Zustimmung von ${SITE.name}.`
                  : `The content and images published on this website are subject to Austrian copyright law. Any use beyond the limits of copyright law requires the prior written consent of ${SITE.name}.`}
              </p>
            </section>

            {/* Privacy Policy */}
            <section className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center mb-6">
                <Shield className="w-8 h-8 text-purple-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">{de ? 'Datenschutzerklärung' : 'Privacy Policy'}</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{de ? 'Allgemeines' : 'General'}</h3>
                  <p className="text-gray-700">
                    {de
                      ? 'Der Schutz Ihrer persönlichen Daten ist uns ein besonderes Anliegen. Wir verarbeiten Ihre Daten ausschließlich auf Grundlage der gesetzlichen Bestimmungen (DSGVO, TKG 2003).'
                      : 'The protection of your personal data is of particular importance to us. We process your data exclusively on the basis of the statutory provisions (GDPR, Austrian Telecommunications Act 2003).'}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{de ? 'Kontakt mit uns' : 'Contacting us'}</h3>
                  <p className="text-gray-700">
                    {de
                      ? 'Wenn Sie per Formular, E-Mail, Telefon oder WhatsApp Kontakt mit uns aufnehmen, werden Ihre angegebenen Daten zur Bearbeitung der Anfrage und für den Fall von Anschlussfragen gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.'
                      : 'If you contact us via form, email, phone or WhatsApp, the data you provide is stored in order to process your enquiry and in case of any follow-up questions. We do not pass this data on without your consent.'}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{de ? 'Speicherung von Kundendaten' : 'Storage of customer data'}</h3>
                  <p className="text-gray-700">
                    {de
                      ? 'Im Rahmen unserer fotografischen Dienstleistungen verarbeiten wir personenbezogene Daten (z. B. Name, E-Mail-Adresse, Rechnungsdaten sowie Bilddaten), soweit dies zur Vertragserfüllung erforderlich ist.'
                      : 'As part of our photography services, we process personal data (e.g. name, email address, billing data as well as image data) insofar as this is necessary for the performance of the contract.'}
                  </p>
                  <p className="text-gray-700 mt-2">
                    {de
                      ? 'Bilddaten werden nur mit ausdrücklicher Einwilligung für Galerie-, Website- oder Portfoliozwecke verwendet.'
                      : 'Image data is used for gallery, website or portfolio purposes only with your express consent.'}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{de ? 'Ihre Rechte' : 'Your rights'}</h3>
                  <p className="text-gray-700 mb-3">
                    {de ? 'Ihnen stehen grundsätzlich folgende Rechte zu:' : 'You are generally entitled to the following rights:'}
                  </p>
                  <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(de
                      ? ['Auskunft', 'Berichtigung', 'Löschung', 'Einschränkung', 'Datenübertragbarkeit', 'Widerruf und Widerspruch']
                      : ['Access', 'Rectification', 'Erasure', 'Restriction', 'Data portability', 'Withdrawal and objection']
                    ).map((right) => (
                      <li key={right} className="flex items-center text-gray-700">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                        {right}
                      </li>
                    ))}
                  </ul>
                  <p className="text-gray-700 mt-4">
                    {de
                      ? 'Wenn Sie glauben, dass die Verarbeitung Ihrer Daten gegen das Datenschutzrecht verstößt, haben Sie das Recht, sich bei der Datenschutzbehörde zu beschweren.'
                      : 'If you believe that the processing of your data infringes data protection law, you have the right to lodge a complaint with the data protection authority.'}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{de ? 'Widerruf von Einwilligungen' : 'Withdrawal of consent'}</h3>
                  <p className="text-gray-700">
                    {de ? 'Eine erteilte Einwilligung zur Verwendung von Fotos kann jederzeit mit Wirkung für die Zukunft per E-Mail an' : 'A consent granted for the use of photos can be withdrawn at any time with effect for the future by email to'}{' '}
                    <a
                      href={`mailto:${SITE.email}`}
                      className="text-purple-600 hover:text-purple-700"
                    >
                      {SITE.email}
                    </a>{' '}
                    {de ? 'widerrufen werden.' : '.'}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{de ? 'Datensicherheit' : 'Data security'}</h3>
                  <p className="text-gray-700">
                    {de
                      ? 'Wir treffen angemessene technische und organisatorische Maßnahmen, um Ihre personenbezogenen Daten vor Verlust, Missbrauch oder unbefugtem Zugriff zu schützen.'
                      : 'We take appropriate technical and organisational measures to protect your personal data against loss, misuse or unauthorised access.'}
                  </p>
                </div>
              </div>
            </section>

            {/* Contact CTA */}
            <section className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl shadow-lg p-8 text-white text-center">
              <h2 className="text-2xl font-bold mb-4">{de ? 'Fragen?' : 'Questions?'}</h2>
              <p className="mb-6 text-purple-100">
                {de
                  ? 'Bei Fragen zu unseren rechtlichen Informationen oder zum Datenschutz kontaktieren Sie uns gerne.'
                  : 'If you have any questions about our legal information or data protection, please feel free to contact us.'}
              </p>
              <Link
                to="/kontakt"
                className="inline-block bg-white text-purple-600 px-8 py-3 rounded-full font-semibold hover:bg-purple-50 transition-colors"
              >
                {de ? 'Kontakt aufnehmen' : 'Get in touch'}
              </Link>
            </section>

          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ImpressumPage;
