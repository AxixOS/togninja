import React from 'react';
import GutscheinLayout from '../../components/gutschein/GutscheinLayout';
import { Clock, Users, Camera, Heart } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

const FamilyFotoshootingPage: React.FC = () => {
  const { language } = useLanguage();
  const de = language === 'de';
  const familyPhotos = [
    {
      url: "https://i.imgur.com/3gctBYO.jpg",
      title: "Family Portrait"
    },
    {
      url: "https://i.imgur.com/4m5hoL9.jpg",
      title: "Outdoor Family"
    },
    {
      url: "https://i.imgur.com/o9HCqp0.jpg",
      title: "Studio Family"
    }
  ];

  const portfolioPhotos = [
    {
      url: "https://i.imgur.com/1668928.jpg",
      title: "Family Fun"
    },
    {
      url: "https://i.imgur.com/3875080.jpg",
      title: "Natural Moments"
    },
    {
      url: "https://i.imgur.com/3662850.jpg",
      title: "Family Love"
    },
    {
      url: "https://i.imgur.com/3184183.jpg",
      title: "Generations"
    },
    {
      url: "https://i.imgur.com/2774556.jpg",
      title: "Siblings"
    },
    {
      url: "https://i.imgur.com/3760263.jpg",
      title: "Family Bonds"
    }
  ];

  return (
    <GutscheinLayout
      title={de ? 'Familienporträts in Wien' : 'Family Portraits in Vienna'}
      subtitle={de ? `${SITE.name} – Authentisch. Professionell. Unvergesslich.` : `${SITE.name} – Authentic. Professional. Unforgettable.`}
      image="https://i.imgur.com/o9HCqp0.jpg"
    >
      <div className="max-w-4xl mx-auto">
        {/* Main Content */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-purple-900 mb-4">{de ? 'Ihre Familie. Ihre Emotionen. Perfekt eingefangen.' : 'Your family. Your emotions. Perfectly captured.'}</h2>
            <p className="text-gray-700 text-lg">
              {de ? (
                <>
                  Sie möchten Ihre Familienmomente festhalten und sich darauf verlassen können, dass alle wichtigen Augenblicke eingefangen werden?
                  <br />
                  Wir sind auf natürliche, stimmungsvolle Familienfotografie spezialisiert – ohne gestellte Posen, ohne steife Atmosphäre.
                </>
              ) : (
                <>
                  Want to capture your family moments and be sure that every important one is caught on camera?
                  <br />
                  We specialise in natural, atmospheric family photography – no staged poses, no stiff atmosphere.
                </>
              )}
            </p>
          </div>

          {/* Photo Grid - Three Images */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {familyPhotos.map((photo, index) => (
              <div key={index} className="relative group overflow-hidden rounded-lg">
                <img
                  src={photo.url}
                  alt={photo.title}
                  className="w-full h-64 object-cover transform transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">{photo.title}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Why Choose Us */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
            <h3 className="text-2xl font-bold text-purple-900 mb-6">{de ? 'Warum Familien uns wählen:' : 'Why families choose us:'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">{de ? 'Unauffällig & präsent' : 'Discreet yet present'}</h4>
                <p className="text-gray-600">
                  {de ? 'Wir bewegen uns dezent im Hintergrund und fangen echte Emotionen ein.' : 'We move quietly in the background and capture genuine emotions.'}
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">{de ? 'Authentisch & natürlich' : 'Authentic & natural'}</h4>
                <p className="text-gray-600">
                  {de ? 'Keine gestellten Bilder. Wir zeigen Sie, wie Sie wirklich sind – entspannt und sympathisch.' : 'No staged shots. We show you as you really are – relaxed and likeable.'}
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">{de ? 'Ruhig in jeder Situation' : 'Calm in every situation'}</h4>
                <p className="text-gray-600">
                  {de ? 'Selbst in stressigen Momenten behalten wir den Überblick und dokumentieren jedes Detail.' : 'Even in hectic moments we keep the overview and document every detail.'}
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">{de ? 'Schmeichelhafte Perspektiven' : 'Flattering perspectives'}</h4>
                <p className="text-gray-600">
                  {de ? 'Wir kennen die besten Blickwinkel, damit sich alle auf den Bildern wiedererkennen und mögen.' : 'We know the best angles, so everyone recognises and loves themselves in the photos.'}
                </p>
              </div>
            </div>
          </div>

          {/* Portfolio Grid */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-purple-900 mb-6 text-center">{de ? 'Impressionen unserer Arbeit' : 'Impressions of our work'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {portfolioPhotos.map((photo, index) => (
                <div key={index} className="relative group overflow-hidden rounded-lg">
                  <img
                    src={photo.url}
                    alt={photo.title}
                    className="w-full h-64 object-cover transform transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-lg font-semibold">{photo.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Flexible Booking */}
          <div className="bg-purple-50 rounded-lg p-8 mb-12">
            <h3 className="text-2xl font-bold text-purple-900 mb-4">{de ? 'Flexibel buchbar – auch an Wochenenden & Feiertagen' : 'Flexible booking – including weekends & holidays'}</h3>
            <p className="text-gray-700">
              {de
                ? 'Unser einfacher Buchungsprozess ist 7 Tage die Woche verfügbar – so passt sich Ihr Fotograf Ihrem Zeitplan an, nicht umgekehrt.'
                : 'Our simple booking process is available 7 days a week – so your photographer fits your schedule, not the other way around.'}
            </p>
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <p className="text-gray-700 italic mb-4">{de ? '"Perfekt für jede Familie."' : '“Perfect for any family.”'}</p>
              <p className="text-gray-700 italic mb-4">{de ? '"Unauffällig, professionell, sympathisch."' : '“Discreet, professional, and warm.”'}</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <p className="text-gray-700 italic mb-4">{de ? '"Fotos, die man wirklich gerne teilt."' : '“Photos you actually love to share.”'}</p>
              <p className="text-gray-700 italic mb-4">{de ? '"Einfach zu buchen, zuverlässig und herzlich."' : '“Easy to book, reliable, and warm-hearted.”'}</p>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h3 className="text-2xl font-bold text-purple-900 mb-6">{de ? '📍 Verfügbar in Wien' : '📍 Available in Vienna'}</h3>
            <p className="text-lg mb-4">📅 {de ? 'Jetzt Termin sichern:' : 'Secure your date now:'} <a href="/warteliste" className="text-purple-600 hover:text-purple-700">{de ? 'Termin planen' : 'Plan a date'}</a></p>
            <p className="text-lg">📸 {SITE.name} – {de ? 'Für bleibende Erinnerungen.' : 'For lasting memories.'}</p>
          </div>
        </div>
      </div>
    </GutscheinLayout>
  );
};

export default FamilyFotoshootingPage;