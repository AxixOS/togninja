require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    // Delete old admin from both tables
    await pool.query("DELETE FROM admin_users WHERE email = 'admin@photography-crm.local'");
    await pool.query("DELETE FROM users WHERE email = 'admin@photography-crm.local'");
    console.log('✅ Old admin deleted from both tables');
    
    // Create new admin in admin_users table (correct table for login)
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO admin_users (email, password_hash, first_name, last_name, role, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      ['admin@photography-crm.local', hashedPassword, 'Admin', 'User', 'admin', 'active']
    );
    console.log('✅ New admin created in admin_users table');
    console.log('📧 Email: admin@photography-crm.local');
    console.log('🔑 Password: admin123');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
})();
