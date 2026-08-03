import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function runMigration() {
  try {
    console.log('\n🔄 Running migration: Add voucher product media fields...\n');
    
    // Step 1: Add columns
    console.log('📝 Adding thumbnail_url column...');
    await sql`ALTER TABLE voucher_products ADD COLUMN IF NOT EXISTS thumbnail_url TEXT`;
    
    console.log('📝 Adding promo_image_url column...');
    await sql`ALTER TABLE voucher_products ADD COLUMN IF NOT EXISTS promo_image_url TEXT`;
    
    console.log('📝 Adding detailed_description column...');
    await sql`ALTER TABLE voucher_products ADD COLUMN IF NOT EXISTS detailed_description TEXT`;
    
    // Step 2: Update existing products
    console.log('📝 Updating existing products with default values...');
    await sql`
      UPDATE voucher_products 
      SET 
        thumbnail_url = COALESCE(thumbnail_url, image_url),
        detailed_description = COALESCE(
          detailed_description, 
          description || E'\n\n✨ Inklusive:\n• Professionelle Fotografie\n• Bildbearbeitung\n• Digitale Bildübermittlung\n\n🎁 Perfekt als Geschenk!'
        )
      WHERE description IS NOT NULL
    `;
    
    console.log('\n✅ Migration completed successfully!\n');
    
    // Verify the new columns
    console.log('🔍 Verifying new columns...\n');
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'voucher_products'
      AND column_name IN ('thumbnail_url', 'promo_image_url', 'detailed_description')
      ORDER BY column_name
    `;
    
    console.log('New columns added:');
    console.table(columns);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
