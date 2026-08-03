/**
 * Check what image URLs are stored in the database
 */
import 'dotenv/config';
import { pool } from '../server/db';

async function checkImageURLs() {
  try {
    console.log('🔍 Checking Wedding Photography gallery images...\n');
    
    const images = await pool.query(`
      SELECT 
        gi.*
      FROM gallery_images gi
      JOIN galleries g ON g.id = gi.gallery_id
      WHERE g.slug = 'wedding-photos'
      LIMIT 5
    `);
    
    if (images.rows.length === 0) {
      console.log('❌ No images found in database for Wedding Photography gallery');
      console.log('\n💡 The API will return sample Unsplash images instead');
    } else {
      console.log(`✅ Found ${images.rows.length} images in database:\n`);
      images.rows.forEach((img, i) => {
        console.log(`${i + 1}. ${img.filename || 'No filename'}`);
        console.log(`   Columns:`, Object.keys(img).join(', '));
        console.log(`   Data:`, JSON.stringify(img, null, 2));
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkImageURLs();
