/**
 * Delete recently imported test clients
 * Deletes clients created in the last 2 hours
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function deleteRecentClients() {
  try {
    console.log('🗑️  Deleting recent test clients...');
    
    // Calculate time threshold (2 hours ago)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    console.log(`Deleting clients created after: ${twoHoursAgo.toISOString()}`);
    
    // Connect to database
    const sql = neon(process.env.DATABASE_URL);
    
    // Delete clients created in the last 2 hours
    const result = await sql`
      DELETE FROM crm_clients 
      WHERE created_at > ${twoHoursAgo.toISOString()}
      RETURNING id
    `;
    
    console.log(`✅ Deleted ${result.length} test clients`);
    console.log('\nYou can now try the CSV import again with all fields supported!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting clients:', error);
    process.exit(1);
  }
}

deleteRecentClients();
