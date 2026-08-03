const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    const users = await sql`
      SELECT id, email, created_at 
      FROM users 
      ORDER BY created_at
    `;
    
    console.log('\n✅ Admin users found:');
    users.forEach(user => {
      console.log(`  - Email: ${user.email}`);
      console.log(`    ID: ${user.id}`);
      console.log(`    Created: ${user.created_at}`);
      console.log('');
    });
    
    if (users.length === 0) {
      console.log('❌ No admin users found!');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
})();
