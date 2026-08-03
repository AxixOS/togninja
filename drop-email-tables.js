const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function dropEmailTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Dropping email campaign tables...');

    await client.query(`DROP TABLE IF EXISTS email_campaigns CASCADE;`);
    console.log('✅ Dropped email_campaigns table');

    await client.query(`DROP TABLE IF EXISTS email_templates CASCADE;`);
    console.log('✅ Dropped email_templates table');

    await client.query(`DROP TABLE IF EXISTS email_segments CASCADE;`);
    console.log('✅ Dropped email_segments table');

    console.log('✅ Email campaign tables dropped successfully!');

  } catch (error) {
    console.error('❌ Error dropping email tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

dropEmailTables()
  .then(() => {
    console.log('🎉 Drop complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Drop failed:', error);
    process.exit(1);
  });
