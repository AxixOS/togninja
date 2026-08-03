import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function createStorageSubscriptionsTable() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('📦 Creating storage_subscriptions table...');

  try {
    // Drop table if it exists (to recreate with correct schema)
    await sql`DROP TABLE IF EXISTS storage_subscriptions`;
    
    console.log('🗑️  Dropped old table (if existed)');
    
    // Create the table with correct schema matching shared/schema.ts
    await sql`
      CREATE TABLE storage_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        client_id UUID,
        stripe_subscription_id TEXT UNIQUE,
        stripe_customer_id TEXT,
        stripe_price_id TEXT,
        tier TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'trialing',
        storage_limit BIGINT NOT NULL,
        current_period_start TIMESTAMP WITH TIME ZONE,
        current_period_end TIMESTAMP WITH TIME ZONE,
        cancel_at_period_end BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    console.log('✅ storage_subscriptions table created successfully!');

    // Create index for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_storage_subscriptions_user_id 
      ON storage_subscriptions(user_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_storage_subscriptions_client_id 
      ON storage_subscriptions(client_id)
    `;

    console.log('✅ Index created successfully!');

    console.log('\n🎉 Database setup complete! You can now use demo mode.');

  } catch (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
}

createStorageSubscriptionsTable();
