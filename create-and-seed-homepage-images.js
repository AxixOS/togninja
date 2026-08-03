require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    console.log('🔧 Creating homepage_images table...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS homepage_images (
        id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
        section TEXT NOT NULL,
        image_url TEXT NOT NULL,
        title TEXT,
        description TEXT,
        cta_text TEXT,
        cta_link TEXT,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_homepage_images_section ON homepage_images(section)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_homepage_images_active ON homepage_images(is_active)`;
    
    console.log('✅ Table created successfully');
    
    // Now seed with Backblaze URLs
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
    
    console.log('🔄 Seeding with Backblaze images...');
    
    for (const img of backblazeImages) {
      await sql`
        INSERT INTO homepage_images (section, image_url, title, display_order, is_active)
        VALUES (${img.section}, ${img.image_url}, ${img.title}, ${img.display_order}, true)
      `;
      console.log(`✅ Added ${img.section}: ${img.title}`);
    }
    
    const count = await sql`SELECT COUNT(*) as count FROM homepage_images WHERE is_active = true`;
    console.log('\n✅ Successfully seeded', count[0].count, 'images from Backblaze');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
})();
