require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  // Check calendar sync settings
  console.log('=== Calendar Sync Settings ===');
  const syncSettings = await sql`SELECT * FROM calendar_sync_settings`;
  console.log(JSON.stringify(syncSettings, null, 2));

  // Check how many photography sessions exist and recent ones
  console.log('\n=== Photography Sessions (last 30 days) ===');
  const sessions = await sql`SELECT id, title, start_time, end_time, status, google_calendar_event_id, external_calendar_sync FROM photography_sessions WHERE start_time >= NOW() - INTERVAL '30 days' ORDER BY start_time DESC LIMIT 20`;
  console.log(JSON.stringify(sessions, null, 2));

  // Check sessions around March 21-22 (the dates visible in Google Calendar)
  console.log('\n=== Sessions for March 21-22 ===');
  const marchSessions = await sql`SELECT id, title, start_time, end_time, status, google_calendar_event_id FROM photography_sessions WHERE start_time >= '2026-03-21' AND start_time < '2026-03-23' ORDER BY start_time`;
  console.log(JSON.stringify(marchSessions, null, 2));

  // Check total session count
  const count = await sql`SELECT COUNT(*) as total FROM photography_sessions`;
  console.log('\nTotal sessions:', count[0].total);

  // Check actual columns 
  console.log('\n=== Table columns ===');
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'photography_sessions' ORDER BY ordinal_position`;
  console.log(cols.map(c => c.column_name).join(', '));

  // Check scheduler bookings 
  console.log('\n=== Recent Scheduler Bookings ===');
  const bookings = await sql`SELECT id, scheduler_id, client_name, scheduled_date, scheduled_end_date, status, google_calendar_event_id FROM scheduler_bookings WHERE scheduled_date >= NOW() - INTERVAL '30 days' ORDER BY scheduled_date DESC LIMIT 10`;
  console.log(JSON.stringify(bookings, null, 2));
}

main().catch(console.error);
