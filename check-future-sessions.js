const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function check() {
  // Check future sessions in photography_sessions
  const futureSessions = await sql`
    SELECT id, title, start_time, end_time, google_calendar_event_id, status, created_at
    FROM photography_sessions
    WHERE start_time > NOW()
    ORDER BY start_time ASC
    LIMIT 20
  `;
  
  console.log('Future sessions in CRM:');
  if (futureSessions.length === 0) {
    console.log('  (none found)');
  } else {
    futureSessions.forEach(s => {
      console.log(`  - ${s.title} | ${new Date(s.start_time).toLocaleDateString()} | gcal_id: ${s.google_calendar_event_id || 'none'}`);
    });
  }
  
  // Check sync logs
  const syncLogs = await sql`
    SELECT id, sync_type, status, events_processed, events_created, events_updated, errors, created_at
    FROM calendar_sync_logs
    ORDER BY created_at DESC
    LIMIT 5
  `;
  
  console.log('\nRecent sync logs:');
  if (syncLogs.length === 0) {
    console.log('  (no sync logs found)');
  } else {
    syncLogs.forEach(l => {
      console.log(`  - ${new Date(l.created_at).toLocaleString()} | ${l.status} | processed: ${l.events_processed} | created: ${l.events_created} | errors: ${JSON.stringify(l.errors)}`);
    });
  }
  
  // Check last sync time
  const syncSettings = await sql`SELECT last_sync_at FROM calendar_sync_settings LIMIT 1`;
  console.log('\nLast sync time:', syncSettings[0]?.last_sync_at || 'never');
}

check().catch(e => console.error(e));
