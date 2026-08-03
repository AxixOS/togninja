require('dotenv/config');
const { neon } = require('@neondatabase/serverless');

async function checkAdminUsers() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🔍 Checking for admin users in database...\n');
    
    const users = await sql`
      SELECT id, email, first_name, last_name, role, status 
      FROM admin_users
    `;
    
    if (users.length === 0) {
      console.log('❌ NO ADMIN USERS FOUND');
      console.log('\n📝 To create an admin user, you need to:');
      console.log('   1. Go to: http://localhost:3001/api/auth/register');
      console.log('   2. POST with JSON body: {');
      console.log('        "email": "your@email.com",');
      console.log('        "password": "yourpassword",');
      console.log('        "firstName": "Your",');
      console.log('        "lastName": "Name"');
      console.log('      }');
      console.log('\n   OR run: npm run create-admin');
    } else {
      console.log('✅ Found admin users:\n');
      users.forEach(user => {
        console.log(`   Email: ${user.email}`);
        console.log(`   Name:  ${user.first_name} ${user.last_name}`);
        console.log(`   Role:  ${user.role}`);
        console.log(`   Status: ${user.status}`);
        console.log('   ---');
      });
      console.log('\n🔐 To log in:');
      console.log('   1. Go to: http://localhost:3001/login');
      console.log('   2. Use one of the emails above and your password');
    }
  } catch (error) {
    console.error('❌ Error checking admin users:', error.message);
  }
}

checkAdminUsers();
