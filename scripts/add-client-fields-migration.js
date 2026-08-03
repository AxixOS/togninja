/**
 * Add missing columns to crm_clients table
 * Adds: address2, clientSince, lastSessionDate, lifetimeValue
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function addMissingColumns() {
  try {
    console.log('🔧 Adding missing columns to crm_clients table...');
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Check if columns already exist and add them if they don't
    console.log('Adding address2 column...');
    await sql`
      ALTER TABLE crm_clients 
      ADD COLUMN IF NOT EXISTS address2 TEXT
    `;
    
    console.log('Adding client_since column...');
    await sql`
      ALTER TABLE crm_clients 
      ADD COLUMN IF NOT EXISTS client_since TIMESTAMP
    `;
    
    console.log('Adding last_session_date column...');
    await sql`
      ALTER TABLE crm_clients 
      ADD COLUMN IF NOT EXISTS last_session_date TIMESTAMP
    `;
    
    console.log('Adding lifetime_value column...');
    await sql`
      ALTER TABLE crm_clients 
      ADD COLUMN IF NOT EXISTS lifetime_value NUMERIC(10, 2)
    `;
    
    console.log('✅ All columns added successfully!');
    console.log('\nYou can now retry the CSV import.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    process.exit(1);
  }
}

addMissingColumns();
