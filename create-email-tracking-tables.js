const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createEmailTrackingTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Creating email tracking tables...');

    // Create email_events table for tracking all email interactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
        subscriber_email TEXT NOT NULL,
        event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'complained')),
        link_url TEXT,
        user_agent TEXT,
        ip_address TEXT,
        country TEXT,
        city TEXT,
        device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
        browser TEXT,
        os TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'
      );
    `);
    console.log('✅ Created email_events table');

    // Create indexes for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON email_events(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(subscriber_email);
      CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_email_events_created ON email_events(created_at);
    `);
    console.log('✅ Created email_events indexes');

    // Create email_links table for tracking individual links
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        label TEXT,
        click_count INTEGER DEFAULT 0,
        unique_clicks INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created email_links table');

    // Create email_subscriber table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_subscribers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced', 'complained')),
        source TEXT DEFAULT 'manual',
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        custom_fields JSONB DEFAULT '{}',
        subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        unsubscribed_at TIMESTAMP WITH TIME ZONE,
        last_opened_at TIMESTAMP WITH TIME ZONE,
        last_clicked_at TIMESTAMP WITH TIME ZONE,
        emails_sent_count INTEGER DEFAULT 0,
        emails_opened_count INTEGER DEFAULT 0,
        emails_clicked_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created email_subscribers table');

    console.log('✅ Email tracking tables created successfully!');

  } catch (error) {
    console.error('❌ Error creating email tracking tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createEmailTrackingTables()
  .then(() => {
    console.log('🎉 Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
