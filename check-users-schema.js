require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkUsersSchema() {
  try {
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `;
    
    console.log('Users table columns:');
    cols.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));
    
    // Get actual users
    const users = await sql`SELECT * FROM users LIMIT 5`;
    console.log(`\nUsers in database: ${users.length}`);
    users.forEach(u => {
      console.log(`  -`, u);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsersSchema();
