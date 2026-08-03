require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcrypt');

const sql = neon(process.env.DATABASE_URL);

async function checkAndCreateAdmin() {
  try {
    console.log('🔍 Checking admin user...\n');
    
    // Check if users table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `;
    
    if (!tableExists[0].exists) {
      console.log('❌ Users table does not exist!');
      return;
    }
    
    // Check for existing users
    const users = await sql`SELECT id, email, is_admin FROM users`;
    console.log(`Found ${users.length} user(s):`);
    users.forEach(u => {
      console.log(`  - ${u.email} (${u.is_admin ? 'Admin' : 'User'}) - ID: ${u.id}`);
    });
    console.log('');
    
    // Check if admin user exists
    const adminEmail = 'admin@photography-crm.local';
    const adminUser = users.find(u => u.email === adminEmail);
    
    if (!adminUser) {
      console.log('Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const newUsers = await sql`
        INSERT INTO users (email, password, is_admin, first_name, last_name)
        VALUES (
          ${adminEmail},
          ${hashedPassword},
          true,
          'Admin',
          'User'
        )
        RETURNING id, email, is_admin
      `;
      
      console.log('✅ Admin user created:', newUsers[0]);
    } else {
      console.log('✅ Admin user exists:', adminUser);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAndCreateAdmin();
