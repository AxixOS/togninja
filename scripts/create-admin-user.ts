import 'dotenv/config'; // Load environment variables
import { storage } from '../server/storage';
import { hashPassword } from '../server/auth';

async function createAdminUser() {
  try {
    const email = 'admin@photography-crm.local';
    const password = 'admin123'; // Change this password after first login!
    const firstName = 'Admin';
    const lastName = 'User';

    console.log('🔐 Creating admin user...');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('⚠️  IMPORTANT: Change this password after first login!');

    // Check if user already exists
    const existingUser = await storage.getAdminUserByEmail(email);
    if (existingUser) {
      console.log('❌ Admin user already exists!');
      console.log('Existing user:', existingUser.email);
      return;
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Create the admin user
    const user = await storage.createAdminUser({
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'admin',
      status: 'active'
    });

    console.log('✅ Admin user created successfully!');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('\n📝 Login credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('\n⚠️  REMEMBER TO CHANGE THE PASSWORD AFTER FIRST LOGIN!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createAdminUser();
