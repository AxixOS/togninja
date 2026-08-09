import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { SEOHead } from '../components/SEO/SEOHead';
import { SITE } from '../config/site';
import { useLanguage } from '../context/LanguageContext';
import { useQuery } from '@tanstack/react-query';

const CalculatorPage: React.FC = () => {
  const { language } = useLanguage();
  const de = language === 'de';
  // The studio's OWN calculator. This page used to hardcode a pricingembed.com id — the
  // origin studio's — so every studio's /calculator showed another studio's packages and
  // prices. No configured calculator now means no iframe, not somebody else's.
  const { data: studioConfig } = useQuery<any>({
    queryKey: ['/api/studio-config'],
    queryFn: () => fetch('/api/studio-config').then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });
  const embedUrl = String(studioConfig?.pricingEmbedUrl || '').trim();
  return (
    <Layout>
      {/* Title, description and keywords all named Vienna and quoted €95 — the origin
          studio's city, currency and pricing, on every studio that installs this. */}
      <SEOHead
        title={de ? `Preisrechner | ${SITE.name}` : `Price Calculator | ${SITE.name}`}
        description={de
          ? 'Berechnen Sie die Kosten Ihres Fotoshootings sofort online – transparent und ohne versteckte Gebühren.'
          : 'Work out the cost of your photo shoot instantly — transparent, with no hidden fees.'}
        canonical="/calculator/"
      />

      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              {de ? 'Preisrechner – Kosten sofort berechnen' : 'Price Calculator – Get Your Cost Instantly'}
            </h1>
            {/* Named the city and quoted "ab €95" — the origin studio's location and price
                list, shown to every studio's visitors regardless of what it charges. */}
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {de
                ? 'Konfigurieren Sie Ihr persönliches Fotoshooting und erhalten Sie sofort eine transparente Preisauskunft.'
                : 'Configure your personal photo shoot and get a transparent price quote instantly.'}
            </p>
          </div>
          {!embedUrl ? (
            <p className="text-center text-gray-500">
              {de
                ? 'Der Preisrechner ist noch nicht eingerichtet.'
                : 'The price calculator has not been set up yet.'}
            </p>
          ) : (
          <div className="qk-widget" style={{ maxWidth: '720px', margin: '0 auto' }}>
            <iframe
              src={embedUrl}
              width="100%"
              height="600"
              frameBorder="0"
              style={{ border: 'none', borderRadius: '12px' }}
              title={de ? 'Preisrechner' : 'Price calculator'}
            />
            <div className="qk-credit" style={{ textAlign: 'center', padding: '8px 0', fontSize: '13px', fontFamily: 'sans-serif', opacity: 0.7 }}>
              <a href="https://pricingembed.com" target="_blank" rel="noopener"
                style={{ color: '#22C55E', textDecoration: 'none' }}>
                ⚡ Powered by PricingEmbed
              </a>
            </div>
          </div>
          )}

          {/* Package overview for SEO context */}
          <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl font-bold text-purple-600 mb-2">{de ? 'ab €95' : 'from €95'}</div>
              <p className="text-gray-800 font-semibold">Mini-Shooting</p>
              <p className="text-sm text-gray-500 mt-1">{de ? '30 Minuten, 5 bearbeitete Fotos' : '30 minutes, 5 edited photos'}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-purple-200">
              <div className="text-3xl font-bold text-purple-600 mb-2">{de ? 'ab €199' : 'from €199'}</div>
              <p className="text-gray-800 font-semibold">Standard-Shooting</p>
              <p className="text-sm text-gray-500 mt-1">{de ? '60 Minuten, 15 bearbeitete Fotos' : '60 minutes, 15 edited photos'}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl font-bold text-purple-600 mb-2">{de ? 'ab €299' : 'from €299'}</div>
              <p className="text-gray-800 font-semibold">Premium-Shooting</p>
              <p className="text-sm text-gray-500 mt-1">{de ? '90 Minuten, 30 bearbeitete Fotos' : '90 minutes, 30 edited photos'}</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">{de ? 'Haben Sie Fragen zu unseren Paketen?' : 'Questions about our packages?'}</p>
            <Link
              to="/kontakt"
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors mr-3"
            >
              {de ? 'Persönliche Beratung' : 'Personal Consultation'}
            </Link>
            <Link
              to="/preise/"
              className="inline-flex items-center px-6 py-3 border-2 border-purple-600 text-purple-600 rounded-full font-semibold hover:bg-purple-50 transition-colors"
            >
              {de ? 'Alle Preise ansehen' : 'View All Prices'}
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CalculatorPage;
