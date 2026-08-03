/**
 * Migration script to create lead_sources table and add default sources
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function createLeadSourcesTable() {
  try {
    console.log('🔧 Creating lead_sources table...');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Create lead_sources table
    console.log('Creating table...');
    await sql`
      CREATE TABLE IF NOT EXISTS lead_sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    
    console.log('✅ Table created successfully!');
    
    // Insert default lead sources
    console.log('Adding default lead sources...');
    
    const defaultSources = [
      { name: 'Website', sort_order: 0 },
      { name: 'Google Search', sort_order: 1 },
      { name: 'Social Media', sort_order: 2 },
      { name: 'Instagram', sort_order: 3 },
      { name: 'Facebook', sort_order: 4 },
      { name: 'Referral', sort_order: 5 },
      { name: 'Event', sort_order: 6 },
      { name: 'Advertisement', sort_order: 7 },
      { name: 'Word of Mouth', sort_order: 8 },
      { name: 'Other', sort_order: 9 }
    ];
    
    for (const source of defaultSources) {
      await sql`
        INSERT INTO lead_sources (name, sort_order, is_active)
        VALUES (${source.name}, ${source.sort_order}, true)
        ON CONFLICT (name) DO NOTHING
      `;
    }
    
    console.log('✅ Default lead sources added successfully!');
    console.log('\nYou can now manage lead sources from the admin panel.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createLeadSourcesTable();

