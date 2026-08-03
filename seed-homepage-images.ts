
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

const homepageImages = [
  // FAQ Section Images
  {
    section: 'faq',
    image_url: 'https://i.postimg.cc/D09JNp5m/00014518.jpg',
    title: 'Was macht Ihren Fotografie-Stil so besonders?',
    description: 'Unique photography style that captures authentic moments',
    display_order: 1
  },
  {
    section: 'faq',
    image_url: 'https://i.postimg.cc/YqFdbhxq/00505458.jpg',
    title: 'Wo finden die Fotoshootings statt?',
    description: 'Studio and outdoor locations in Vienna',
    display_order: 2
  },
  {
    section: 'faq',
    image_url: 'https://i.postimg.cc/66k02BNs/00509892.jpg',
    title: 'Wie bereite ich mich auf ein Fotoshooting vor?',
    description: 'Professional guidance for photoshoot preparation',
    display_order: 3
  },
  {
    section: 'faq',
    image_url: 'https://i.postimg.cc/W1Pq6KhH/00015672.jpg',
    title: 'Wie lange dauert ein Familienfotoshooting?',
    description: 'Typical family photoshoot duration and process',
    display_order: 4
  },
  {
    section: 'faq',
    image_url: 'https://i.postimg.cc/7Y1g57V7/RJGOQBO.jpg',
    title: 'Können unsere Haustiere mit aufs Foto?',
    description: 'Pet-friendly photoshoots available',
    display_order: 5
  },
  {
    section: 'faq',
    image_url: 'https://i.postimg.cc/Wb070x2d/brother-sister-close-up-30x20-L.jpg',
    title: 'Wie schaffen Sie eine angenehme Atmosphäre?',
    description: 'Creating comfortable atmosphere for authentic photos',
    display_order: 6
  },
  // Hero Section
  {
    section: 'hero',
    image_url: 'https://i.postimg.cc/wTdZVLdC/photo-grid.jpg',
    title: 'Familienmomente festhalten',
    description: 'Professionelle Familienfotografie in Wien',
    cta_text: 'Jetzt Termin buchen',
    cta_link: '/booking',
    display_order: 1
  },
  // Gallery Section
  {
    section: 'gallery',
    image_url: 'https://i.imgur.com/BScsxGX.jpg',
    title: 'Schwangerschaftsfotos',
    description: 'Wunderschöne Erinnerungen an diese besondere Zeit',
    display_order: 1
  },
  {
    section: 'gallery',
    image_url: 'https://i.imgur.com/HGZGIGX.jpg',
    title: 'Familienportraits',
    description: 'Authentische Momente mit Ihren Liebsten',
    display_order: 2
  },
  {
    section: 'gallery',
    image_url: 'https://i.imgur.com/fcFwAhs.jpg',
    title: 'Neugeborenenfotos',
    description: 'Die ersten Tage Ihres Babys für die Ewigkeit',
    display_order: 3
  }
];

async function seedHomepageImages() {
  try {
    console.log('🌱 Seeding homepage images...');
    
    // Clear existing images (optional - remove if you want to keep existing data)
    // await sql`DELETE FROM homepage_images`;
    
    for (const image of homepageImages) {
      const existing = await sql`
        SELECT id FROM homepage_images 
        WHERE section = ${image.section} AND image_url = ${image.image_url}
      `;
      
      if (existing.length === 0) {
        await sql`
          INSERT INTO homepage_images (
            section, image_url, title, description, cta_text, cta_link, display_order, is_active
          ) VALUES (
            ${image.section},
            ${image.image_url},
            ${image.title},
            ${image.description || null},
            ${image.cta_text || null},
            ${image.cta_link || null},
            ${image.display_order},
            true
          )
        `;
        console.log(`✅ Added: ${image.section} - ${image.title}`);
      } else {
        console.log(`⏭️  Skipped (exists): ${image.section} - ${image.title}`);
      }
    }
    
    console.log('✅ Homepage images seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding homepage images:', error);
    process.exit(1);
  }
}

seedHomepageImages();
