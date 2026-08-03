import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('🔧 Applying database migration...\n');
  
  try {
    // Add image_url_2 column
    await db.execute(sql`
      ALTER TABLE blog_posts
      ADD COLUMN IF NOT EXISTS image_url_2 TEXT
    `);
    console.log('✅ Added column: image_url_2');
    
    // Add image_url_3 column
    await db.execute(sql`
      ALTER TABLE blog_posts
      ADD COLUMN IF NOT EXISTS image_url_3 TEXT
    `);
    console.log('✅ Added column: image_url_3');
    
    // Add comments
    await db.execute(sql`
      COMMENT ON COLUMN blog_posts.image_url IS 'Hero/cover image URL (primary)'
    `);
    
    await db.execute(sql`
      COMMENT ON COLUMN blog_posts.image_url_2 IS 'Feature image 2 URL (displayed mid-content)'
    `);
    
    await db.execute(sql`
      COMMENT ON COLUMN blog_posts.image_url_3 IS 'Feature image 3 URL (displayed near end of content)'
    `);
    console.log('✅ Added column comments');
    
    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
