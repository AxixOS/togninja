require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    // Check current schema
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'homepage_images'
      ORDER BY ordinal_position
    `;
    
    console.log('Current homepage_images schema:');
    console.log(JSON.stringify(columns, null, 2));
    
    // Check if there's any data
    const count = await sql`SELECT COUNT(*) as count FROM homepage_images`;
    console.log('\nTotal rows:', count[0].count);
    
    // Get sample data
    const sample = await sql`SELECT * FROM homepage_images LIMIT 3`;
    console.log('\nSample data:');
    console.log(JSON.stringify(sample, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
})();
