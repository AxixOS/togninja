/**
 * Fix delivery status for past sessions and check future sessions
 */

const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('🔄 Checking photography sessions...\n');
  
  // Get count of sessions by delivery status
  const statusCounts = await sql`
    SELECT delivery_status, COUNT(*) as count 
    FROM photography_sessions 
    GROUP BY delivery_status
  `;
  console.log('Current delivery status counts:');
  statusCounts.forEach(s => console.log(`  ${s.delivery_status || 'null'}: ${s.count}`));
  
  // Get sessions in the future
  const futureSessions = await sql`
    SELECT id, title, start_time, client_name, delivery_status
    FROM photography_sessions 
    WHERE start_time > NOW()
    ORDER BY start_time
    LIMIT 20
  `;
  console.log(`\n📅 Future sessions (${futureSessions.length}):`);
  futureSessions.forEach(s => {
    console.log(`  - ${s.start_time}: ${s.title} (${s.client_name || 'no client'})`);
  });
  
  // Update all PAST sessions to have delivery_status = 'delivered'
  console.log('\n🔧 Updating past sessions to delivered status...');
  const updateResult = await sql`
    UPDATE photography_sessions 
    SET delivery_status = 'delivered', 
        editing_status = 'completed',
        updated_at = NOW()
    WHERE start_time < NOW() 
    AND (delivery_status != 'delivered' OR delivery_status IS NULL)
    RETURNING id
  `;
  console.log(`✅ Updated ${updateResult.length} past sessions to 'delivered' status`);
  
  // Check final counts
  const finalCounts = await sql`
    SELECT delivery_status, COUNT(*) as count 
    FROM photography_sessions 
    GROUP BY delivery_status
  `;
  console.log('\nFinal delivery status counts:');
  finalCounts.forEach(s => console.log(`  ${s.delivery_status || 'null'}: ${s.count}`));
  
  // Check studio_appointments table too
  const appointments = await sql`
    SELECT id, title, start_time, end_time
    FROM studio_appointments 
    WHERE start_time > NOW()
    ORDER BY start_time
    LIMIT 10
  `;
  console.log(`\n📅 Future studio_appointments (${appointments.length}):`);
  appointments.forEach(a => {
    console.log(`  - ${a.start_time}: ${a.title}`);
  });
  
  // Check calendar_sync_settings
  const syncSettings = await sql`
    SELECT id, user_id, google_email, selected_calendar_id, last_sync_at
    FROM calendar_sync_settings
    LIMIT 5
  `;
  console.log(`\n🔗 Calendar sync settings (${syncSettings.length}):`);
  syncSettings.forEach(s => {
    console.log(`  - User: ${s.user_id}, Email: ${s.google_email}, Calendar: ${s.selected_calendar_id}`);
    console.log(`    Last sync: ${s.last_sync_at || 'never'}`);
  });
  
  console.log('\n✅ Done!');
}

run().catch(console.error);
