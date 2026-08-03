import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function addFeaturedImage() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('Adding featured_image_id column to galleries table...');
    
    // Execute commands separately
    await sql`
      ALTER TABLE galleries 
      ADD COLUMN IF NOT EXISTS featured_image_id UUID REFERENCES gallery_images(id) ON DELETE SET NULL
    `;
    console.log('   ✓ Added featured_image_id column');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_galleries_featured_image ON galleries(featured_image_id)
    `;
    console.log('   ✓ Created index idx_galleries_featured_image');

    console.log('\n✅ Successfully added featured image support to galleries table');
    
  } catch (error) {
    console.error('Error adding featured image support:', error);
    process.exit(1);
  }
}

addFeaturedImage();
