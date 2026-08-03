require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function resetStorageSubscriptions() {
  console.log('🔄 Resetting storage subscriptions...\n');
  
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    // First, check if table exists
    console.log('1. Checking if storage_subscriptions table exists...');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'storage_subscriptions'
      )
    `;
    
    if (!tableCheck[0].exists) {
      console.log('⚠️  storage_subscriptions table does not exist. Run migrate-storage-tables.js first.');
      process.exit(1);
    }
    
    // Get current subscriptions before deleting
    console.log('2. Fetching current subscriptions...');
    const current = await sql`SELECT * FROM storage_subscriptions`;
    console.log(`   Found ${current.length} subscription(s)`);
    current.forEach(sub => {
      console.log(`   - User ${sub.user_id}: ${sub.tier} tier (${sub.status})`);
    });
    
    // Delete all storage subscriptions (cascades to related tables)
    console.log('\n3. Deleting all subscriptions...');
    await sql`DELETE FROM storage_subscriptions`;
    console.log('✅ All storage subscriptions deleted');
    
    // Verify deletion
    const remaining = await sql`SELECT COUNT(*) as count FROM storage_subscriptions`;
    console.log(`\n✅ Remaining subscriptions: ${remaining[0].count}`);
    
    // Show users
    console.log('\n📋 Users in database:');
    const users = await sql`SELECT id, email FROM users`;
    users.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id})`);
    });
    
    console.log('\n🎉 Reset complete! Users can now activate free tier.');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

resetStorageSubscriptions();
