import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});

async function addImageColumns() {
  console.log('\n🔨 Adding image columns to voucher_sales table...\n');

  try {
    // Add custom_image column for customer uploaded images
    await pool.query(`
      ALTER TABLE voucher_sales 
      ADD COLUMN IF NOT EXISTS custom_image TEXT
    `);
    console.log('✅ Added custom_image column');

    // Add design_image column for images selected from library
    await pool.query(`
      ALTER TABLE voucher_sales 
      ADD COLUMN IF NOT EXISTS design_image TEXT
    `);
    console.log('✅ Added design_image column');

    // Add personalization_data column for storing all customization options
    await pool.query(`
      ALTER TABLE voucher_sales 
      ADD COLUMN IF NOT EXISTS personalization_data JSONB DEFAULT '{}'::jsonb
    `);
    console.log('✅ Added personalization_data column');

    console.log('\n🎉 Image columns added successfully!\n');
    console.log('Columns added:');
    console.log('  - custom_image (TEXT) - For customer uploaded images');
    console.log('  - design_image (TEXT) - For library template images');
    console.log('  - personalization_data (JSONB) - For additional customization\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addImageColumns();
