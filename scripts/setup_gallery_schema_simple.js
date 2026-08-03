// Simplified gallery database schema setup
// Creates necessary tables and sample data for gallery functionality

require('dotenv').config();

async function setupGallerySchema() {
  let sql;
  
  try {
    // Initialize Neon connection
    const { neon } = require('@neondatabase/serverless');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL not found in environment variables');
      process.exit(1);
    }
    
    sql = neon(process.env.DATABASE_URL);
    console.log('✅ Connected to Neon database');
    
    // Create galleries table
    console.log('🏗️ Creating galleries table...');
    await sql`
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
    `;
    
    // Create gallery_images table
    console.log('🖼️ Creating gallery_images table...');
    await sql`
      CREATE TABLE IF NOT EXISTS gallery_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gallery_id UUID NOT NULL,
        filename TEXT NOT NULL,
        url TEXT NOT NULL,
        original_url TEXT,
        display_url TEXT,
        thumb_url TEXT,
        title TEXT,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        metadata JSONB,
        size_bytes INTEGER DEFAULT 0,
        content_type TEXT DEFAULT 'image/jpeg',
        captured_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    // Create gallery_access_logs table
    console.log('📊 Creating gallery_access_logs table...');
    await sql`
      CREATE TABLE IF NOT EXISTS gallery_access_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gallery_id UUID NOT NULL,
        visitor_email TEXT NOT NULL,
        visitor_name TEXT,
        ip_address INET,
        user_agent TEXT,
        accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    // Create gallery_favorites table
    console.log('❤️ Creating gallery_favorites table...');
    await sql`
      CREATE TABLE IF NOT EXISTS gallery_favorites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gallery_id UUID NOT NULL,
        image_id UUID NOT NULL,
        visitor_email TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    // Create indexes
    console.log('🔍 Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_galleries_slug ON galleries(slug)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_galleries_client_id ON galleries(client_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_gallery_images_gallery_id ON gallery_images(gallery_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_gallery_access_logs_gallery_id ON gallery_access_logs(gallery_id)`;
    
    // Insert sample galleries
    console.log('🎨 Creating sample galleries...');
    await sql`
      INSERT INTO galleries (title, slug, description, is_public, is_password_protected, password) 
      VALUES 
        ('Wedding Photography', 'wedding-photos', 'Beautiful wedding moments captured with passion and artistry', true, true, 'wedding2024'),
        ('Family Portraits', 'family-portraits', 'Heartwarming family photography sessions in Vienna', true, false, null),
        ('Corporate Events', 'corporate-events', 'Professional corporate photography and event documentation', true, true, 'corporate123'),
        ('Street Photography', 'street-photography', 'Urban life and culture captured through the lens', true, false, null),
        ('Nature & Landscapes', 'nature-landscapes', 'Stunning natural beauty from around Austria', true, false, null)
      ON CONFLICT (slug) DO NOTHING
    `;
    
    // Get gallery IDs and insert sample images
    console.log('🖼️ Creating sample images...');
    
    const weddingGallery = await sql`SELECT id FROM galleries WHERE slug = 'wedding-photos'`;
    if (weddingGallery.length > 0) {
      const galleryId = weddingGallery[0].id;
      await sql`
        INSERT INTO gallery_images (gallery_id, filename, url, title, description, sort_order) VALUES
        (${galleryId}, 'wedding_ceremony.jpg', 'https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', 'Wedding Ceremony', 'Beautiful ceremony moments', 0),
        (${galleryId}, 'bridal_portrait.jpg', 'https://images.unsplash.com/photo-1594736797933-d0e501ba2fe6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', 'Bridal Portrait', 'Elegant bridal photography', 1),
        (${galleryId}, 'wedding_rings.jpg', 'https://images.unsplash.com/photo-1606800052052-a08af7148866?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', 'Wedding Rings', 'Beautiful ring detail shots', 2)
        ON CONFLICT DO NOTHING
      `;
    }
    
    const familyGallery = await sql`SELECT id FROM galleries WHERE slug = 'family-portraits'`;
    if (familyGallery.length > 0) {
      const galleryId = familyGallery[0].id;
      await sql`
        INSERT INTO gallery_images (gallery_id, filename, url, title, description, sort_order) VALUES
        (${galleryId}, 'family_park.jpg', 'https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', 'Family in Park', 'Happy family moments in nature', 0),
        (${galleryId}, 'children_playing.jpg', 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', 'Children Playing', 'Candid children photography', 1),
        (${galleryId}, 'family_portrait.jpg', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', 'Family Portrait', 'Professional family portrait', 2)
        ON CONFLICT DO NOTHING
      `;
    }
    
    const natureGallery = await sql`SELECT id FROM galleries WHERE slug = 'nature-landscapes'`;
    if (natureGallery.length > 0) {
      const galleryId = natureGallery[0].id;
      await sql`
        INSERT INTO gallery_images (gallery_id, filename, url, title, description, sort_order) VALUES
        (${galleryId}, 'mountain_vista.jpg', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', 'Mountain Vista', 'Stunning alpine landscape', 0),
        (${galleryId}, 'forest_path.jpg', 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', 'Forest Path', 'Peaceful forest trail', 1),
        (${galleryId}, 'lake_reflection.jpg', 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', 'Lake Reflection', 'Perfect mirror lake', 2)
        ON CONFLICT DO NOTHING
      `;
    }
    
    // Update gallery cover images
    console.log('🎨 Setting gallery cover images...');
    await sql`
      UPDATE galleries SET cover_image = (
        SELECT url FROM gallery_images 
        WHERE gallery_id = galleries.id 
        ORDER BY sort_order LIMIT 1
      ) WHERE cover_image IS NULL
    `;
    
    // Verify the setup
    const galleryCount = await sql`SELECT COUNT(*) as count FROM galleries`;
    const imageCount = await sql`SELECT COUNT(*) as count FROM gallery_images`;
    
    console.log('✅ Gallery schema setup completed successfully!');
    console.log(`🎨 Galleries created: ${galleryCount[0]?.count || 0}`);
    console.log(`🖼️ Images created: ${imageCount[0]?.count || 0}`);
    
    console.log('\n🚀 Gallery system is ready to use!');
    console.log('   • Visit /galleries to see the gallery overview');
    console.log('   • Visit /gallery/wedding-photos to test password protection (password: wedding2024)');
    console.log('   • Visit /gallery/family-portraits to test public access');
    console.log('   • Visit /gallery/nature-landscapes for nature photography');
    
  } catch (error) {
    console.error('❌ Error setting up gallery schema:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupGallerySchema();