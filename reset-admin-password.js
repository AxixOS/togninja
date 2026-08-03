require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

const sql = neon(process.env.DATABASE_URL);

async function resetAdminPassword() {
  const email = 'admin@photography-crm.local';
  const newPassword = 'admin123';
  
  try {
    console.log('🔐 Resetting admin password...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await sql`
      UPDATE users 
      SET password = ${hashedPassword}
      WHERE email = ${email}
    `;
    
    console.log('✅ Password reset successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetAdminPassword();
