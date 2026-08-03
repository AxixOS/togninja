const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkNewsletterTables() {
  try {
    console.log('🔍 Checking for newsletter/email tables...\n');

    // Check if email_subscribers table exists
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' 
        AND table_name IN ('email_subscribers', 'email_campaigns', 'email_templates', 'email_segments')
      ORDER BY table_name
    `);

    console.log('📋 Found tables:');
    if (tablesResult.rows.length === 0) {
      console.log('   ❌ NO email tables found in database!');
      console.log('\n🔧 SOLUTION: Run the create-email-tables.js script to create missing tables:');
      console.log('   node create-email-tables.js');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`   ✅ ${row.table_name}`);
      });

      // Check the schema of email_subscribers
      if (tablesResult.rows.find(r => r.table_name === 'email_subscribers')) {
        console.log('\n📝 email_subscribers columns:');
        const columnsResult = await pool.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema='public' AND table_name='email_subscribers'
          ORDER BY ordinal_position
        `);
        columnsResult.rows.forEach(col => {
          console.log(`   - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });

        // Check if there are any subscribers
        const countResult = await pool.query('SELECT COUNT(*) as count FROM email_subscribers');
        console.log(`\n👥 Subscribers in database: ${countResult.rows[0].count}`);
      }
    }

    // Check all available tables for reference
    console.log('\n📚 All public tables in database:');
    const allTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public'
      ORDER BY table_name
    `);
    allTablesResult.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkNewsletterTables();
