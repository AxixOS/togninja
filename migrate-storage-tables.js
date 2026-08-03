/**
 * Create Storage Tables Migration
 * Adds storage_subscriptions and storage_usage tables
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function migrateStorageTables() {
  console.log('🔄 Creating storage tables...\n');
  
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    // Create storage_subscription_tier enum if it doesn't exist
    console.log('1. Creating storage_subscription_tier enum...');
    await sql`
      DO $$ BEGIN
        CREATE TYPE storage_subscription_tier AS ENUM (
          'free',
          'starter',
          'professional',
          'enterprise'
        );
      EXCEPTION
        WHEN duplicate_object THEN 
          -- Add 'free' to existing enum if it doesn't have it
          BEGIN
            ALTER TYPE storage_subscription_tier ADD VALUE IF NOT EXISTS 'free';
          EXCEPTION
            WHEN others THEN null;
          END;
      END $$;
    `;
    console.log('✅ Tier enum created/updated\n');
    
    // Create storage_subscription_status enum if it doesn't exist
    console.log('2. Creating storage_subscription_status enum...');
    await sql`
      DO $$ BEGIN
        CREATE TYPE storage_subscription_status AS ENUM (
          'trialing',
          'active',
          'past_due',
          'canceled',
          'paused'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('✅ Status enum created\n');
    
    // Create storage_subscriptions table
    console.log('3. Creating storage_subscriptions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS storage_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        tier TEXT NOT NULL,
        storage_limit BIGINT NOT NULL,
        client_limit INTEGER NOT NULL,
        status storage_subscription_status NOT NULL DEFAULT 'trialing',
        stripe_subscription_id TEXT,
        stripe_customer_id TEXT,
        current_period_start TIMESTAMP WITH TIME ZONE,
        current_period_end TIMESTAMP WITH TIME ZONE,
        trial_ends_at TIMESTAMP WITH TIME ZONE,
        canceled_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ storage_subscriptions table created\n');
    
    // Create storage_usage table
    console.log('4. Creating storage_usage table...');
    await sql`
      CREATE TABLE IF NOT EXISTS storage_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscription_id UUID NOT NULL REFERENCES storage_subscriptions(id) ON DELETE CASCADE,
        current_storage_bytes BIGINT DEFAULT 0,
        file_count INTEGER DEFAULT 0,
        last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ storage_usage table created\n');
    
    // Create storage_folders table
    console.log('5. Creating storage_folders table...');
    await sql`
      CREATE TABLE IF NOT EXISTS storage_folders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscription_id UUID NOT NULL REFERENCES storage_subscriptions(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        parent_folder_id UUID REFERENCES storage_folders(id) ON DELETE CASCADE,
        path TEXT NOT NULL,
        file_count INTEGER DEFAULT 0,
        total_size_bytes BIGINT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ storage_folders table created\n');
    
    // Create storage_shared_links table
    console.log('6. Creating storage_shared_links table...');
    await sql`
      CREATE TABLE IF NOT EXISTS storage_shared_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscription_id UUID NOT NULL REFERENCES storage_subscriptions(id) ON DELETE CASCADE,
        folder_id UUID REFERENCES storage_folders(id) ON DELETE CASCADE,
        file_id TEXT,
        share_token TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        expires_at TIMESTAMP WITH TIME ZONE,
        max_downloads INTEGER,
        download_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ storage_shared_links table created\n');
    
    console.log('🎉 All storage tables created successfully!');
    
    // Show existing tables
    console.log('\n📋 Verifying tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'storage%'
      ORDER BY table_name
    `;
    
    console.log('Storage tables:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

migrateStorageTables()
  .then(() => {
    console.log('\n✅ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
