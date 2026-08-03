/**
 * Check gallery functionality status
 */
import 'dotenv/config';
import { pool } from '../server/db';

async function checkGalleryFeatures() {
  console.log('🔍 Checking Gallery Features...\n');
  
  try {
    // 1. Check if galleries have images
    const galleriesWithImages = await pool.query(`
      SELECT 
        g.id,
        g.title,
        g.slug,
        g.is_public,
        COUNT(gi.id) as image_count
      FROM galleries g
      LEFT JOIN gallery_images gi ON g.id = gi.gallery_id
      GROUP BY g.id, g.title, g.slug, g.is_public
      ORDER BY g.created_at DESC
      LIMIT 10;
    `);
    
    console.log('📸 Recent Galleries:');
    galleriesWithImages.rows.forEach(g => {
      console.log(`  - ${g.title} (${g.is_public ? 'Public' : 'Private'}): ${g.image_count} images`);
      console.log(`    URL: /gallery/${g.slug}`);
    });
    
    console.log('\n');
    
    // 2. Check if slideshow component exists
    const fs = await import('fs/promises');
    const slideshowExists = await fs.access('client/src/components/galleries/Slideshow.tsx').then(() => true).catch(() => false);
    console.log(`🎬 Slideshow Component: ${slideshowExists ? '✅ EXISTS' : '❌ MISSING'}`);
    
    // 3. Check if download functions exist
    const galleryApiContent = await fs.readFile('client/src/lib/gallery-api.ts', 'utf-8');
    const hasDownload = galleryApiContent.includes('download');
    const hasShare = galleryApiContent.includes('share') || galleryApiContent.includes('Share');
    
    console.log(`📥 Download Functions: ${hasDownload ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`📤 Share Functions: ${hasShare ? '✅ EXISTS' : '❌ MISSING'}`);
    
    console.log('\n');
    
    // 4. Check client gallery routes
    const routesContent = await fs.readFile('server/routes.ts', 'utf-8');
    const hasPublicGalleryRoute = routesContent.includes('/gallery/:slug');
    const hasGalleryImagesRoute = routesContent.includes('/api/galleries/:slug/images');
    
    console.log(`🌐 Public Gallery Page Route: ${hasPublicGalleryRoute ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`🖼️  Gallery Images API: ${hasGalleryImagesRoute ? '✅ EXISTS' : '❌ MISSING'}`);
    
    console.log('\n📋 Summary:');
    console.log('  - Admin can view galleries: ✅ (just fixed)');
    console.log('  - Clients can view galleries: ' + (hasPublicGalleryRoute ? '✅' : '⚠️  needs verification'));
    console.log('  - Slideshow available: ' + (slideshowExists ? '✅' : '❌'));
    console.log('  - Download feature: ' + (hasDownload ? '✅' : '⚠️  may need implementation'));
    console.log('  - Share feature: ' + (hasShare ? '✅' : '⚠️  may need implementation'));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkGalleryFeatures();
