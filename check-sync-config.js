const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function check() {
  const configs = await sql`SELECT id, user_id, provider, calendar_id, sync_enabled, access_token IS NOT NULL as has_access, refresh_token IS NOT NULL as has_refresh FROM calendar_sync_settings LIMIT 5`;
  console.log('Calendar sync configs:');
  console.log(JSON.stringify(configs, null, 2));
}

check().catch(e => console.error(e));
