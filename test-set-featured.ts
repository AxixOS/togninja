import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function testSetFeaturedImage() {
  // Get a gallery and one of its images
  const galleries = await sql`SELECT id, title FROM galleries LIMIT 1`;
  if (galleries.length === 0) {
    console.log('No galleries found');
    return;
  }
  
  const gallery = galleries[0];
  console.log('Gallery:', gallery);
  
  const images = await sql`SELECT id, filename FROM gallery_images WHERE gallery_id = ${gallery.id} LIMIT 1`;
  if (images.length === 0) {
    console.log('No images found for this gallery');
    return;
  }
  
  const image = images[0];
  console.log('Image:', image);
  
  // Set featured image
  const result = await sql`
    UPDATE galleries 
    SET featured_image_id = ${image.id}
    WHERE id = ${gallery.id}
    RETURNING id, title, featured_image_id
  `;
  
  console.log('\nFeatured image set:', JSON.stringify(result, null, 2));
  
  // Verify by fetching with JOIN
  const verify = await sql`
    SELECT 
      g.id as gallery_id,
      g.title,
      g.featured_image_id,
      gi.filename as featured_image_filename
    FROM galleries g
    LEFT JOIN gallery_images gi ON g.featured_image_id = gi.id
    WHERE g.id = ${gallery.id}
  `;
  
  console.log('\nVerification:', JSON.stringify(verify, null, 2));
}

testSetFeaturedImage().catch(console.error);
