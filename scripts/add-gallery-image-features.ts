import { db } from '../lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function addGalleryImageFeatures() {
  try {
    console.log('Adding rating and slideshow selection features to gallery_images...\n');
    
    const sql = readFileSync(join(__dirname, 'add-gallery-image-features.sql'), 'utf-8');
    
    await db(sql);
    
    console.log('✅ Successfully added rating and slideshow_selected columns!');
    console.log('✅ Created indexes for faster filtering!');
    
  } catch (error) {
    console.error('Error updating gallery_images table:', error);
  } finally {
    process.exit();
  }
}

addGalleryImageFeatures();
