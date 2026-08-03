import React from 'react';
import { Helmet } from 'react-helmet-async';
import Layout from '../../components/layout/Layout';
import { Users, Baby, Briefcase } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

const ModelReleasePage: React.FC = () => {
  const { language } = useLanguage();
  const de = language === 'de';

  return (
    <Layout>
      <Helmet>
        <title>{de ? `Model-Release Klauseln | ${SITE.name} Wien` : `Model Release Clauses | ${SITE.name} Vienna`}</title>
        <meta name="description" content={de
          ? `Model-Release Klauseln für Familien-, Baby- und Business-Shootings bei ${SITE.name} Wien. DSGVO-konform.`
          : `Model release clauses for family, baby and business photoshoots at ${SITE.name} Vienna. GDPR compliant.`
        } />
        <link rel="canonical" href={`${SITE.url}/model-release/`} />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {de ? 'Model-Release Klauseln' : 'Model Release Clauses'}
            </h1>
            <p className="text-gray-600 mb-8">
              {de
                ? 'Je nach Art des Shootings gelten unterschiedliche Einwilligungsklauseln für die Verwendung der Bilder.'
                : 'Different consent clauses apply for the use of images depending on the type of photoshoot.'}
            </p>

            <div className="space-y-8">
              
              {/* Family & Lifestyle */}
              <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-6 border border-purple-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {de ? 'Familien- & Lifestyle-Shootings' : 'Family & Lifestyle Photoshoots'}
                  </h2>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-700 leading-relaxed">
                    {de
                      ? `Ich erteile ${SITE.name} die Erlaubnis, ausgewählte Bilder aus dem Shooting für Portfolio-, Website-, Social-Media- und Marketingzwecke zu verwenden.`
                      : `I grant ${SITE.name} permission to use selected images from the photoshoot for portfolio, website, social media, and marketing purposes.`}
                  </p>
                  <p className="text-gray-700 leading-relaxed mt-3">
                    {de
                      ? 'Diese Einwilligung gilt zeitlich unbegrenzt und kann jederzeit per E-Mail widerrufen werden.'
                      : 'This consent is valid indefinitely and can be revoked at any time via email.'}
                  </p>
                </div>
              </div>

              {/* Baby & Newborn */}
              <div className="bg-gradient-to-br from-pink-50 to-white rounded-xl p-6 border border-pink-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-pink-100 rounded-full">
                    <Baby className="w-6 h-6 text-pink-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {de ? 'Baby- & Neugeborenenfotografie' : 'Baby & Newborn Photography'}
                  </h2>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-700 leading-relaxed">
                    {de
                      ? 'Mir ist bewusst, dass es sich bei den Fotos um sensible personenbezogene Daten handelt.'
                      : 'I am aware that the photos constitute sensitive personal data.'}
                  </p>
                  <p className="text-gray-700 leading-relaxed mt-3">
                    {de
                      ? `Ich erteile ${SITE.name} ausdrücklich die Erlaubnis, ausgewählte Bilder meines Kindes für Portfolio- und Marketingzwecke zu verwenden.`
                      : `I expressly grant ${SITE.name} permission to use selected images of my child for portfolio and marketing purposes.`}
                  </p>
                  <p className="text-gray-700 leading-relaxed mt-3">
                    {de
                      ? 'Eine Weitergabe an Dritte erfolgt nicht. Die Einwilligung kann jederzeit widerrufen werden.'
                      : 'Images will not be shared with third parties. Consent can be revoked at any time.'}
                  </p>
                </div>
              </div>

              {/* Business & Corporate */}
              <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 border border-blue-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Briefcase className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {de ? 'Business- & Corporate-Shootings' : 'Business & Corporate Photoshoots'}
                  </h2>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-700 leading-relaxed">
                    {de
                      ? `Ich / unser Unternehmen erteilen ${SITE.name} das Recht, die entstandenen Bilder für eigene Marketing-, Portfolio- und Referenzzwecke zu nutzen.`
                      : `I / our company grant ${SITE.name} the right to use the resulting images for their own marketing, portfolio, and reference purposes.`}
                  </p>
                  <p className="text-gray-700 leading-relaxed mt-3">
                    {de
                      ? 'Die kommerzielle Nutzung durch den Auftraggeber ist im vereinbarten Umfang gestattet.'
                      : 'Commercial use by the client is permitted within the agreed scope.'}
                  </p>
                </div>
              </div>

            </div>

            {/* Contact Note */}
            <div className="mt-10 bg-gray-50 rounded-xl p-6">
              <p className="text-gray-600">
                <strong>{de ? 'Fragen?' : 'Questions?'}</strong>{' '}
                {de ? 'Schreib uns an' : 'Contact us at'}{' '}
                <a href={`mailto:${SITE.email}`} className="text-purple-600 hover:text-purple-700">
                  {SITE.email}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ModelReleasePage;
