import React, { useEffect } from 'react';
import GutscheinLayout from '../../components/gutschein/GutscheinLayout';
import { Check, Clock, Heart, Camera } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

const NewbornGutscheinPage: React.FC = () => {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const de = language === 'de';

  // Ensure page scrolls to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const packages = [
    {
      title: 'Basic',
      subtitle: de ? 'Erste Erinnerungen' : 'First memories',
      price: 95,
      originalPrice: 195,
      features: [
        de ? '60 Minuten Shooting' : '60-minute shoot',
        de ? '1 bearbeitetes Foto als A3 Leinwand (40x30cm) + gleiches Portrait digital' : '1 edited photo as an A3 canvas (40x30cm) + the same portrait as a digital file',
        de ? '2 Outfits' : '2 outfits'
      ],
      description: de ? 'Neugeborenen Fotoshooting Basic — 1 bearbeitetes Foto als A3 Leinwand + digital, perfekt für die ersten Tage' : 'Newborn Photo Shoot Basic — 1 edited photo as an A3 canvas + digital, perfect for the first days',
      imageUrl: 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg'
    },
    {
      title: 'Premium',
      subtitle: de ? 'Umfangreiche Erinnerungen' : 'Extensive memories',
      price: 195,
      originalPrice: 295,
      features: [
        de ? '5 bearbeitete Fotos digital (Porträts nach Wahl)' : '5 edited photos as digital files (portraits of your choice)',
        de ? 'A3 Leinwand (40x30cm)' : 'A3 canvas (40x30cm)'
      ],
      isFeatured: true,
      description: de ? 'Neugeborenen Fotoshooting Premium — 5 bearbeitete Fotos digital + A3 Leinwand, umfangreiche Erinnerungen' : 'Newborn Photo Shoot Premium — 5 edited digital photos + A3 canvas, extensive memories',
      imageUrl: 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg'
    },
    {
      title: 'Deluxe',
      subtitle: de ? 'Das komplette Erlebnis' : 'The complete experience',
      price: 295,
      originalPrice: 395,
      features: [
        de ? 'A2 Leinwand (60x40cm)' : 'A2 canvas (60x40cm)',
        de ? '10 bearbeitete Fotos digital (Porträts nach Wahl)' : '10 edited photos as digital files (portraits of your choice)'
      ],
      description: de ? 'Neugeborenen Fotoshooting Deluxe — 10 bearbeitete Fotos digital + A2 Leinwand, das komplette Erlebnis' : 'Newborn Photo Shoot Deluxe — 10 edited digital photos + A2 canvas, the complete experience',
      imageUrl: 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg'
    }
  ];

  const studioGrid = [
    {
      url: "https://i.postimg.cc/7LWyk5JJ/DX4A3342.jpg",
      title: de ? "Neugeborenen Studio" : "Newborn studio",
      description: de ? "Professionelle Aufnahmen in warmer Atmosphäre" : "Professional photos in a warm atmosphere"
    },
    {
      url: "https://i.postimg.cc/0NQqFYjq/00371608.jpg",
      title: de ? "Familien Shooting" : "Family shoot",
      description: de ? "Die ganze Familie willkommen" : "The whole family welcome"
    },
    {
      url: "https://i.postimg.cc/BZ1JJBgS/4-S8-A7739-1024x683.jpg",
      title: de ? "Geschwister Shooting" : "Sibling shoot",
      description: de ? "Besondere Momente mit Geschwistern" : "Special moments with siblings"
    }
  ];

  const seasonalGrid = [
    {
      url: "https://i.postimg.cc/mDPBzYWS/0a9a256b76eacc28798f22b9d58219e5.jpg",
      title: de ? "Baby shooting" : "Baby shoot",

    },
    {
      url: "https://i.postimg.cc/SsHqWnyb/E70I3814.jpg",
      title: de ? "New born shooting" : "Newborn shoot",

    },
    {
      url: "https://i.postimg.cc/Hss3QBhH/00023276.jpg",
      title: de ? "Kinder Fotosshooting" : "Children's photo shoot",

    }
  ];

  const specialGrid = [
    {
      url: "https://i.postimg.cc/TY70Qgzb/00124146.jpg",
      title: de ? "Geschwistershooting" : "Sibling shoot",
      description: de ? "Besondere Geschwistermomente" : "Special sibling moments"
    },
    {
      url: "https://i.postimg.cc/T1Q9zDhZ/3W5K2689.jpg",
      title: de ? "Familienshooting" : "Family shoot",
      description: de ? "Die ganze Familie vereint" : "The whole family together"
    },
    {
      url: "https://i.postimg.cc/NMqpmtWP/4S8A2156.jpg",
      title: de ? "Generationenshooting" : "Generations shoot",
      description: de ? "Drei Generationen zusammen" : "Three generations together"
    }
  ];

  const locationGrid = [
    {
      url: "https://i.postimg.cc/T2cCLZQC/OPLATEK-70x50-L.jpg",
      title: de ? "Persönliche Vorbereitung für authentische Ergebnisse" : "Personal preparation for authentic results",
      description: de ? "Jedes Fotoshooting beginnt bei uns mit einem kurzen Fragebogen und einem persönlichen Vorgespräch, damit wir Ihre Familie wirklich kennenlernen. Zusätzlich erhalten Sie hilfreiche Hinweise zur Vorbereitung – inklusive Tipps zur Kleidung und Inspiration, persönliche Gegenstände wie Sportausrüstung oder Musikinstrumente mitzubringen. So entstehen Aufnahmen, die Ihre Persönlichkeit zum Ausdruck bringen." : "Every photo shoot with us starts with a short questionnaire and a personal consultation so we can truly get to know your family. You will also receive helpful preparation tips – including clothing advice and inspiration to bring personal items such as sports gear or musical instruments. The result is photos that truly express your personality."
    },
    {
      url: "https://i.postimg.cc/W3x846Tr/220318-das-Create0012-1.jpg",
      title: de ? "Die große Enthüllung auf der Kinoleinwand" : "The big reveal on the cinema screen",
      description: de ? "Nach dem Shooting erwartet Sie ein besonderes Erlebnis: die Präsentation Ihrer Familienporträts auf großer Leinwand – ein interaktiver Moment voller Emotionen in entspannter, stilvoller Atmosphäre. Auf Wunsch ist diese Bildauswahl auch noch am selben Tag möglich." : "After the shoot, a special experience awaits you: your family portraits presented on the big screen – an interactive, emotional moment in a relaxed, stylish atmosphere. On request, this image selection can even take place on the same day."
    },
    {
      url: "https://i.postimg.cc/cJXfv7MC/classic-living-room-with-an-upholstered-bench-1-480x480.webp",
      title: de ? "Handwerklich gefertigte Qualität – mit Liebe geliefert" : "Handcrafted quality – delivered with love",
      description: de ? "Jedes Portrait wird bei uns sorgfältig bearbeitet, farboptimiert und qualitätsgeprüft. Ihre fertigen Bilder erhalten Sie als hochwertige Drucke per versichertem Versand – die Lieferung ist für Sie selbstverständlich kostenlos." : "Every portrait is carefully edited, colour-optimised and quality-checked. Your finished images arrive as premium prints via insured shipping – delivery is of course free of charge."
    }
  ];

  const handleAddToCart = (pkg: typeof packages[0]) => {
    addItem({
      name: `Newborn ${pkg.title}`,
      productSlug: pkg.title.toLowerCase() === 'basic' ? 'newborn-basic' : (pkg.title.toLowerCase() === 'premium' ? 'newborn-premium' : 'newborn-deluxe'),
      title: `${de ? 'Neugeborenen Fotoshooting' : 'Newborn Photo Shoot'} - ${pkg.title}`,
      price: pkg.price,
      quantity: 1,
      packageType: pkg.subtitle,
      type: 'voucher',
      description: pkg.description,
      imageUrl: pkg.imageUrl
    });
    // Scroll to top before navigating
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate('/cart');
  };

  return (
    <GutscheinLayout
      title={de ? "Neugeborenen-Fotoshooting Gutschein Wien" : "Newborn Photo Shoot Voucher Vienna"}
      subtitle={de ? "Die ersten kostbaren Momente Ihres Babys festhalten" : "Capture your baby's first precious moments"}
      image="https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg"
      seoTitle={`Neugeborenen-Fotoshooting Gutschein Wien – Geschenk`}
      seoDescription="Das perfekte Geschenk für werdende Eltern: Gutschein für ein professionelles Neugeborenen-Fotoshooting in Wien. Sanfte Babyfotografie im warmen Studio. Sofort per E-Mail verfügbar."
      seoKeywords="Neugeborenen Fotoshooting Gutschein Wien, Newborn Geschenk, Baby Gutschein Fotograf Wien"
      canonical="/gutschein/newborn/"
    >
      <div className="max-w-4xl mx-auto">
        {/* Content Block */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-16">
          <div className="md:grid md:grid-cols-2 items-center">
            <div className="p-8 md:p-12">
              <h2 className="text-3xl font-bold text-purple-900 mb-6">
                {de ? 'Die ersten Tage für immer festgehalten ✨' : 'The first days captured forever ✨'}
              </h2>
              <p className="text-gray-700 mb-6">
                {de ? 'Die ersten Tage mit Ihrem Neugeborenen sind kostbar und einzigartig. In unserem speziell eingerichteten, warmen Studio schaffen wir eine sichere und gemütliche Atmosphäre für zauberhafte Babyfotos.' : 'The first days with your newborn are precious and unique. In our specially equipped, warm studio we create a safe and cosy atmosphere for magical baby photos.'}
              </p>
              <ul className="space-y-4">
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  {de ? 'Spezialisiert auf Neugeborenen-Fotografie' : 'Specialised in newborn photography'}
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  {de ? 'Beste Zeit: 5-14 Tage nach der Geburt' : 'Best time: 5–14 days after birth'}
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  {de ? 'Professionelle Requisiten inklusive' : 'Professional props included'}
                </li>
              </ul>
            </div>
            <div className="relative h-96 md:h-full">
              <img 
                src="https://i.postimg.cc/7LsqZBd6/IMG-6736.jpg"
                alt="Neugeborenen-Shooting"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            </div>
          </div>
        </div>

        {/* Package Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {packages.map((pkg, index) => (
            <div 
              key={index}
              className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                pkg.isFeatured ? 'border-2 border-purple-600' : ''
              }`}
            >
              {pkg.isFeatured && (
                <div className="bg-purple-600 text-white text-center py-2">
                  <span className="text-sm font-medium">{de ? 'BESTSELLER' : 'BEST SELLER'}</span>
                </div>
              )}
              <div className="p-6">
                <h3 className="text-2xl font-bold text-purple-900 mb-2">{pkg.title}</h3>
                <p className="text-gray-600 mb-4">{pkg.subtitle}</p>
                <div className="mb-6">
                  <span className="text-gray-400 line-through text-lg">€{pkg.originalPrice}</span>
                  <span className="text-3xl font-bold text-purple-600 ml-2">€{pkg.price}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-center">
                      <Check size={20} className="text-green-500 mr-2" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => handleAddToCart(pkg)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {de ? 'Jetzt Buchen' : 'Book Now'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Studio Experience Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-purple-900 mb-8 text-center">
            {de ? 'Unsere Studio-Erlebnisse' : 'Our Studio Experiences'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {studioGrid.map((image, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="relative h-64">
                  <img 
                    src={image.url} 
                    alt={image.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <div className="text-white">
                      <h3 className="font-bold text-lg mb-1">{image.title}</h3>
                      {('description' in image) && (
                        <p className="text-sm opacity-90">{(image as any).description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <Clock size={48} className="text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">{de ? 'Flexible Termine' : 'Flexible Appointments'}</h3>
            <p className="text-gray-600">
              {de ? 'Termine nach der Geburt flexibel planbar' : 'Appointments after the birth flexibly arranged'}
            </p>
          </div>
          <div className="text-center">
            <Heart size={48} className="text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">{de ? 'Sanfte Betreuung' : 'Gentle Care'}</h3>
            <p className="text-gray-600">
              {de ? 'Spezialisiert auf Neugeborenen-Fotografie' : 'Specialised in newborn photography'}
            </p>
          </div>
          <div className="text-center">
            <Camera size={48} className="text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">{de ? 'Studio-Ausstattung' : 'Studio Equipment'}</h3>
            <p className="text-gray-600">
              {de ? 'Professionelle Requisiten und Accessoires' : 'Professional props and accessories'}
            </p>
          </div>
        </div>

        {/* Seasonal Moments Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-purple-900 mb-8 text-center">
        
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {seasonalGrid.map((image: { url: string; title: string; description?: string }, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-64">
                  <img 
                    src={image.url} 
                    alt={image.title}
                    className="w-full h-full object-cover"
                  />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                      <div className="text-white">
                        <h3 className="font-bold text-lg mb-1">{image.title}</h3>
                        {image.description && (
                          <p className="text-sm opacity-90">{image.description}</p>
                        )}
                      </div>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Special Moments Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-purple-900 mb-8 text-center">
            {de ? 'Besondere Momente' : 'Special Moments'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {specialGrid.map((image, index) => (
              <div key={index} className="relative group overflow-hidden rounded-lg shadow-lg">
                <img 
                  src={image.url} 
                  alt={image.title}
                  className="w-full h-64 object-cover transform transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-center text-white p-4">
                    <h3 className="font-bold text-xl mb-2">{image.title}</h3>
                    <p className="text-sm">{image.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Block Above Locations */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-16">
          <div className="md:grid md:grid-cols-2 items-center">
            <div className="p-8 md:p-12">
              <h2 className="text-3xl font-bold text-purple-900 mb-6">
                {de ? 'Perfekte Umgebung für Ihr Baby 📸' : 'The perfect environment for your baby 📸'}
              </h2>
              <p className="text-gray-700 mb-6">
                {de ? 'Unser speziell eingerichtetes Neugeborenen-Studio bietet die perfekte, sichere Umgebung für die ersten Fotos Ihres Babys. Mit beheizbarem Raum und professioneller Ausstattung schaffen wir optimale Bedingungen für entspannte Aufnahmen.' : 'Our specially equipped newborn studio offers the perfect, safe environment for your baby’s first photos. With a heated room and professional equipment, we create optimal conditions for relaxed shots.'}
              </p>
              <ul className="space-y-4">
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  {de ? 'Beheizbares, sicheres Studio' : 'Heated, safe studio'}
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  {de ? 'Professionelle Baby-Requisiten' : 'Professional baby props'}
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  {de ? 'Stillbereich für Mütter' : 'Nursing area for mothers'}
                </li>
              </ul>
            </div>
            <div className="relative h-96 md:h-full">
              <img 
                src="https://i.postimg.cc/GtbKgQ3F/Herbaczek-3-W5-K3552.jpg"
                alt="Neugeborenen-Studio"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            </div>
          </div>
        </div>

        {/* Location Highlights Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-purple-900 mb-8 text-center">
            {de ? 'Unsere Studios' : 'Our Studios'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {locationGrid.map((image, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="relative">
                  <img 
                    src={image.url} 
                    alt={image.title}
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-purple-900 mb-1">{image.title}</h3>
                    <p className="text-gray-600 text-sm">{image.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{de ? 'Wichtige Informationen' : 'Important Information'}</h2>
          <ul className="space-y-2 text-gray-700">
            <li>{de ? '• Gutscheine sind ab Kaufdatum 2 Jahre gültig' : '• Vouchers are valid for 2 years from the date of purchase'}</li>
            <li>{de ? '• Sonderpreise für begrenzte Zeit' : '• Special prices for a limited time'}</li>
            <li>{de ? '• Termine flexibel vereinbar' : '• Flexible appointment scheduling'}</li>
            <li>{de ? '• Beheiztes Studio für das Wohlbefinden des Babys' : '• Heated studio for your baby’s comfort'}</li>
      
 
          </ul>
        </div>
      </div>
    </GutscheinLayout>
  );
};

export default NewbornGutscheinPage;