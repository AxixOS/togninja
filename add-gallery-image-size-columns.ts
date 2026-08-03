import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addGalleryImageSizeColumns() {
  try {
    console.log('Adding size_bytes and content_type columns to gallery_images table...');
    
    // Add size_bytes column
    await pool.query(`
      ALTER TABLE gallery_images 
      ADD COLUMN IF NOT EXISTS size_bytes INTEGER DEFAULT 0
    `);
    console.log('✓ Added size_bytes column');
    
    // Add content_type column
    await pool.query(`
      ALTER TABLE gallery_images 
      ADD COLUMN IF NOT EXISTS content_type TEXT
    `);
    console.log('✓ Added content_type column');
    
    // Update existing records with estimated size (0 for now, will be populated on next upload)
    await pool.query(`
      UPDATE gallery_images 
      SET size_bytes = 0, content_type = 'image/jpeg'
      WHERE size_bytes IS NULL
    `);
    console.log('✓ Updated existing records with default values');
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addGalleryImageSizeColumns();
