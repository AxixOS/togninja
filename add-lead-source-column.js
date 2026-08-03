/**
 * Migration script to add lead_source column to crm_clients table
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function addLeadSourceColumn() {
  try {
    console.log('🔧 Adding lead_source column to crm_clients table...');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Add lead_source column if it doesn't exist
    console.log('Adding lead_source column...');
    await sql`
      ALTER TABLE crm_clients 
      ADD COLUMN IF NOT EXISTS lead_source TEXT
    `;
    
    console.log('✅ lead_source column added successfully!');
    console.log('\nYou can now use the Lead Source field in the client form.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding column:', error);
    process.exit(1);
  }
}

addLeadSourceColumn();

