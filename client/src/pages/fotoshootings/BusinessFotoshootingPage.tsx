import React from 'react';
import GutscheinLayout from '../../components/gutschein/GutscheinLayout';
import { Clock, Users, Camera, Briefcase } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

const BusinessFotoshootingPage: React.FC = () => {
  const { language } = useLanguage();
  const de = language === 'de';
  const businessPhotos = [
    {
      url: "https://i.postimg.cc/RZjf8FsX/Whats-App-Image-2025-05-24-at-2-38-45-PM-1.jpg",
      title: "Professional Headshots"
    },
    {
      url: "https://i.postimg.cc/tRKspft4/19-L9686-683x1024.jpg",
      title: "Corporate Portraits"
    },
    {
      url: "https://imgur.com/2EsZmcP.jpg",
      title: "Team Photos"
    }
  ];

  const portfolioPhotos = [
    {
      url: "https://i.postimg.cc/6QqWdLLP/Whats-App-Image-2025-05-24-at-2-38-46-PM.jpg",
      title: "Executive Portraits"
    },
    {
      url: "https://i.postimg.cc/rFg2QRm2/Whats-App-Image-2025-05-24-at-2-38-45-PM.jpg",
      title: "Business Casual"
    },
    {
      url: "https://i.postimg.cc/CMGgnQp1/11082260-883838491675315-8361533607387200890-o.jpg",
      title: "Corporate Events"
    },
    {
      url: "https://imgur.com/OvQtkkB.jpg",
      title: "Team Building"
    },
    {
      url: "https://imgur.com/XF8OK3q.jpg",
      title: "Office Culture"
    },
    {
      url: "https://imgur.com/L3gwSlu.jpg",
      title: "Professional Environment"
    }
  ];

  return (
    <GutscheinLayout
      title={de ? 'Business Fotoshooting Wien – Portraits für LinkedIn & Website' : 'Business Photo Shoot Vienna – Portraits for LinkedIn & Website'}
      subtitle={de ? 'Professionell. Authentisch. Unvergesslich.' : 'Professional. Authentic. Unforgettable.'}
      image="https://i.postimg.cc/6Q2c2gS1/Whats-App-Image-2025-05-24-at-2-38-45-PM-2.jpg"
      seoTitle={`Business Fotoshooting Wien – Professionelle Portraits ab €95 | ${SITE.name}`}
      seoDescription="Business Fotoshooting in Wien: Professionelle Portraits für LinkedIn, Website & Bewerbung. Headshots, Team- und Corporate-Fotos im Studio. Pakete ab €95 – jetzt Termin buchen!"
      seoKeywords="Business Fotoshooting Wien, Corporate Photography Wien, Businessfotos Wien, LinkedIn Portrait Wien"
      canonical="/fotoshootings/business/"
    >
      <div className="max-w-4xl mx-auto">
        {/* Main Content */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-purple-900 mb-4">{de ? '✅ Starker Auftritt für Sie und Ihre Marke' : '✅ A strong presence for you and your brand'}</h2>
            <p className="text-gray-700 text-lg">
              {de
                ? 'Ob für LinkedIn, Website oder Pitchdeck – Ihre Businessfotos sagen mehr als Worte. In unserem Studio in Wien setzen wir Sie professionell in Szene: klar, sympathisch und markengerecht.'
                : 'Whether for LinkedIn, your website, or a pitch deck – your business photos say more than words. In our studio in Vienna we present you professionally: clear, likeable, and on brand.'}
            </p>
          </div>

          {/* Photo Grid - Three Images */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {businessPhotos.map((photo, index) => (
              <div key={index} className="relative group overflow-hidden rounded-lg">
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={photo.url}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <div className="text-white">
                    <h3 className="font-bold text-lg mb-1">{photo.title}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* What to Expect */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
            <h3 className="text-2xl font-bold text-purple-900 mb-6">{de ? 'Was Sie erwartet:' : 'What to expect:'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">{de ? 'Entspannte Atmosphäre' : 'Relaxed atmosphere'}</h4>
                <p className="text-gray-600">
                  {de ? 'Kein Stress, keine steifen Posen, einfach Sie in Bestform.' : 'No stress, no stiff poses – simply you at your best.'}
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">{de ? 'Professionelles Licht & Posing' : 'Professional lighting & posing'}</h4>
                <p className="text-gray-600">
                  {de ? 'Wir zeigen Ihnen, wie Sie authentisch & souverän wirken.' : 'We show you how to come across as authentic and confident.'}
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">{de ? 'Individuelle Bildsprache' : 'Individual visual style'}</h4>
                <p className="text-gray-600">
                  {de ? 'Auf Ihre Branche und Zielgruppe abgestimmt.' : 'Tailored to your industry and target audience.'}
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">{de ? 'Schnelle & einfache Buchung' : 'Quick & easy booking'}</h4>
                <p className="text-gray-600">
                  {de ? 'Auch abends oder am Wochenende möglich.' : 'Evening and weekend slots available too.'}
                </p>
              </div>
            </div>
          </div>

          {/* Pain Points */}
          <div className="bg-red-50 rounded-lg p-8 mb-12">
            <h3 className="text-2xl font-bold text-red-800 mb-6">{de ? '❌ Unscharfes Selfie statt souveränem Auftritt?' : '❌ A blurry selfie instead of a confident presence?'}</h3>
            <ul className="space-y-4 text-red-700">
              <li>{de ? '• Ihre Website wirkt hochwertig – bis man Ihr „Über uns"-Foto sieht?' : '• Your website looks polished – until people see your “About us” photo?'}</li>
              <li>{de ? '• Ihr LinkedIn-Profil überzeugt inhaltlich, aber das Bild wirkt wie ein Schnappschuss?' : '• Your LinkedIn profile is convincing on content, but the photo looks like a snapshot?'}</li>
              <li>{de ? '• Ihre Mitbewerber wirken präsent – Sie fragen sich, woran\'s liegt?' : '• Your competitors look present and polished – and you wonder why?'}</li>
            </ul>
          </div>

          {/* Solution */}
          <div className="bg-purple-50 rounded-lg p-8 mb-12">
            <h3 className="text-2xl font-bold text-purple-900 mb-4">{de ? '📸 Professionelle Businessportraits' : '📸 Professional business portraits'}</h3>
            <p className="text-gray-700 mb-6">
              {de
                ? 'Zeigen auf den ersten Blick, was Sie können. Sie schaffen Nähe, Vertrauen und bleiben im Gedächtnis.'
                : 'They show at a glance what you are capable of. They create connection, build trust, and stay memorable.'}
            </p>
            <p className="text-lg font-semibold text-purple-800">
              {de ? 'Für Selbstständige, Gründer:innen, Teams & Führungskräfte' : 'For freelancers, founders, teams & executives'}
            </p>
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

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <p className="text-gray-700 italic mb-4">
                {de ? '"Perfekt für LinkedIn & PR – endlich Fotos, die mich wirklich repräsentieren."' : '“Perfect for LinkedIn & PR – finally photos that truly represent me.”'}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <p className="text-gray-700 italic mb-4">
                {de ? '"Professionell, entspannt & effizient – ein Shooting, das Spaß macht."' : '“Professional, relaxed & efficient – a shoot that is actually fun.”'}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <p className="text-gray-700 italic mb-4">
                {de ? '"Die Bilder haben sofort Wirkung gezeigt – auf Website, Socials und in Gesprächen."' : '“The photos had an immediate impact – on my website, socials, and in conversations.”'}
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
            <h3 className="text-2xl font-bold text-purple-900 mb-6">{de ? 'Warum unsere Kunden wiederkommen:' : 'Why our clients keep coming back:'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">{de ? '💼 Starke Bildsprache' : '💼 Strong visual language'}</h4>
                <p className="text-gray-600">{de ? 'Die Vertrauen schafft' : 'That builds trust'}</p>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">{de ? '🤝 Locker & professionell' : '🤝 Relaxed & professional'}</h4>
                <p className="text-gray-600">{de ? 'Für Einzelpersonen & große Teams' : 'For individuals & large teams'}</p>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">{de ? '📐 Vorteilhafte Darstellung' : '📐 Flattering presentation'}</h4>
                <p className="text-gray-600">{de ? 'Aller Körpertypen' : 'Of all body types'}</p>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">{de ? '🎯 Klare Anleitung' : '🎯 Clear guidance'}</h4>
                <p className="text-gray-600">{de ? 'Auch wenn Sie sich vor der Kamera unwohl fühlen' : 'Even if you feel uncomfortable in front of the camera'}</p>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">{de ? '🖼️ Langfristige Nutzung' : '🖼️ Long-term use'}</h4>
                <p className="text-gray-600">{de ? 'Bilder für alle Kanäle' : 'Images for every channel'}</p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-purple-600 text-white rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">{de ? 'Jetzt Shooting buchen und Eindruck hinterlassen.' : 'Book your shoot now and make an impression.'}</h3>
            <p className="text-lg mb-6">{de ? 'Businessfotos in Wien' : 'Business photos in Vienna'} – {SITE.name}</p>
            <a
              href="/warteliste"
              className="inline-block bg-white text-purple-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {de ? 'Termin vereinbaren' : 'Book an Appointment'}
            </a>
          </div>
        </div>
      </div>
    </GutscheinLayout>
  );
};

export default BusinessFotoshootingPage;