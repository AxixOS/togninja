import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Lock, ArrowRight, Mail } from 'lucide-react';
import { SEOHead } from '../components/SEO/SEOHead';
import { useLanguage } from '../context/LanguageContext';
import { SITE } from '../config/site';

/**
 * Client gallery ACCESS page (private).
 *
 * Previously this publicly listed EVERY client's gallery (titles, thumbnails,
 * counts) — a privacy leak. Client galleries are individually password-protected
 * server-side (see the /api gallery endpoint, which 401s on a wrong/missing
 * password), so the correct entry point is: the client enters the private code
 * their photographer gave them, then unlocks their own gallery with its password.
 * No public enumeration; noindex so search engines don't list it.
 */
const PublicGalleriesPage: React.FC = () => {
  const { language } = useLanguage();
  const de = language === 'de';
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Accept a bare code or a pasted full gallery link — extract the last segment.
    const raw = code.trim().replace(/\/+$/, '');
    if (!raw) return;
    const slug = raw.includes('/gallery/') ? raw.split('/gallery/').pop() || raw : raw.split('/').pop() || raw;
    navigate(`/gallery/${encodeURIComponent(slug)}`);
  };

  return (
    <Layout>
      <SEOHead
        title={de ? `Kundengalerie – Zugang | ${SITE.name}` : `Client Gallery Access | ${SITE.name}`}
        // The origin studio's name was hardcoded into both of these, so every studio
        // that bought this product advertised a Viennese photographer in the meta
        // description of their own client-gallery page. The title beside it already used
        // SITE.name; only the description was missed.
        description={de
          ? `Zugang zu Ihrer privaten Fotogalerie bei ${SITE.name}. Geben Sie Ihren Galerie-Code ein und entsperren Sie Ihre Bilder mit Ihrem Passwort.`
          : `Access your private photo gallery at ${SITE.name}. Enter your gallery code and unlock your images with your password.`}
        canonical="/galleries/"
        noindex
      />

      <section className="min-h-[60vh] bg-gradient-to-br from-purple-50 via-white to-pink-50 py-16">
        <div className="container mx-auto px-4 max-w-lg">
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100">
              <Lock className="h-7 w-7 text-purple-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-purple-900 mb-2">
              {de ? 'Kundengalerie' : 'Client Gallery'}
            </h1>
            <p className="text-gray-600 mb-6">
              {de
                ? 'Geben Sie den Galerie-Code ein, den wir Ihnen geschickt haben. Ihre Galerie ist passwortgeschützt – das Passwort haben Sie ebenfalls von uns erhalten.'
                : 'Enter the gallery code we sent you. Your gallery is password-protected – you will have received the password from us too.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3 text-left">
              <label htmlFor="galleryCode" className="block text-sm font-medium text-gray-700">
                {de ? 'Galerie-Code oder Link' : 'Gallery code or link'}
              </label>
              <input
                id="galleryCode"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={de ? 'z. B. familie-mueller' : 'e.g. smith-family'}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoComplete="off"
              />
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 font-semibold text-white transition-colors hover:bg-purple-700"
              >
                {de ? 'Zu meiner Galerie' : 'Go to my gallery'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="text-sm text-gray-500 mt-6">
              {de ? 'Link oder Passwort verloren?' : 'Lost your link or password?'}{' '}
              <a href={`mailto:${SITE.email || 'hallo@newagefotografie.com'}`} className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium">
                <Mail className="h-3.5 w-3.5" /> {de ? 'Kontaktieren Sie uns' : 'Contact us'}
              </a>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default PublicGalleriesPage;
