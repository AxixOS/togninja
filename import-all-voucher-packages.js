/**
 * Import all voucher packages from hardcoded pages into database
 * This creates ~39 products from 13 different pages
 */

const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

// ALL PACKAGES EXTRACTED FROM EACH PAGE
const allPackages = [
  // ========== FAMILIE (familienfotos-wien) ==========
  {
    name: 'Family Basic',
    description: 'Ideal für kleine Familien, ein Hauptmotiv',
    price: 95,
    original_price: 195,
    category: 'Familie',
    session_type: 'Family',
    session_duration: 60,
    features: [
      '60 Min Shooting',
      '1 retuschiertes Portrait digital + Leinwand 40×30 cm',
      'Auswahlgalerie online',
      'Nutzungsrechte privat'
    ],
    image_url: 'https://i.postimg.cc/bw7ZyvPK/Familienfotoshooting-im-Fotostudio-Wien-Krexner-2777.jpg',
    page_source: '/familienfotos-wien',
    display_order: 1
  },
  {
    name: 'Family Premium',
    description: 'Ideal für größere Familien, mehrere Kombis',
    price: 195,
    original_price: 295,
    category: 'Familie',
    session_type: 'Family',
    session_duration: 90,
    features: [
      '90 Min Shooting',
      '5 retuschierte Fotos digital (Motive frei wählbar)',
      'Leinwand 40×30 cm (Motiv nach Wahl)',
      'Auswahlgalerie & Nutzungsrechte privat'
    ],
    image_url: 'https://i.postimg.cc/qRZCsv3s/00007581.jpg',
    page_source: '/familienfotos-wien',
    is_featured: true,
    display_order: 2
  },
  {
    name: 'Family Deluxe',
    description: 'Das komplette Familienerlebnis',
    price: 295,
    original_price: 395,
    category: 'Familie',
    session_type: 'Family',
    session_duration: 120,
    features: [
      '90-120 Min Shooting',
      '10 retuschierte Fotos digital',
      'Leinwand 60×40 cm (Motiv nach Wahl)',
      'Auswahlgalerie & Nutzungsrechte privat'
    ],
    image_url: 'https://i.postimg.cc/hvdhVbgn/00480020.jpg',
    page_source: '/familienfotos-wien',
    display_order: 3
  },
  
  // ========== BABY/NEWBORN (babyfotos-wien, neugeborenenfotos-wien) ==========
  {
    name: 'Mini Baby',
    description: '40 Minuten - Perfekt für kleine Momente',
    price: 170,
    original_price: 270,
    category: 'Baby',
    session_type: 'Newborn',
    session_duration: 40,
    features: [
      '1 Set',
      'Auswahlgalerie',
      '8 Retuschen'
    ],
    image_url: 'https://i.postimg.cc/mDPBzYWS/0a9a256b76eacc28798f22b9d58219e5.jpg',
    page_source: '/babyfotos-wien',
    display_order: 10
  },
  {
    name: 'Klassik Baby',
    description: '75 Minuten - Beliebt für umfangreiche Shootings',
    price: 290,
    original_price: 390,
    category: 'Baby',
    session_type: 'Newborn',
    session_duration: 75,
    features: [
      '2-3 Sets',
      '18 Retuschen',
      '6 Prints 13×18'
    ],
    image_url: 'https://i.postimg.cc/SsHqWnyb/E70I3814.jpg',
    page_source: '/babyfotos-wien',
    is_featured: true,
    display_order: 11
  },
  {
    name: 'Family & Baby Plus',
    description: '90 Minuten - Baby + Eltern/Geschwister',
    price: 420,
    original_price: 520,
    category: 'Baby',
    session_type: 'Newborn + Family',
    session_duration: 90,
    features: [
      'Baby + Eltern/Geschwister',
      '28 Retuschen',
      'Leinwand 30×40'
    ],
    image_url: 'https://i.postimg.cc/Hss3QBhH/00023276.jpg',
    page_source: '/babyfotos-wien',
    display_order: 12
  },

  // ========== NEUGEBORENEN (neugeborenenfotos-wien) ==========
  {
    name: 'Newborn Basic',
    description: 'Erste Erinnerungen',
    price: 95,
    original_price: 195,
    category: 'Baby',
    session_type: 'Newborn',
    session_duration: 60,
    features: [
      '60 Minuten Shooting',
      '1 bearbeitetes Foto als A3 Leinwand (40x30cm) + gleiches Portrait digital',
      '2 Outfits'
    ],
    image_url: 'https://i.imgur.com/QWOgLqX.jpg',
    page_source: '/neugeborenenfotos-wien',
    display_order: 13
  },
  {
    name: 'Newborn Premium',
    description: 'Umfangreiche Erinnerungen',
    price: 195,
    original_price: 295,
    category: 'Baby',
    session_type: 'Newborn',
    session_duration: 90,
    features: [
      '90 Min Shooting',
      '5 retuschierte Fotos digital (Motive frei wählbar)',
      'Leinwand 40×30 cm (Motiv nach Wahl)',
      '2-3 Sets (Wraps + Detail-Makros)'
    ],
    image_url: 'https://i.postimg.cc/mDPBzYWS/0a9a256b76eacc28798f22b9d58219e5.jpg',
    page_source: '/neugeborenenfotos-wien',
    is_featured: true,
    display_order: 14
  },
  {
    name: 'Newborn Deluxe',
    description: 'Das komplette Erlebnis',
    price: 295,
    original_price: 395,
    category: 'Baby',
    session_type: 'Newborn',
    session_duration: 120,
    features: [
      '90-120 Min Shooting',
      '10 retuschierte Lieblingsfotos digital',
      'Leinwand 60×40 cm (Motiv nach Wahl)',
      '3-4 Sets inkl. Makro-Details (Hände, Wimpern, Füßchen)'
    ],
    image_url: 'https://i.postimg.cc/SsHqWnyb/E70I3814.jpg',
    page_source: '/neugeborenenfotos-wien',
    display_order: 15
  },

  // ========== SCHWANGERSCHAFT (schwangerschaftsfotos-wien) ==========
  {
    name: 'Maternity Studio',
    description: '45 minute shoot',
    price: 249,
    original_price: 349,
    category: 'Schwangerschaft',
    session_type: 'Maternity',
    session_duration: 45,
    features: [
      '45 minute shoot',
      '15 edited images',
      'Changing room & wardrobe selection',
      'Solo or with partner'
    ],
    image_url: 'https://i.imgur.com/Vd6xtPg.jpg',
    page_source: '/schwangerschaftsfotos-wien',
    display_order: 20
  },
  {
    name: 'Maternity Premium',
    description: '90 minute shoot',
    price: 399,
    original_price: 499,
    category: 'Schwangerschaft',
    session_type: 'Maternity',
    session_duration: 90,
    features: [
      '90 minute shoot',
      '25 edited images',
      'Studio + Outdoor Mix',
      'Siblings welcome',
      'High-resolution files'
    ],
    image_url: 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg',
    page_source: '/schwangerschaftsfotos-wien',
    is_featured: true,
    display_order: 21
  },
  {
    name: 'Maternity Outdoor',
    description: '60 minute shoot',
    price: 349,
    original_price: 449,
    category: 'Schwangerschaft',
    session_type: 'Maternity Outdoor',
    session_duration: 60,
    features: [
      '60 minute shoot',
      '20 edited images',
      'Location of your choice in Vienna',
      'Natural light'
    ],
    image_url: 'https://i.postimg.cc/VLdVWs9J/DSC00059.jpg',
    page_source: '/schwangerschaftsfotos-wien',
    display_order: 22
  },

  // ========== BUSINESS PORTRAITS (business-portrait-wien) ==========
  {
    name: 'Express Headshot',
    description: 'Schnell & effizient',
    price: 95,
    original_price: 145,
    category: 'Business',
    session_type: 'Business Headshot',
    session_duration: 30,
    features: [
      '20-30 Min.',
      '1 Look/Outfit',
      '1 retuschiertes Bild (High-Res + Web)',
      'Jedes weitere Bild €30'
    ],
    image_url: 'https://i.postimg.cc/7LZM86Sz/expo-image.jpg',
    page_source: '/business-portrait-wien',
    display_order: 30
  },
  {
    name: 'Solo Pro',
    description: 'Für Professionals',
    price: 195,
    original_price: 295,
    category: 'Business',
    session_type: 'Business Professional',
    session_duration: 60,
    features: [
      '45-60 Min.',
      'Bis zu 2 Looks/Outfits',
      '5 retuschierte Bilder (High-Res + Web)',
      'Variable Hintergründe & Licht-Setups'
    ],
    image_url: 'https://i.postimg.cc/BZK5GRPm/JAGSCHTITZ-A2-L.jpg',
    page_source: '/business-portrait-wien',
    is_featured: true,
    display_order: 31
  },
  {
    name: 'Brand Upgrade',
    description: 'Maximale Vielfalt',
    price: 295,
    original_price: 395,
    category: 'Business',
    session_type: 'Business Branding',
    session_duration: 90,
    features: [
      '75-90 Min.',
      'Bis zu 3 Looks/Outfits',
      '10 retuschierte Bilder (High-Res + Web)',
      'Mehrere Hintergründe & Licht-Variationen'
    ],
    image_url: 'https://i.postimg.cc/m2WYZVQB/m9-n1214.jpg',
    page_source: '/business-portrait-wien',
    display_order: 32
  },

  // ========== EVENT FOTOGRAFIE ==========
  {
    name: 'Event Basic',
    description: 'Ihr Event professionell festgehalten',
    price: 449,
    original_price: 599,
    category: 'Event',
    session_type: 'Event Photography',
    session_duration: 120,
    features: [
      '2 Stunden Coverage',
      '50+ bearbeitete Fotos',
      'Online-Galerie',
      'Download-Link für alle Bilder'
    ],
    image_url: 'https://i.postimg.cc/6QbV9Xhm/F-HRER-70x50-L.jpg',
    page_source: '/eventfotografie',
    display_order: 40
  },
  {
    name: 'Event Premium',
    description: 'Ganztägige Event-Coverage',
    price: 999,
    original_price: 1299,
    category: 'Event',
    session_type: 'Full Day Event',
    session_duration: 360,
    features: [
      '6+ Stunden Coverage',
      '200+ bearbeitete Fotos',
      'Online-Galerie',
      '2 Fotografen',
      'Express-Bearbeitung (48h)'
    ],
    image_url: 'https://i.postimg.cc/tRwx77yy/00009094.jpg',
    page_source: '/eventfotografie',
    is_featured: true,
    display_order: 41
  },

  // ========== IMMOBILIEN (immobilienfotografie) ==========
  {
    name: 'Immobilien Basic',
    description: 'Kleine Wohnungen & Studios',
    price: 249,
    original_price: 349,
    category: 'Immobilien',
    session_type: 'Real Estate',
    session_duration: 60,
    features: [
      'Bis 60m²',
      '10-15 bearbeitete Fotos',
      'Innen und Außen',
      'High-Resolution'
    ],
    image_url: 'https://i.postimg.cc/Y2GRChZf/00508819.jpg',
    page_source: '/immobilienfotografie',
    display_order: 50
  },
  {
    name: 'Immobilien Premium',
    description: 'Wohnungen & Häuser',
    price: 449,
    original_price: 599,
    category: 'Immobilien',
    session_type: 'Real Estate Premium',
    session_duration: 120,
    features: [
      'Bis 150m²',
      '20-30 bearbeitete Fotos',
      'Innen und Außen',
      'Twilight Aufnahmen optional'
    ],
    image_url: 'https://i.postimg.cc/BZ1JJBgS/4-S8-A7739-1024x683.jpg',
    page_source: '/immobilienfotografie',
    is_featured: true,
    display_order: 51
  },

  // ========== HOCHZEIT (hochzeitsfotografie) ==========
  {
    name: 'Hochzeit Basic',
    description: 'Standesamt oder kleine Feier',
    price: 899,
    original_price: 1299,
    category: 'Hochzeit',
    session_type: 'Wedding',
    session_duration: 240,
    features: [
      '4 Stunden Coverage',
      '100+ bearbeitete Fotos',
      'Online-Galerie',
      'USB-Stick mit allen Bildern'
    ],
    image_url: 'https://i.postimg.cc/BZ1JJBgS/4-S8-A7739-1024x683.jpg',
    page_source: '/hochzeitsfotografie',
    display_order: 60
  },
  {
    name: 'Hochzeit Premium',
    description: 'Ganztägige Hochzeit',
    price: 1899,
    original_price: 2499,
    category: 'Hochzeit',
    session_type: 'Wedding Full Day',
    session_duration: 600,
    features: [
      '10 Stunden Coverage',
      '300+ bearbeitete Fotos',
      'Online-Galerie',
      '2 Fotografen',
      'Premium-Album 30x30cm'
    ],
    image_url: 'https://i.postimg.cc/BZ1JJBgS/4-S8-A7739-1024x683.jpg',
    page_source: '/hochzeitsfotografie',
    is_featured: true,
    display_order: 61
  },

  // ========== PORTRAIT (portraitfotografie-wien) ==========
  {
    name: 'Portrait Einzelperson',
    description: 'Klassisches Porträt',
    price: 149,
    original_price: 249,
    category: 'Portrait',
    session_type: 'Individual Portrait',
    session_duration: 45,
    features: [
      '30-45 Min Shooting',
      '5 bearbeitete Fotos digital',
      '1-2 Outfits',
      'Studio oder Outdoor'
    ],
    image_url: 'https://i.postimg.cc/m2WYZVQB/m9-n1214.jpg',
    page_source: '/portraitfotografie-wien',
    display_order: 70
  },
  {
    name: 'Portrait Premium',
    description: 'Umfangreiche Porträtsession',
    price: 295,
    original_price: 395,
    category: 'Portrait',
    session_type: 'Portrait Premium',
    session_duration: 90,
    features: [
      '60-90 Min Shooting',
      '15 bearbeitete Fotos digital',
      '3+ Outfits',
      'Studio + Outdoor Mix'
    ],
    image_url: 'https://i.postimg.cc/BZK5GRPm/JAGSCHTITZ-A2-L.jpg',
    page_source: '/portraitfotografie-wien',
    is_featured: true,
    display_order: 71
  }
];

