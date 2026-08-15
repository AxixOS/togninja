import React, { useEffect } from 'react';
import GutscheinLayout from '../../components/gutschein/GutscheinLayout';
import { Check, Clock, Heart, Camera } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

const MaternityGutscheinPage: React.FC = () => {
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
      subtitle: de ? 'Schöne Erinnerungen' : 'Beautiful memories',
      price: 95,
      originalPrice: 195,
      features: [
        de ? '60 Minuten Shooting' : '60-minute shoot',
        de ? '1 bearbeitetes Foto als A3 Leinwand (40x30cm) + gleiches Portrait digital' : '1 edited photo as an A3 canvas (40x30cm) + the same portrait as a digital file',
        de ? '2 Outfits' : '2 outfits'
      ],
      description: de ? 'Schwangerschafts Fotoshooting Basic — 1 bearbeitetes Foto als A3 Leinwand + digital, schöne Erinnerungen' : 'Maternity Photo Shoot Basic — 1 edited photo as an A3 canvas + digital, beautiful memories',
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
      description: de ? 'Schwangerschafts Fotoshooting Premium — 5 bearbeitete Fotos digital + A3 Leinwand, umfangreiche Erinnerungen' : 'Maternity Photo Shoot Premium — 5 edited digital photos + A3 canvas, extensive memories',
      imageUrl: 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg'
    },
    {
      title: 'Deluxe',
      subtitle: de ? 'Das komplette Erlebnis' : 'The complete experience',
      price: 295,
      originalPrice: 295,
      features: [
        de ? 'A2 Leinwand (60x40cm)' : 'A2 canvas (60x40cm)',
        de ? '10 bearbeitete Fotos digital (Porträts nach Wahl)' : '10 edited photos as digital files (portraits of your choice)'
      ],
      description: de ? 'Schwangerschafts Fotoshooting Deluxe — 10 bearbeitete Fotos digital + A2 Leinwand, das komplette Erlebnis' : 'Maternity Photo Shoot Deluxe — 10 edited digital photos + A2 canvas, the complete experience',
      imageUrl: 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg'
    }
  ];

  const studioGrid = [
    {
      url: "https://i.imgur.com/Vd6xtPg.jpg",
      title: de ? "Studio Schwangerschaft" : "Maternity in the studio",
      description: de ? "Professionelle Aufnahmen in unserem modernen Studio" : "Professional photos in our modern studio"
    },
    {
      url: "https://i.imgur.com/AMnhw6w.jpg",
      title: de ? "Partner + Schwangerschaft" : "Partner + maternity",
      description: de ? "Natürliche Momente in schöner Umgebung" : "Natural moments in beautiful surroundings"
    },
    {
      url: "https://i.postimg.cc/MHLVSbbf/E70-I3383-scaled.jpg",
      title: de ? "Partner Shooting" : "Partner shoot",
      description: de ? "Gemeinsame Momente festhalten" : "Capturing moments together"
    }
  ];

  const seasonalGrid = [
    {
      url: "https://i.postimg.cc/T3gmzbyh/sw-6408.jpg",
      title: de ? "Fun shooting" : "Fun shoot",
      description: de ? "Blühende Kulissen für strahlende Momente" : "Blooming backdrops for radiant moments"
    },
    {
      url: "https://i.postimg.cc/X7Z9gm4f/E70I4421.jpg",
      title: de ? "Maternity shooting" : "Maternity shoot",
      description: de ? "Warmes Licht für zauberhafte Bilder" : "Warm light for magical images"
    },
    {
      url: "https://i.postimg.cc/G2hyTSXs/E70I2880.jpg",
      title: de ? "Bauch Shooting" : "Bump shoot",
      description: de ? "Stimmungsvolle Atmosphäre" : "An atmospheric mood"
    }
  ];

  const specialGrid = [
    {
      url: "https://i.postimg.cc/VNwMmNMg/4S8A1454.jpg",
      title: de ? "Paarshooting" : "Couple shoot",
      description: de ? "Gemeinsame Vorfreude festhalten" : "Capturing shared anticipation"
    },
    {
      url: "https://i.postimg.cc/vTTfkS9d/DX4A9734.jpg",
      title: de ? "Geschwistershooting" : "Sibling shoot",
      description: de ? "Die wachsende Familie" : "The growing family"
    },
    {
      url: "https://i.postimg.cc/jdGP3cSG/R8G5393.jpg",
      title: de ? "Generationenshooting" : "Generations shoot",
      description: de ? "Drei Generationen vereint" : "Three generations together"
    }
  ];

  const locationGrid = [
    {
      url: "https://i.postimg.cc/cCvtXtyx/4-S8-A7529-58-2-2048x1365.jpg",
      title: de ? "Persönliche Vorbereitung für authentische Ergebnisse" : "Personal preparation for authentic results",
      description: de ? "Jedes Babybauch-Shooting beginnt bei uns mit einem kurzen Fragebogen und einem persönlichen Vorgespräch, damit wir Ihre Geschichte und Wünsche wirklich verstehen. Sie erhalten hilfreiche Hinweise zur Vorbereitung – von Outfit-Tipps bis hin zu Inspirationen für persönliche Accessoires wie Ultraschallbilder, kleine Babyschuhe oder Erinnerungsstücke. So entstehen Aufnahmen, die Ihre Vorfreude und Ihre Persönlichkeit liebevoll widerspiegeln." : "Every baby-bump shoot with us starts with a short questionnaire and a personal consultation so we truly understand your story and wishes. You will receive helpful preparation tips – from outfit advice to inspiration for personal accessories such as ultrasound images, tiny baby shoes or keepsakes. The result is photos that lovingly reflect your anticipation and personality."
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
    const slug = `maternity-${pkg.title.toLowerCase()}`;
    addItem({
      title: `${de ? 'Schwangerschafts Fotoshooting' : 'Maternity Photo Shoot'} - ${pkg.title}`,
      name: `Schwangerschafts Fotoshooting - ${pkg.title}`,
      productSlug: slug,
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
      title={de ? "Schwangerschafts-Fotoshooting Gutschein" : "Maternity Photo Shoot Voucher"}
      subtitle={de ? "Magische Babybauch-Momente zum Verschenken" : "Gift magical baby-bump moments"}
      image="https://i.postimg.cc/xjZzq5Mc/4S8A5701.jpg"
      seoTitle={de ? `Schwangerschafts-Fotoshooting Gutschein` : `Maternity Photo Shoot Gift Voucher`}
      seoDescription={de
        ? 'Verschenken Sie unvergessliche Erinnerungen: Gutschein für ein einfühlsames Schwangerschafts-Fotoshooting. Babybauch-Bilder. Sofort per E-Mail verfügbar.'
        : 'Give unforgettable memories: a voucher for a sensitive maternity photo shoot. Baby-bump portraits, delivered by email.'}
      seoKeywords="Schwangerschaft Fotoshooting Gutschein Wien, Babybauch Geschenk, Maternity Gutschein Fotograf Wien"
      canonical="/gutschein/maternity/"
    >
      <div className="max-w-4xl mx-auto">
        {/* Content Block */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-16">
          <div className="md:grid md:grid-cols-2 items-center">
            <div className="p-8 md:p-12">
              <h2 className="text-3xl font-bold text-purple-900 mb-6">
                {de ? 'Ihre schönsten Momente festgehalten ✨' : 'Your most beautiful moments captured ✨'}
              </h2>
              <p className="text-gray-700 mb-6">
                {de ? 'Ihre Schwangerschaft ist eine besondere Zeit voller Vorfreude und Emotionen. Wir fangen diese einzigartigen Momente in stilvollen, zeitlosen Bildern ein – ob im Studio oder an Ihrem Wunschort.' : 'Your pregnancy is a special time full of anticipation and emotion. We capture these unique moments in stylish, timeless images – whether in the studio or at a location of your choice.'}
              </p>
              <ul className="space-y-4">
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  {de ? 'Professionelle Betreuung & Styling-Beratung' : 'Professional guidance & styling advice'}
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  {de ? 'Beste Zeit: 32.-36. Schwangerschaftswoche' : 'Best time: weeks 32–36 of pregnancy'}
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  {de ? 'Partner & Familie können einbezogen werden' : 'Partner & family can be included'}
                </li>
              </ul>
            </div>
            <div className="relative h-96 md:h-full">
              <img 
                src="https://i.postimg.cc/9XgGZC5X/NIEFERGALL-A4-L-683x1024.jpg"
                alt="Schwangerschaftsshooting"
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
            <Heart size={48} className="text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">{de ? 'Professionelle Betreuung' : 'Professional Guidance'}</h3>
            <p className="text-gray-600">
              {de ? 'Spezialisiert auf Schwangerschaftsfotografie' : 'Specialised in maternity photography'}
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
                {de ? 'Persönliche Vorbereitung für authentische Ergebnisse 📸' : 'Personal preparation for authentic results 📸'}
              </h2>
              <p className="text-gray-700 mb-6">
                {de ? 'Individuell & persönlich: Jedes Schwangerschaftsshooting wird liebevoll auf Sie abgestimmt – gern auch mit Partner, Geschwistern oder zukünftigen Großeltern. Zeitlose Erinnerungen: Stilvolle, emotionale Bilder, die diese besondere Zeit festhalten – ideal als Dekoration, Geschenk oder für Ihre Social Media Profile. Einfühlsames Erlebnis: In entspannter Atmosphäre entstehen authentische Aufnahmen, die Ihre Vorfreude und Verbundenheit spürbar machen – ganz ohne Hektik.' : 'Personal & tailored: every maternity shoot is lovingly designed around you – gladly with your partner, siblings or future grandparents too. Timeless memories: stylish, emotional images that capture this special time – ideal as decor, a gift or for your social media profiles. A sensitive experience: in a relaxed atmosphere we create authentic photos that make your anticipation and closeness tangible – entirely without any rush.'}
              </p>
              <ul className="space-y-4">
                <li className="flex items-center text-gray-700">
                  
              
                </li>
                <li className="flex items-center text-gray-700">
                 
                  
                </li>
                <li className="flex items-center text-gray-700">
                
                 
                </li>
              </ul>
            </div>
            <div className="relative h-96 md:h-full">
              <img 
                src="https://i.postimg.cc/HLtMxC9g/E70I2700.jpg"
                alt="Schwangerschaftsshooting Location"
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

            <li>{de ? '• Styling-Beratung inklusive' : '• Styling consultation included'}</li>
            
          </ul>
        </div>
      </div>
    </GutscheinLayout>
  );
};

export default MaternityGutscheinPage;