import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function testRatingUpdate() {
  const galleryId = '5fe54123-dcf9-4bf4-9ac0-4e4786f6def7';
  const imageId = 'd55c6a09-3b05-4a55-9526-c972ee8aedb3';
  const rating = 'love';

  console.log('Testing rating update with:', { galleryId, imageId, rating });

  const result = await sql`
    UPDATE gallery_images 
    SET rating = ${rating}
    WHERE id = ${imageId} AND gallery_id = ${galleryId}
    RETURNING id, rating
  `;

  console.log('Update result:', JSON.stringify(result, null, 2));
  
  // Verify
  const check = await sql`SELECT id, filename, rating FROM gallery_images WHERE id = ${imageId}`;
  console.log('Verification:', JSON.stringify(check, null, 2));
}

testRatingUpdate().catch(console.error);
