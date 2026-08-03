const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixNewsletterSchema() {
  try {
    console.log('🔧 Fixing email_subscribers schema...\n');

    // Check if user_id column exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema='public' 
        AND table_name='email_subscribers' 
        AND column_name='user_id'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('➕ Adding missing user_id column...');
      await pool.query(`
        ALTER TABLE email_subscribers 
        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE
      `);
      console.log('   ✅ user_id column added');
    } else {
      console.log('✅ user_id column already exists');
    }

    // Verify the table is ready
    console.log('\n✅ Newsletter signup should now work!');
    console.log('\n📋 Final schema:');
    const columnsResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='email_subscribers'
      ORDER BY ordinal_position
    `);
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // If the error is about foreign key, the users table might not exist
    if (error.message.includes('users')) {
      console.log('\n⚠️  Note: The users table might not exist or have issues.');
      console.log('   Running without user_id foreign key constraint...\n');
      
      try {
        await pool.query(`
          ALTER TABLE email_subscribers 
          ADD COLUMN IF NOT EXISTS user_id UUID
        `);
        console.log('✅ user_id column added (without foreign key)');
      } catch (e2) {
        console.error('❌ Failed to add user_id column:', e2.message);
      }
    }
  } finally {
    await pool.end();
  }
}

fixNewsletterSchema();
