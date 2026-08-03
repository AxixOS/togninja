const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createEmailTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Creating email campaign tables...');

    // Create email_campaigns table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'broadcast',
        status TEXT NOT NULL DEFAULT 'draft',
        subject TEXT NOT NULL,
        preview_text TEXT,
        content TEXT NOT NULL,
        sender_name TEXT DEFAULT 'New Age Fotografie',
        sender_email TEXT DEFAULT 'info@newagefotografie.com',
        reply_to TEXT DEFAULT 'info@newagefotografie.com',
        scheduled_at TIMESTAMP WITH TIME ZONE,
        sent_at TIMESTAMP WITH TIME ZONE,
        segments TEXT[],
        tags_include TEXT[],
        tags_exclude TEXT[],
        recipient_count INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        delivered_count INTEGER DEFAULT 0,
        opened_count INTEGER DEFAULT 0,
        clicked_count INTEGER DEFAULT 0,
        bounced_count INTEGER DEFAULT 0,
        unsubscribed_count INTEGER DEFAULT 0,
        settings JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created email_campaigns table');

    // Create email_templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        description TEXT,
        subject TEXT NOT NULL,
        preview_text TEXT,
        html_content TEXT NOT NULL,
        text_content TEXT,
        thumbnail TEXT,
        variables JSONB,
        is_public BOOLEAN DEFAULT false,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created email_templates table');

    // Create email_segments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_segments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        name TEXT NOT NULL,
        description TEXT,
        conditions JSONB NOT NULL,
        subscriber_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created email_segments table');

    // Insert some default templates
    await client.query(`
      INSERT INTO email_templates (name, subject, html_content, category, description, is_public)
      VALUES 
        (
          'Welcome Email',
          'Welcome to {{studio_name}}!',
          '<h1>Welcome {{client_name}}!</h1><p>Thank you for choosing us for your photography needs.</p>',
          'welcome',
          'A warm welcome email for new clients',
          true
        ),
        (
          'Session Reminder',
          'Reminder: Your photo session is coming up',
          '<h2>Hello {{client_name}},</h2><p>This is a reminder that your photography session is scheduled for {{session_date}}.</p><p>Location: {{location}}</p>',
          'reminder',
          'Reminder email for upcoming photo sessions',
          true
        ),
        (
          'Gallery Ready',
          'Your photos are ready to view!',
          '<h1>Great news, {{client_name}}!</h1><p>Your photos are now ready to view in your private gallery.</p><p><a href="{{gallery_link}}">View Your Gallery</a></p>',
          'notification',
          'Notification when client gallery is ready',
          true
        )
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Inserted default email templates');

    // Insert a default segment
    await client.query(`
      INSERT INTO email_segments (name, description, conditions)
      VALUES 
        (
          'All Subscribers',
          'All email subscribers',
          '[]'::jsonb
        ),
        (
          'Recent Clients',
          'Clients from the last 30 days',
          '[{"field": "created_at", "operator": "greater_than", "value": "30_days_ago"}]'::jsonb
        )
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Inserted default email segments');

    console.log('✅ Email campaign tables created successfully!');

  } catch (error) {
    console.error('❌ Error creating email tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createEmailTables()
  .then(() => {
    console.log('🎉 Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
