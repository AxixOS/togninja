import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function checkFeaturedColumn() {
  const columns = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'galleries' 
    AND column_name = 'featured_image_id'
  `;
  
  console.log('Featured image column:', JSON.stringify(columns, null, 2));
  
  if (columns.length > 0) {
    // Check if any galleries have a featured image set
    const galleries = await sql`
      SELECT id, title, featured_image_id 
      FROM galleries 
      WHERE featured_image_id IS NOT NULL 
      LIMIT 3
    `;
    console.log('\nGalleries with featured images:', JSON.stringify(galleries, null, 2));
  }
}

checkFeaturedColumn().catch(console.error);
