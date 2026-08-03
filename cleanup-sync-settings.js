const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function fix() {
  // Delete the orphaned sync setting with wrong user ID
  const result = await sql`
    DELETE FROM calendar_sync_settings 
    WHERE user_id = '030acdf9-b799-44d8-ac9e-50da1bb506b0'
    RETURNING id
  `;
  
  console.log('Deleted orphaned sync settings:', result);
  
  // Verify what's left
  const remaining = await sql`SELECT id, user_id, calendar_id FROM calendar_sync_settings`;
  console.log('\nRemaining sync settings:', remaining);
}

fix().catch(e => console.error(e));
