import React, { useEffect } from 'react';
import GutscheinLayout from '../../components/gutschein/GutscheinLayout';
import { Check, Clock, Users, Camera, Heart } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

const FamilyGutscheinPage: React.FC = () => {
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
      title: 'Family Basic',
      subtitle: de ? 'Perfect for Small Families' : 'Perfect for small families',
      price: 95,
      originalPrice: 195,
      features: [
        de ? '60 Minuten Shooting' : '60-minute shoot',
        de ? '1 bearbeitetes Foto als A3 Leinwand (40x30cm) + gleiches Portrait digital' : '1 edited photo as an A3 canvas (40x30cm) + the same portrait as a digital file',
        de ? '2 Outfits' : '2 outfits'
      ],
      description: de ? 'Familienfotografie Basic — 1 bearbeitetes Foto als A3 Leinwand + digital, ideal für kleine Familien' : 'Family Photography Basic — 1 edited photo as an A3 canvas + digital, ideal for small families',
      imageUrl: 'https://i.imgur.com/jSFqBCq.jpg'
    },
    {
      title: 'Family Premium',
      subtitle: de ? 'Ideal für größere Familien' : 'Ideal for larger families',
      price: 195,
      originalPrice: 295,
      features: [
        de ? '5 bearbeitete Fotos digital (Porträts nach Wahl)' : '5 edited photos as digital files (portraits of your choice)',
        de ? 'A3 Leinwand (40x30cm)' : 'A3 canvas (40x30cm)'
      ],
      isFeatured: true,
      description: de ? 'Familienfotografie Premium — 5 bearbeitete Fotos digital + A3 Leinwand, perfekt für größere Familien' : 'Family Photography Premium — 5 edited digital photos + A3 canvas, perfect for larger families',
      imageUrl: 'https://i.imgur.com/jSFqBCq.jpg'
    },
    {
      title: 'Family Deluxe',
      subtitle: de ? 'Das komplette Familienerlebnis' : 'The complete family experience',
      price: 295,
      originalPrice: 395,
      features: [
        de ? 'A2 Leinwand (60x40cm)' : 'A2 canvas (60x40cm)',
        de ? '10 bearbeitete Fotos digital (Porträts nach Wahl)' : '10 edited photos as digital files (portraits of your choice)'
      ],
      description: de ? 'Familienfotografie Deluxe — 10 bearbeitete Fotos digital + A2 Leinwand, das komplette Familienerlebnis' : 'Family Photography Deluxe — 10 edited digital photos + A2 canvas, the complete family experience',
      imageUrl: 'https://i.imgur.com/jSFqBCq.jpg'
    }
  ];

  const studioGrid = [
    {
      url: "https://i.postimg.cc/qRZCsv3s/00007581.jpg",
      title: de ? "Familienshooting im Studio" : "Family shoot in the studio",
      description: de ? "Professionelle Aufnahmen in unserem modernen Studio" : "Professional photos in our modern studio"
    },
    {
      url: "https://i.postimg.cc/hvdhVbgn/00480020.jpg",
      title: de ? "Festive Familienshooting" : "Festive family shoot",
      description: de ? "Natürliche Momente in schöner Umgebung" : "Natural moments in beautiful surroundings"
    },
    {
      url: "https://i.imgur.com/puVF0cD.jpg",
      title: de ? "Generationen Fotoshooting" : "Generations photo shoot",
      description: de ? "Besondere Momente mit der ganzen Familie" : "Special moments with the whole family"
    }
  ];

  const seasonalGrid = [
    {
      url: "https://i.postimg.cc/7LZM86Sz/expo-image.jpg",
      title: de ? "Hobbie shooting" : "Hobby shoot",
      description: de ? "Blühende Landschaften als perfekte Kulisse" : "Blooming landscapes as the perfect backdrop"
    },
    {
      url: "https://i.postimg.cc/BZK5GRPm/JAGSCHTITZ-A2-L.jpg",
      title: de ? "Familenshooting" : "Family shoot",
      description: de ? "Goldene Stunden im warmen Sonnenlicht" : "Golden hours in warm sunlight"
    },
    {
      url: "https://i.postimg.cc/m2WYZVQB/m9-n1214.jpg",
      title: de ? "Babyshooting" : "Baby shoot",
      description: de ? "Warme Farben und gemütliche Atmosphäre" : "Warm colours and a cosy atmosphere"
    }
  ];

  const specialGrid = [
    {
      url: "https://i.postimg.cc/6QbV9Xhm/F-HRER-70x50-L.jpg",
      title: de ? "Geburtstag" : "Birthdays",
      description: de ? "Unvergessliche Geburtstagsmomente" : "Unforgettable birthday moments"
    },
    {
      url: "https://i.postimg.cc/tRwx77yy/00009094.jpg",
      title: de ? "Familientreffen" : "Family reunions",
      description: de ? "Große Familientreffen festhalten" : "Capturing big family get-togethers"
    },
    {
      url: "https://i.postimg.cc/Y2GRChZf/00508819.jpg",
      title: de ? "Jubiläen" : "Anniversaries",
      description: de ? "Besondere Meilensteine feiern" : "Celebrating special milestones"
    }
  ];

  const locationGrid = [
    {
      url: "https://i.postimg.cc/3RyXNcSJ/Mechtler-A3-Lein.jpg",
      title: de ? "Persönliche Vorbereitung für authentische Ergebnisse" : "Personal preparation for authentic results",
      description: de ? "Jedes Fotoshooting beginnt bei uns mit einem kurzen Fragebogen und einem persönlichen Vorgespräch, damit wir Ihre Familie wirklich kennenlernen. Zusätzlich erhalten Sie hilfreiche Hinweise zur Vorbereitung – inklusive Tipps zur Kleidung und Inspiration, persönliche Gegenstände wie Sportausrüstung oder Musikinstrumente mitzubringen. So entstehen Aufnahmen, die Ihre Persönlichkeit zum Ausdruck bringen." : "Every photo shoot with us starts with a short questionnaire and a personal consultation so we can truly get to know your family. You will also receive helpful preparation tips – including clothing advice and inspiration to bring personal items such as sports gear or musical instruments. The result is photos that truly express your personality."
    },
    {
      url: "https://i.postimg.cc/W3x846Tr/220318-das-Create0012-1.jpg",
      title: de ? "Die große Enthüllung auf der Kinoleinwand" : "The big reveal on the cinema screen",
      description: de ? "Nach dem Shooting erwartet Sie ein besonderes Erlebnis: die Präsentation Ihrer Familienporträts auf großer Leinwand – ein interaktiver Moment voller Emotionen in entspannter, stilvoller Atmosphäre. Auf Wunsch ist diese Bildauswahl auch noch am selben Tag möglich." : "After the shoot, a special experience awaits you: your family portraits presented on the big screen – an interactive, emotional moment in a relaxed, stylish atmosphere. On request, this image selection can even take place on the same day."
    },
    {
      url: "https://i.postimg.cc/KzWLNZWy/zjezrez.jpg",
      title: de ? "Handwerklich gefertigte Qualität – mit Liebe geliefert" : "Handcrafted quality – delivered with love",
      description: de ? "Jedes Portrait wird bei uns sorgfältig bearbeitet, farboptimiert und qualitätsgeprüft. Ihre fertigen Bilder erhalten Sie als hochwertige Drucke per versichertem Versand – die Lieferung ist für Sie selbstverständlich kostenlos." : "Every portrait is carefully edited, colour-optimised and quality-checked. Your finished images arrive as premium prints via insured shipping – delivery is of course free of charge."
    }
  ];

  const handleAddToCart = (pkg: typeof packages[0]) => {
    addItem({
      name: `Family ${pkg.title}`,
      productSlug: pkg.title.toLowerCase().includes('basic') ? 'family-basic' : (pkg.title.toLowerCase().includes('premium') ? 'family-premium' : 'family-deluxe'),
      // Use slug-like identifier to support product-specific coupons
      // Note: Cart context doesn't persist productId; we embed in title for server validation via name
      title: `${de ? 'Familien Fotoshooting' : 'Family Photo Shoot'} - ${pkg.title}`,
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
      title={de ? "Familien-Fotoshooting Gutschein Wien" : "Family Photo Shoot Voucher Vienna"}
      subtitle={de ? "Unvergessliche Momente für die ganze Familie verschenken" : "Gift unforgettable moments for the whole family"}
      image="https://i.imgur.com/o9HCqp0.jpg"
      seoTitle={`Familien-Fotoshooting Gutschein Wien – Geschenkidee`}
      seoDescription="Verschenken Sie Familienglück: Gutschein für ein professionelles Familien-Fotoshooting in Wien. Sofort per E-Mail, 3 Jahre gültig. Ab €95 – das perfekte Geschenk für jeden Anlass."
      seoKeywords="Familien Fotoshooting Gutschein Wien, Familienfotos Geschenk, Gutschein Familie Fotograf Wien"
      canonical="/gutschein/family/"
    >
      <div className="max-w-4xl mx-auto">
        {/* Content Block */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-16">
          <div className="md:grid md:grid-cols-2 items-center">
            <div className="p-8 md:p-12">
              <h2 className="text-3xl font-bold text-purple-900 mb-6">
                {de ? 'Ihr Moment, Ihr Zauber! ✨' : 'Your moment, your magic! ✨'}
              </h2>
              <p className="text-gray-700 mb-6">
                {de ? <>Bei {SITE.name} entstehen keine gestellten Posen – sondern Bilder, die eure Geschichte erzählen.
                Ob im hellen Studio in Wien oder draußen an eurem Lieblingsort – wir halten fest, was euch als Familie ausmacht:
                Lachen, Nähe, kleine Gesten.</> : <>At {SITE.name} there are no stiff, staged poses – just images that tell your story.
                Whether in our bright studio or outdoors at your favourite spot, we capture what makes you a family:
                laughter, closeness, little gestures.</>}
              </p>
              <ul className="space-y-4">
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  {de ? 'Entspannte Atmosphäre für natürliche Aufnahmen' : 'Relaxed atmosphere for natural photos'}
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  {de ? 'Moderne Studios & ausgewählte Outdoor-Locations' : 'Modern studios & hand-picked outdoor locations'}
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  {de ? 'Flexible Terminvereinbarung, auch am Wochenende' : 'Flexible scheduling, weekends included'}
                </li>
              </ul>
            </div>
            <div className="relative h-96 md:h-full">
              <img 
                src="https://i.postimg.cc/GpjM3s5h/4-S8-A8377-2.jpg"
                alt="Familie beim Fotoshooting"
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
                      <p className="text-sm opacity-90">{image.description}</p>
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
              {de ? 'Termine auch am Wochenende verfügbar' : 'Appointments available on weekends too'}
            </p>
          </div>
          <div className="text-center">
            <Users size={48} className="text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">{de ? 'Für die ganze Familie' : 'For the Whole Family'}</h3>
            <p className="text-gray-600">
              {de ? 'Alle Familienmitglieder willkommen' : 'All family members welcome'}
            </p>
          </div>
          <div className="text-center">
            <Camera size={48} className="text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">{de ? 'Professionelle Ausrüstung' : 'Professional Equipment'}</h3>
            <p className="text-gray-600">
              {de ? 'Beste Qualität für bleibende Erinnerungen' : 'Top quality for lasting memories'}
            </p>
          </div>
        </div>

        {/* Seasonal Moments Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-purple-900 mb-8 text-center">
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {seasonalGrid.map((image, index) => (
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
                      <p className="text-sm opacity-90">{image.description}</p>
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
            {de ? 'Besondere Anlässe' : 'Special Occasions'}
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
                {de ? <>Warum ein Familienportrait mit {SITE.name}? 📸</> : <>Why a family portrait with {SITE.name}? 📸</>}
              </h2>
              <p className="text-gray-700 mb-6">
               
              </p>
              <ul className="space-y-4">
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  {de ? 'Individuell & persönlich: Jedes Shooting wird auf Ihre Familie zugeschnitten – mit Platz für bis zu 16 Personen und Haustiere.' : 'Personal & tailored: every shoot is designed around your family – with room for up to 16 people and pets.'}
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  {de ? 'Zeitlose Portraits: Hochwertige Bilder, die Ihr Zuhause schmücken und sich ideal als Geschenke oder für Social Media eignen.' : 'Timeless portraits: high-quality images that adorn your home and make ideal gifts or social media posts.'}
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  {de ? 'Unvergessliches Erlebnis: Ein entspanntes Fotoshooting, das Spaß macht – mit Erinnerungen, die ein Leben lang halten.' : 'An unforgettable experience: a relaxed, fun photo shoot – with memories that last a lifetime.'}
                </li>
              </ul>
            </div>
            <div className="relative h-96 md:h-full">
              <img 
                src="https://i.postimg.cc/L82CcTx0/E70I9183.jpg"
                alt="Familie im Stadtpark"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            </div>
          </div>
        </div>

        {/* Location Highlights Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-purple-900 mb-8 text-center">
     
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
            <li>{de ? '• Shooting-Locations in Wien und Umgebung' : '• Shooting locations in Vienna and the surrounding area'}</li>
            <li>{de ? '• Beratung zur Outfit-Wahl inklusive' : '• Outfit consultation included'}</li>
          </ul>
        </div>
      </div>
    </GutscheinLayout>
  );
};

export default FamilyGutscheinPage;