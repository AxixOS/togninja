import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function createHomepageImagesTable() {
  console.log('🎨 Creating homepage_images table...');
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS homepage_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        section VARCHAR(100) NOT NULL,
        url TEXT NOT NULL,
        alt TEXT,
        title TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    console.log('✅ homepage_images table created');
    
    // Insert initial data from current frontend
    console.log('📦 Seeding initial homepage images...');
    
    await sql`
      INSERT INTO homepage_images (section, url, alt, title, sort_order, is_active)
      VALUES 
        ('hero', 'https://i.postimg.cc/wTdZVLdC/photo-grid.jpg', 'Comprehensive family portrait showcase featuring various photography styles', 'Photo Grid Showcase', 0, true),
        ('content-1', 'https://i.postimg.cc/J7bDNtGx/Familienportrat-Wien-Krchnavy-Stolz-0105-1024x683-1.jpg', 'Familienfotografie Wien - Professionelle Familienporträts im Studio', 'Family Portrait Vienna', 0, true),
        ('content-2', 'https://i.postimg.cc/76dTLg7r/business-portrait.jpg', 'Business Headshots & Corporate Photography', 'Business Headshot', 0, true),
        ('services-family', 'https://i.postimg.cc/J7bDNtGx/Familienportrat-Wien-Krchnavy-Stolz-0105-1024x683-1.jpg', 'Family Portraits in Vienna & Zurich', 'Family Service', 0, true),
        ('services-pregnancy', 'https://i.postimg.cc/Xq8wVFqb/pregnancy-photo.jpg', 'Pregnancy Photography in Vienna & Zurich', 'Pregnancy Service', 1, true),
        ('services-newborn', 'https://i.postimg.cc/QWOgLqX/newborn-baby.jpg', 'Newborn Photography in Vienna & Zurich', 'Newborn Service', 2, true),
        ('services-business', 'https://i.postimg.cc/76dTLg7r/business-portrait.jpg', 'Business Headshots', 'Business Service', 3, true),
        ('services-event', 'https://i.postimg.cc/event123/event.jpg', 'Event Photography', 'Event Service', 4, true),
        ('services-pet', 'https://i.postimg.cc/pet456/pet-portrait.jpg', 'Pet Photography', 'Pet Service', 5, true)
      ON CONFLICT DO NOTHING
    `;
    
    console.log('✅ Initial homepage images seeded');
    
    // Verify
    const count = await sql`SELECT COUNT(*) as count FROM homepage_images`;
    console.log(`📊 Total homepage images: ${count[0].count}`);
    
    console.log('\n✅ Homepage images system ready!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

createHomepageImagesTable().catch(console.error);
