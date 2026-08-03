// Database migration script to add communication tables
import "dotenv/config";
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('🔄 Running communication system database migration...');

  try {
    // Check if message_type column exists in crm_messages table
    await db.execute(sql`
      ALTER TABLE crm_messages 
      ADD COLUMN IF NOT EXISTS message_type varchar(20) DEFAULT 'email'
    `);
    console.log('✅ Added message_type column to crm_messages');

    // Check if phone_number column exists in crm_messages table  
    await db.execute(sql`
      ALTER TABLE crm_messages 
      ADD COLUMN IF NOT EXISTS phone_number varchar(20)
    `);
    console.log('✅ Added phone_number column to crm_messages');

    // Create sms_config table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sms_config (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider varchar(50) NOT NULL,
        account_sid varchar(255),
        auth_token varchar(255),
        from_number varchar(20),
        api_key varchar(255),
        api_secret varchar(255),
        is_active boolean DEFAULT false,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    console.log('✅ Created sms_config table');

    // Create message_campaigns table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS message_campaigns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        type varchar(20) NOT NULL,
        content text NOT NULL,
        target_type varchar(50) NOT NULL,
        target_criteria jsonb,
        status varchar(20) DEFAULT 'draft',
        scheduled_at timestamp,
        sent_at timestamp,
        total_recipients integer DEFAULT 0,
        successful_sends integer DEFAULT 0,
        failed_sends integer DEFAULT 0,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    console.log('✅ Created message_campaigns table');

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default runMigration;
