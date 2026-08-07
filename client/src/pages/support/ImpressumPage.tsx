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
  const { language, t } = useLanguage();
  const de = language === 'de';

  // Legal identity is unique to each studio and jurisdiction — an Austrian GISA
  // number means nothing to a UK studio, and publishing another company's owner,
  // registration numbers and address as your own is a legal problem, not a
  // branding one. Every field below is studio-supplied (editable in Website
  // Studio) with an EMPTY default, and each block renders only once filled in.
  const legal = (key: string): string => {
    const value = t(key);
    return value && value !== key ? value.trim() : '';
  };
  const owner = legal('legal.owner');
  const registration = legal('legal.registration');
  const authorisations = legal('legal.authorisations');
  const postalAddress = legal('legal.postalAddress');
  const jurisdiction = legal('legal.jurisdiction');
  const businessActivity = legal('legal.businessActivity');

  const studioAddress = [SITE.address.street, SITE.address.postalCode, SITE.address.city, SITE.address.country]
    .filter(Boolean);
  const studioLangIsGerman = (SITE.lang || '').toLowerCase().startsWith('de');

  // Nothing legally identifying configured at all — say so plainly rather than
  // publish an empty notice that looks complete.
  const legalConfigured = Boolean(owner || registration || studioAddress.length || postalAddress);

  return (
    <Layout>
      <SEOHead
        title={`${de ? 'Impressum & Datenschutz' : 'Legal Notice & Privacy'} | ${SITE.name}`}
        description={
          de
            ? `Impressum und Datenschutzerklärung von ${SITE.name}. Rechtliche Informationen, Kontaktdaten und Datenschutzhinweise.`
            : `Legal notice and privacy policy of ${SITE.name}. Legal information, contact details and privacy notices.`
        }
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
            {/* Only meaningful when the studio's OWN legal text is the German one.
                Shown unconditionally, it told a UK studio's visitors that a German
                original they do not have is the binding version. */}
            {!de && studioLangIsGerman && (
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

                  {owner && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <User className="w-5 h-5 mr-2 text-purple-500" />
                        {de ? 'Inhaber' : 'Owner'}
                      </h3>
                      <p className="text-gray-700">{owner}</p>
                    </div>
                  )}

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

                {/* Registration details — free text, because what must appear here is
                    jurisdiction-specific (GLN/GISA in Austria, a company number and
                    VAT number in the UK, and so on). Previously hardcoded to one
                    studio's Austrian GLN, GISA number and trade authorisations. */}
                <div className="space-y-4">
                  {registration && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {de ? 'Unternehmensdaten' : 'Company registration'}
                      </h3>
                      <p className="text-gray-700 whitespace-pre-line">{registration}</p>
                    </div>
                  )}

                  {authorisations && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{de ? 'Berechtigungen' : 'Authorisations'}</h3>
                      <p className="text-gray-700 whitespace-pre-line">{authorisations}</p>
                    </div>
                  )}
                </div>
              </div>

              {!legalConfigured && (
                <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  {de
                    ? 'Diese Seite ist noch nicht ausgefüllt. Tragen Sie Ihre gesetzlich erforderlichen Angaben (Inhaber, Unternehmensdaten, Adresse) im Website Studio ein, bevor Sie die Website veröffentlichen.'
                    : 'This page has not been completed yet. Enter your legally required details (owner, company registration, address) in Website Studio before publishing your site.'}
                </div>
              )}
            </section>

            {/* Addresses Section */}
            <section className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center mb-6">
                <MapPin className="w-8 h-8 text-purple-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">{de ? 'Adressen' : 'Addresses'}</h2>
              </div>

              {/* Both addresses were hardcoded to this studio's Vienna premises
                  (Wehrgasse 11A/2+5 and Julius-Tandler-Platz 5/13), including the
                  entrance directions and a Maps link. Studio address now comes from
                  the studio's own configured address; the correspondence address is
                  free text, and both blocks disappear when empty. */}
              <div className="grid md:grid-cols-2 gap-8">
                {studioAddress.length > 0 && (
                  <div className="bg-purple-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Camera className="w-5 h-5 mr-2 text-purple-500" />
                      {de ? 'Studioadresse' : 'Studio address'}
                    </h3>
                    <address className="text-gray-700 not-italic">
                      {studioAddress.map((line) => (
                        <React.Fragment key={line}>{line}<br /></React.Fragment>
                      ))}
                    </address>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(studioAddress.join(', '))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-3 text-purple-600 hover:text-purple-700 text-sm"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      {de ? 'Auf Google Maps anzeigen' : 'View on Google Maps'}
                    </a>
                  </div>
                )}

                {postalAddress && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-purple-500" />
                      {de ? 'Büro & Korrespondenzadresse' : 'Office & correspondence address'}
                    </h3>
                    <address className="text-gray-700 not-italic whitespace-pre-line">{postalAddress}</address>
                  </div>
                )}
              </div>
            </section>

            {/* Business Subject */}
            <section className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center mb-6">
                <Camera className="w-8 h-8 text-purple-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">{de ? 'Unternehmensgegenstand' : 'Business activity'}</h2>
              </div>
              <p className="text-gray-700 whitespace-pre-line">
                {businessActivity ||
                  (de
                    ? 'Fotografie, insbesondere Portrait-, Familien- und Businessfotografie.'
                    : 'Photography, in particular portrait, family and business photography.')}
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
                {/* Was fixed to "Austrian copyright law". The studio's own jurisdiction
                    is used when it has set one, and left general otherwise. */}
                {de
                  ? `Die auf dieser Website veröffentlichten Inhalte und Bilder unterliegen dem ${jurisdiction ? `Urheberrecht (${jurisdiction})` : 'geltenden Urheberrecht'}. Eine Verwendung außerhalb der Grenzen des Urheberrechts bedarf der vorherigen schriftlichen Zustimmung von ${SITE.name}.`
                  : `The content and images published on this website are subject to ${jurisdiction ? `the copyright law of ${jurisdiction}` : 'applicable copyright law'}. Any use beyond the limits of copyright law requires the prior written consent of ${SITE.name}.`}
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
                    {/* Dropped the Austria-only "TKG 2003" citation — GDPR applies
                        across the EEA/UK, the Austrian act does not. */}
                    {de
                      ? 'Der Schutz Ihrer persönlichen Daten ist uns ein besonderes Anliegen. Wir verarbeiten Ihre Daten ausschließlich auf Grundlage der geltenden gesetzlichen Bestimmungen (DSGVO).'
                      : 'The protection of your personal data is of particular importance to us. We process your data exclusively on the basis of the applicable statutory provisions (GDPR).'}
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
