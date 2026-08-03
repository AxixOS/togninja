import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function addCoverSettingsColumns() {
  try {
    console.log('Adding cover settings columns to galleries table...');
    
    // Check if cover_scale column exists
    const scaleCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'galleries' AND column_name = 'cover_scale'
    `;
    
    if (scaleCheck.length === 0) {
      console.log('Adding cover_scale column...');
      await sql`
        ALTER TABLE galleries 
        ADD COLUMN cover_scale INTEGER DEFAULT 100
      `;
      console.log('✓ Added cover_scale column');
    } else {
      console.log('✓ cover_scale column already exists');
    }

    // Check if cover_template column exists (stores full template settings as JSONB)
    const templateCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'galleries' AND column_name = 'cover_template'
    `;
    
    if (templateCheck.length === 0) {
      console.log('Adding cover_template column...');
      await sql`
        ALTER TABLE galleries 
        ADD COLUMN cover_template JSONB DEFAULT '{"templateId": "classic-center", "textPosition": "center", "textAlignment": "center", "overlay": "dark", "titleSize": "large", "showSubtitle": true, "showButton": true, "buttonStyle": "outline", "fontStyle": "elegant", "imageStyle": "full"}'::jsonb
      `;
      console.log('✓ Added cover_template column');
    } else {
      console.log('✓ cover_template column already exists');
    }

    console.log('\n✅ Cover settings columns migration complete!');
    
    // Show current schema
    const columns = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'galleries' 
      AND column_name IN ('cover_image', 'cover_position', 'cover_scale', 'cover_template')
      ORDER BY ordinal_position
    `;
    
    console.log('\nCover-related columns in galleries table:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'none'})`);
    });

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addCoverSettingsColumns();