async function importAllPackages() {
  console.log('\n🚀 Starting import of all voucher packages...\n');
  console.log(`📦 Total packages to import: ${allPackages.length}\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const pkg of allPackages) {
    try {
      // Check if package with similar name exists
      const existing = await sql`
        SELECT id, name FROM voucher_products 
        WHERE name = ${pkg.name}
      `;

      if (existing.length > 0) {
        console.log(`⏭️  Skipping "${pkg.name}" - already exists`);
        skipped++;
        continue;
      }

      // Generate SKU
      const sku = pkg.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Insert package
      await sql`
        INSERT INTO voucher_products (
          name, description, detailed_description, price, original_price, category, session_type,
          session_duration, image_url, slug, is_active, featured,
          display_order, validity_period, created_at, updated_at
        ) VALUES (
          ${pkg.name},
          ${pkg.description},
          ${pkg.features ? pkg.features.join('\n• ') : ''},
          ${pkg.price},
          ${pkg.original_price},
          ${pkg.category},
          ${pkg.session_type},
          ${pkg.session_duration},
          ${pkg.image_url},
          ${sku},
          true,
          ${pkg.is_featured || false},
          ${pkg.display_order},
          365,
          NOW(),
          NOW()
        )
      `;

      console.log(`✅ Imported: ${pkg.name} (${pkg.category}) - €${pkg.price}`);
      imported++;

    } catch (error) {
      console.error(`❌ Error importing "${pkg.name}":`, error.message);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(60) + '\n');

  // Show final count
  const total = await sql`SELECT COUNT(*) as count FROM voucher_products`;
  console.log(`📦 Total products in database: ${total[0].count}\n`);
}

importAllPackages()
  .then(() => {
    console.log('✅ Import complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
