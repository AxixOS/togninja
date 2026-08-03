// Gallery database setup - creates tables and sample data
import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function setupGallerySchema() {
  try {
    console.log('🏗️ Setting up gallery tables in Neon...\n');

    // Create galleries table
    console.log('📋 Creating galleries table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS galleries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        cover_image TEXT,
        is_public BOOLEAN DEFAULT true,
        is_password_protected BOOLEAN DEFAULT false,
        password TEXT,
        client_id UUID,
        created_by UUID,
        sort_order INTEGER DEFAULT 0,
        download_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Galleries table created');

    // Create gallery_images table
    console.log('📋 Creating gallery_images table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gallery_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        url TEXT NOT NULL,
        title TEXT,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Gallery images table created');

    // Create gallery_access_logs table
    console.log('📋 Creating gallery_access_logs table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gallery_access_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
        visitor_email TEXT NOT NULL,
        visitor_name TEXT,
        ip_address TEXT,
        user_agent TEXT,
        accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Gallery access logs table created');

    // Create gallery_favorites table
    console.log('📋 Creating gallery_favorites table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gallery_favorites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
        image_id UUID NOT NULL REFERENCES gallery_images(id) ON DELETE CASCADE,
        visitor_email TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(image_id, visitor_email)
      )
    `);
    console.log('✅ Gallery favorites table created');

    // Create indexes
    console.log('📋 Creating indexes...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_galleries_slug ON galleries(slug)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_galleries_client_id ON galleries(client_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_gallery_images_gallery_id ON gallery_images(gallery_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_gallery_access_logs_gallery_id ON gallery_access_logs(gallery_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_gallery_favorites_image_id ON gallery_favorites(image_id)`);
    console.log('✅ Indexes created');

    // Insert sample galleries
    console.log('\n🎨 Creating sample galleries...');
    await db.execute(sql`
      INSERT INTO galleries (title, slug, description, is_public, is_password_protected, password, cover_image) 
      VALUES 
        (
          'Wedding Photography', 
          'wedding-photos', 
          'Beautiful wedding moments captured with passion and artistry - Password protected gallery', 
          true, 
          true, 
          'wedding2024',
          'https://images.unsplash.com/photo-1519741497674-611481863552?w=800'
        ),
        (
          'Family Portraits', 
          'family-portraits', 
          'Heartwarming family photography sessions in Vienna', 
          true, 
          false, 
          null,
          'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800'
        ),
        (
          'Nature & Landscapes', 
          'nature-landscapes', 
          'Stunning natural beauty from around Austria', 
          true, 
          false, 
          null,
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'
        )
      ON CONFLICT (slug) DO NOTHING
    `);
    console.log('✅ Sample galleries created');

    // Get gallery IDs and insert sample images
    console.log('🖼️ Creating sample images...');
    
    const result = await db.execute(sql`SELECT id FROM galleries WHERE slug = 'wedding-photos'`);
    if (result.rows && result.rows.length > 0) {
      const galleryId = result.rows[0].id;
      await db.execute(sql`
        INSERT INTO gallery_images (gallery_id, filename, url, title, description, sort_order) VALUES
        (${galleryId}, 'wedding_ceremony.jpg', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200', 'Wedding Ceremony', 'Beautiful ceremony moments', 0),
        (${galleryId}, 'bridal_portrait.jpg', 'https://images.unsplash.com/photo-1594736797933-d0e501ba2fe6?w=1200', 'Bridal Portrait', 'Elegant bridal photography', 1),
        (${galleryId}, 'wedding_rings.jpg', 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1200', 'Wedding Rings', 'Beautiful ring detail shots', 2),
        (${galleryId}, 'first_dance.jpg', 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200', 'First Dance', 'Magical first dance moment', 3),
        (${galleryId}, 'bouquet.jpg', 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1200', 'Wedding Bouquet', 'Beautiful floral arrangement', 4)
        ON CONFLICT DO NOTHING
      `);
      console.log('  ✅ Added 5 wedding photos');
    }

    const familyResult = await db.execute(sql`SELECT id FROM galleries WHERE slug = 'family-portraits'`);
    if (familyResult.rows && familyResult.rows.length > 0) {
      const galleryId = familyResult.rows[0].id;
      await db.execute(sql`
        INSERT INTO gallery_images (gallery_id, filename, url, title, description, sort_order) VALUES
        (${galleryId}, 'family_park.jpg', 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1200', 'Family in Park', 'Happy family moments in nature', 0),
        (${galleryId}, 'children_playing.jpg', 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1200', 'Children Playing', 'Candid children photography', 1),
        (${galleryId}, 'family_portrait.jpg', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=1200', 'Family Portrait', 'Professional family portrait', 2),
        (${galleryId}, 'siblings.jpg', 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=1200', 'Siblings', 'Sweet sibling moments', 3)
        ON CONFLICT DO NOTHING
      `);
      console.log('  ✅ Added 4 family portraits');
    }

    const natureResult = await db.execute(sql`SELECT id FROM galleries WHERE slug = 'nature-landscapes'`);
    if (natureResult.rows && natureResult.rows.length > 0) {
      const galleryId = natureResult.rows[0].id;
      await db.execute(sql`
        INSERT INTO gallery_images (gallery_id, filename, url, title, description, sort_order) VALUES
        (${galleryId}, 'mountain_vista.jpg', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200', 'Mountain Vista', 'Stunning alpine landscape', 0),
        (${galleryId}, 'forest_path.jpg', 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200', 'Forest Path', 'Peaceful forest trail', 1),
        (${galleryId}, 'lake_reflection.jpg', 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200', 'Lake Reflection', 'Perfect mirror lake', 2),
        (${galleryId}, 'sunset_mountains.jpg', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200', 'Sunset Mountains', 'Golden hour in the alps', 3),
        (${galleryId}, 'waterfall.jpg', 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1200', 'Alpine Waterfall', 'Majestic waterfall', 4),
        (${galleryId}, 'meadow_flowers.jpg', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1200', 'Alpine Meadow', 'Colorful mountain flowers', 5)
        ON CONFLICT DO NOTHING
      `);
      console.log('  ✅ Added 6 nature photos');
    }

    // Verify the setup
    const galleryCount = await db.execute(sql`SELECT COUNT(*) as count FROM galleries`);
    const imageCount = await db.execute(sql`SELECT COUNT(*) as count FROM gallery_images`);
    
    console.log('\n✅ Gallery schema setup completed successfully!');
    console.log(`🎨 Galleries: ${galleryCount.rows[0]?.count || 0}`);
    console.log(`🖼️ Images: ${imageCount.rows[0]?.count || 0}`);
    
    console.log('\n🚀 Gallery system is ready to use!');
    console.log('   📍 Public galleries: http://localhost:5001/galleries');
    console.log('   🔒 Password protected: http://localhost:5001/gallery/wedding-photos (password: wedding2024)');
    console.log('   👨‍👩‍👧 Family portraits: http://localhost:5001/gallery/family-portraits');
    console.log('   🏔️ Nature landscapes: http://localhost:5001/gallery/nature-landscapes');
    console.log('   ⚙️ Admin dashboard: http://localhost:5001/admin/galleries');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error setting up gallery schema:', error instanceof Error ? error.message : String(error));
    console.error(error);
    process.exit(1);
  }
}

// Run the setup
setupGallerySchema();
