require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const backblazeImages = [
  {
    section: 'hero',
    image_url: 'https://f005.backblazeb2.com/file/newage-crm-assets/hero-image.jpg',
    title: 'Professional Photography Vienna',
    display_order: 1
  },
  {
    section: 'content-1',
    image_url: 'https://f005.backblazeb2.com/file/newage-crm-assets/family-portrait.jpg',
    title: 'Family Photography',
    display_order: 1
  },
  {
    section: 'content-2',
    image_url: 'https://f005.backblazeb2.com/file/newage-crm-assets/business-headshot.jpg',
    title: 'Business Portraits',
    display_order: 1
  },
  {
    section: 'services-family',
    image_url: 'https://f005.backblazeb2.com/file/newage-crm-assets/service-family.jpg',
    title: 'Family Sessions',
    display_order: 1
  },
  {
    section: 'services-pregnancy',
    image_url: 'https://f005.backblazeb2.com/file/newage-crm-assets/service-pregnancy.jpg',
    title: 'Maternity Photography',
    display_order: 2
  },
  {
    section: 'services-newborn',
    image_url: 'https://f005.backblazeb2.com/file/newage-crm-assets/service-newborn.jpg',
    title: 'Newborn Photography',
    display_order: 3
  },
  {
    section: 'services-business',
    image_url: 'https://f005.backblazeb2.com/file/newage-crm-assets/service-business.jpg',
    title: 'Business Photography',
    display_order: 4
  },
  {
    section: 'services-event',
    image_url: 'https://f005.backblazeb2.com/file/newage-crm-assets/service-event.jpg',
    title: 'Event Photography',
    display_order: 5
  },
  {
    section: 'services-product',
    image_url: 'https://f005.backblazeb2.com/file/newage-crm-assets/service-product.jpg',
    title: 'Product Photography',
    display_order: 6
  }
];

(async () => {
  try {
    console.log('🔄 Seeding homepage images with Backblaze URLs...');
    
    // Clear existing data
    await sql`DELETE FROM homepage_images`;
    console.log('✅ Cleared existing images');
    
    // Insert new data
    for (const img of backblazeImages) {
      await sql`
        INSERT INTO homepage_images (section, image_url, title, display_order, is_active)
        VALUES (${img.section}, ${img.image_url}, ${img.title}, ${img.display_order}, true)
      `;
      console.log(`✅ Added ${img.section}: ${img.title}`);
    }
    
    console.log('\n✅ Successfully seeded', backblazeImages.length, 'homepage images');
    
    // Verify
    const count = await sql`SELECT COUNT(*) as count FROM homepage_images WHERE is_active = true`;
    console.log('📊 Active images in database:', count[0].count);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
})();
