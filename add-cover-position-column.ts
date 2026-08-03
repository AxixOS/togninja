// Migration to add cover_position column to galleries table
import 'dotenv/config';
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('🔄 Adding cover_position column to galleries table...');
    
    // Add cover_position column (stores x,y percentages as JSON)
    await db.execute(sql`
      ALTER TABLE galleries 
      ADD COLUMN IF NOT EXISTS cover_position JSONB DEFAULT '{"x": 50, "y": 50}'::jsonb
    `);
    
    console.log('✅ cover_position column added successfully!');
    
    // Verify the column exists
    const result = await db.execute(sql`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'galleries' AND column_name = 'cover_position'
    `);
    
    if (result.rows && result.rows.length > 0) {
      console.log('📊 Column details:', result.rows[0]);
    }
    
    console.log('✅ Migration complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
  
  process.exit(0);
}

migrate();
