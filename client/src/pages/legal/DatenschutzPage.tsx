import React from 'react';
import { Helmet } from 'react-helmet-async';
import Layout from '../../components/layout/Layout';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

const DatenschutzPage: React.FC = () => {
  const { language } = useLanguage();
  const de = language === 'de';

  return (
    <Layout>
      <Helmet>
        <title>{de ? `Datenschutz & Impressum | ${SITE.name} Wien` : `Privacy Policy & Legal Notice | ${SITE.name} Vienna`}</title>
        <meta name="description" content={de
          ? `Datenschutzerklärung und Impressum von ${SITE.name} Wien. DSGVO-konform, transparent, Österreich.`
          : `Privacy policy and legal notice of ${SITE.name} Vienna. GDPR compliant, transparent, Austria.`
        } />
        <link rel="canonical" href={`${SITE.url}/datenschutz/`} />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
              {de ? 'Impressum & Datenschutzerklärung' : 'Legal Notice & Privacy Policy'}
            </h1>

            {!de && (
              <p className="text-sm text-gray-500 -mt-6 mb-8">
                English translation for convenience — the legally binding version is the German original.
              </p>
            )}

            <div className="prose prose-lg max-w-none text-gray-700">
              
              {/* Impressum Section */}
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{de ? 'Anbieter' : 'Provider'}</h2>
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <p className="font-semibold text-gray-900 text-lg mb-2">{SITE.name}</p>
                <p>Simon Parrott</p>
                
                <p className="font-semibold text-gray-900 mt-4 mb-1">📍 {de ? 'Studio:' : 'Studio:'}</p>
                <p>{de ? 'Eingang Ecke Schönbrunnerstraße' : 'Entrance corner Schönbrunnerstraße'}<br />
                Wehrgasse 11A/2+5<br />
                1050 {de ? 'Wien' : 'Vienna'}</p>
                
                <p className="font-semibold text-gray-900 mt-4 mb-1">📮 {de ? 'Büro & Korrespondenz:' : 'Office & Correspondence:'}</p>
                <p>Julius-Tandler-Platz 5 / 13<br />
                1090 {de ? 'Wien' : 'Vienna'}</p>
                
                <p className="mt-4">
                  📞 <strong>{de ? 'Telefon:' : 'Phone:'}</strong> <a href={`tel:+${SITE.phone.replace(/[^0-9]/g,'')}`} className="text-purple-600 hover:text-purple-700">{SITE.phone}</a><br />
                  📧 <strong>{de ? 'E-Mail:' : 'Email:'}</strong> <a href={`mailto:${SITE.email}`} className="text-purple-600 hover:text-purple-700">{SITE.email}</a><br />
                  🌐 <strong>Website:</strong> <a href={SITE.url} className="text-purple-600 hover:text-purple-700">{SITE.url.replace(/^https?:\/\//, '')}</a>
                </p>
                
                <p className="mt-4 text-sm text-gray-500">{de ? 'Keine UID-Nummer (nicht umsatzsteuerpflichtig).' : 'No VAT number (not subject to VAT).'}</p>
              </div>

              {/* Datenschutz Section */}
              <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">{de ? 'Datenschutz – Kurz & Klar' : 'Privacy – Short & Clear'}</h2>
              <p>
                {de
                  ? 'Wir nehmen Datenschutz ernst und verarbeiten personenbezogene Daten ausschließlich im Rahmen der DSGVO.'
                  : 'We take data protection seriously and process personal data exclusively in accordance with GDPR.'}
              </p>

              <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">{de ? 'Welche Daten wir verarbeiten' : 'What Data We Process'}</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>{de ? 'Name, E-Mail, Telefonnummer' : 'Name, email, phone number'}</li>
                <li>{de ? 'Buchungs- & Rechnungsdaten' : 'Booking & billing data'}</li>
                <li>{de ? 'Fotos aus dem Shooting' : 'Photos from the photoshoot'}</li>
                <li>{de ? 'Website-Daten (nur mit Zustimmung)' : 'Website data (only with consent)'}</li>
              </ul>

              <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">{de ? 'Zweck der Verarbeitung' : 'Purpose of Processing'}</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>{de ? 'Terminabwicklung' : 'Appointment scheduling'}</li>
                <li>{de ? 'Vertragserfüllung' : 'Contract fulfilment'}</li>
                <li>{de ? 'Bildbearbeitung & Lieferung' : 'Image editing & delivery'}</li>
                <li>{de ? 'Buchhaltung' : 'Accounting'}</li>
                <li>{de ? 'Kommunikation' : 'Communication'}</li>
                <li>{de ? 'Marketing nur mit Einwilligung' : 'Marketing only with consent'}</li>
              </ul>

              <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">{de ? 'Fotos & personenbezogene Daten' : 'Photos & Personal Data'}</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>{de ? 'Fotos gelten als personenbezogene Daten.' : 'Photos are considered personal data.'}</li>
                <li>{de ? 'Speicherung erfolgt sicher.' : 'Storage is secure.'}</li>
                <li>{de ? 'Keine Weitergabe ohne Zustimmung.' : 'No sharing without consent.'}</li>
                <li>{de ? 'Veröffentlichung nur mit Einwilligung oder wenn nicht widersprochen wurde.' : 'Publication only with consent or if no objection was raised.'}</li>
              </ul>

              <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">Cookies</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>{de ? 'Notwendige Cookies für den Betrieb' : 'Necessary cookies for operation'}</li>
                <li>{de ? 'Analyse & Marketing nur nach Zustimmung' : 'Analytics & marketing only with consent'}</li>
                <li>{de ? 'Einwilligung jederzeit widerrufbar' : 'Consent can be revoked at any time'}</li>
              </ul>

              <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">{de ? 'Deine Rechte' : 'Your Rights'}</h3>
              <p>{de ? 'Du hast jederzeit das Recht auf:' : 'You have the right at any time to:'}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{de ? 'Auskunft' : 'Access to your data'}</li>
                <li>{de ? 'Berichtigung' : 'Rectification'}</li>
                <li>{de ? 'Löschung' : 'Deletion'}</li>
                <li>{de ? 'Einschränkung' : 'Restriction of processing'}</li>
                <li>{de ? 'Widerruf deiner Einwilligung' : 'Withdrawal of your consent'}</li>
              </ul>

              <div className="bg-purple-50 rounded-xl p-6 mt-8">
                <p className="font-semibold text-gray-900">{de ? 'Beschwerdestelle:' : 'Supervisory authority:'}</p>
                <p>{de ? 'Österreichische Datenschutzbehörde (DSB)' : 'Austrian Data Protection Authority (DSB)'}</p>
                <p className="mt-4">
                  📧 {de ? 'Kontakt:' : 'Contact:'} <a href={`mailto:${SITE.email}`} className="text-purple-600 hover:text-purple-700">{SITE.email}</a>
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DatenschutzPage;
