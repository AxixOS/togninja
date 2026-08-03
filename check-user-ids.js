const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function check() {
  // Check users table
  const users = await sql`SELECT id, email FROM users LIMIT 5`;
  console.log('Users:');
  console.log(JSON.stringify(users, null, 2));
  
  // Check calendar sync settings
  const syncSettings = await sql`SELECT id, user_id, provider, calendar_id, sync_enabled FROM calendar_sync_settings`;
  console.log('\nCalendar Sync Settings:');
  console.log(JSON.stringify(syncSettings, null, 2));
  
  // Compare user IDs
  if (users.length > 0 && syncSettings.length > 0) {
    console.log('\n--- Comparison ---');
    console.log('User ID in users table:', users[0].id);
    console.log('User ID in sync_settings:', syncSettings[0].user_id);
    console.log('Match:', users[0].id === syncSettings[0].user_id);
  }
}

check().catch(e => console.error(e));
