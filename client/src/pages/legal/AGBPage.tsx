import React from 'react';
import { Helmet } from 'react-helmet-async';
import Layout from '../../components/layout/Layout';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

const AGBPage: React.FC = () => {
  const { language } = useLanguage();
  const de = language === 'de';

  return (
    <Layout>
      <Helmet>
        <title>{de ? `AGB – Allgemeine Geschäftsbedingungen | ${SITE.name}` : `Terms & Conditions | ${SITE.name}`}</title>
        <meta name="description" content={de
          ? `AGB von ${SITE.name} Wien. Buchung, Storno, Urheberrecht, Nutzung – alle wichtigen Bedingungen auf einen Blick.`
          : `Terms and conditions of ${SITE.name} Vienna. Booking, cancellation, copyright, usage – all key terms at a glance.`
        } />
        <link rel="canonical" href={`${SITE.url}/agb/`} />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {de ? `AGB – ${SITE.name}` : `Terms & Conditions – ${SITE.name}`}
            </h1>
            <p className="text-gray-500 mb-8">{de ? 'Stand: Dezember 2025' : 'Last updated: December 2025'}</p>

            <div className="prose prose-lg max-w-none text-gray-700">
              
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">{de ? '1. Geltungsbereich' : '1. Scope'}</h2>
              <p>
                {de
                  ? `Diese AGB gelten für alle Fotoshootings, Buchungen, Gutscheine, Bildbestellungen und Leistungen von ${SITE.name}, sofern nichts anderes schriftlich vereinbart wurde.`
                  : `These terms and conditions apply to all photoshoots, bookings, vouchers, image orders, and services provided by ${SITE.name}, unless otherwise agreed in writing.`}
              </p>
              <p>
                {de
                  ? 'Mit der Buchung erklärst du dich mit diesen Bedingungen einverstanden.'
                  : 'By making a booking, you agree to these terms and conditions.'}
              </p>

              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">{de ? '2. Buchung & Ablauf' : '2. Booking & Process'}</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>{de ? 'Ein Shooting gilt als fix gebucht, sobald wir es bestätigen.' : 'A photoshoot is considered confirmed once we send confirmation.'}</li>
                <li>{de ? 'Dauer, Umfang und Stil richten sich nach dem gebuchten Paket.' : 'Duration, scope, and style are based on the booked package.'}</li>
                <li>{de ? 'Der fotografische Stil bleibt Teil unserer kreativen Freiheit.' : 'The photographic style remains part of our creative freedom.'}</li>
                <li>{de ? 'Leichte Abweichungen von Beispielbildern sind kein Reklamationsgrund.' : 'Minor deviations from sample images are not grounds for complaint.'}</li>
              </ul>

              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">{de ? '3. Preise & Zahlung' : '3. Prices & Payment'}</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>{de ? 'Alle Preise verstehen sich in Euro.' : 'All prices are in Euros.'}</li>
                <li>{de ? 'Zahlung erfolgt direkt nach dem Shooting oder bei Übergabe.' : 'Payment is due directly after the photoshoot or upon delivery.'}</li>
                <li>{de ? 'Digitale Bilder und Prints bleiben bis zur vollständigen Bezahlung unser Eigentum.' : 'Digital images and prints remain our property until full payment is received.'}</li>
              </ul>

              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">{de ? '4. Storno & Nichterscheinen' : '4. Cancellation & No-Show'}</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>{de ? 'Absage unter 48 Stunden:' : 'Cancellation under 48 hours:'}</strong> {de ? 'bis zu 50 % des Shootingpreises.' : 'up to 50% of the photoshoot price.'}</li>
                <li><strong>{de ? 'Nichterscheinen ohne Absage:' : 'No-show without notice:'}</strong> {de ? '100 % des Preises.' : '100% of the price.'}</li>
                <li>{de ? 'Bei Krankheit oder höherer Gewalt finden wir fair eine Lösung.' : 'In cases of illness or force majeure, we will find a fair solution.'}</li>
              </ul>

              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">{de ? '5. Bildauswahl & Lieferung' : '5. Image Selection & Delivery'}</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>{de ? `Die Bildauswahl erfolgt durch ${SITE.name}, außer anders vereinbart.` : `Image selection is made by ${SITE.name}, unless otherwise agreed.`}</li>
                <li>{de ? 'RAW-Dateien werden nicht herausgegeben.' : 'RAW files are not provided.'}</li>
                <li>{de ? 'Retusche umfasst Farbe, Licht und leichte Hautkorrekturen.' : 'Retouching includes colour, light, and minor skin corrections.'}</li>
                <li>{de ? 'Lieferzeiten sind Richtwerte.' : 'Delivery times are approximate.'}</li>
              </ul>

              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">{de ? '6. Urheberrecht & Nutzung' : '6. Copyright & Usage'}</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>{de ? `Das Urheberrecht bleibt immer bei ${SITE.name}.` : `Copyright always remains with ${SITE.name}.`}</li>
                <li>{de ? 'Du erhältst private Nutzungsrechte.' : 'You receive private usage rights.'}</li>
                <li>{de ? 'Kommerzielle Nutzung (Werbung, Website, Social Media von Firmen etc.) nur mit schriftlicher Zustimmung.' : 'Commercial use (advertising, websites, corporate social media, etc.) only with written consent.'}</li>
                <li>{de ? 'Bilder dürfen nicht verfremdet oder mit Filtern verändert werden.' : 'Images may not be altered or modified with filters.'}</li>
              </ul>

              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">{de ? '7. Haftung' : '7. Liability'}</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>{de ? 'Keine Haftung bei höherer Gewalt oder technischen Ausfällen.' : 'No liability in cases of force majeure or technical failures.'}</li>
                <li>{de ? 'Keine Haftung für subjektive Unzufriedenheit.' : 'No liability for subjective dissatisfaction.'}</li>
                <li>{de ? 'Keine Haftung für Datenverlust nach Übergabe.' : 'No liability for data loss after delivery.'}</li>
              </ul>

              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">{de ? '8. Gerichtsstand' : '8. Jurisdiction'}</h2>
              <p>{de ? 'Es gilt österreichisches Recht.' : 'Austrian law applies.'}</p>
              <p><strong>{de ? 'Gerichtsstand:' : 'Place of jurisdiction:'}</strong> {de ? 'Wien' : 'Vienna'}</p>

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AGBPage;
