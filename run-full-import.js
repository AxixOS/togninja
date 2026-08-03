const { neon } = require('@neondatabase/serverless');
const { google } = require('googleapis');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function importEvents() {
  console.log('🚀 Starting full Google Calendar import...\n');
  
  // 1. Get sync config
  const configs = await sql`
    SELECT id, user_id, calendar_id, access_token, refresh_token 
    FROM calendar_sync_settings 
    WHERE sync_enabled = true 
    LIMIT 1
  `;
  
  if (configs.length === 0) {
    console.log('❌ No sync config found');
    return;
  }
  
  const config = configs[0];
  console.log('✅ Using calendar:', config.calendar_id);
  
  // 2. Setup OAuth
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3001'}/api/auth/google/callback`
  );
  
  oauth2Client.setCredentials({
    access_token: config.access_token,
    refresh_token: config.refresh_token,
  });
  
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  // 3. Fetch ALL events (1 year back, 2 years ahead)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const twoYearsAhead = new Date();
  twoYearsAhead.setFullYear(twoYearsAhead.getFullYear() + 2);
  
  console.log(`📅 Fetching events from ${oneYearAgo.toISOString()} to ${twoYearsAhead.toISOString()}`);
  
  const events = [];
  let pageToken = undefined;
  
  do {
    const response = await calendar.events.list({
      calendarId: config.calendar_id,
      timeMin: oneYearAgo.toISOString(),
      timeMax: twoYearsAhead.toISOString(),
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'startTime',
      pageToken,
    });
    if (response.data.items) events.push(...response.data.items);
    pageToken = response.data.nextPageToken;
  } while (pageToken);
  
  console.log(`📅 Found ${events.length} events in Google Calendar\n`);
  
  // 4. Import each event
  let imported = 0, skipped = 0, errors = [];
  
  for (const event of events) {
    const startDateTime = event.start?.dateTime || event.start?.date;
    const endDateTime = event.end?.dateTime || event.end?.date;
    
    if (!event.id || !startDateTime || !endDateTime) {
      skipped++;
      continue;
    }
    
    // Check if already exists
    const existing = await sql`
      SELECT id FROM photography_sessions 
      WHERE google_calendar_event_id = ${event.id}
      LIMIT 1
    `;
    
    if (existing.length > 0) {
      skipped++;
      continue;
    }
    
    // Parse session info
    const summary = event.summary || 'Google Event';
    const startTime = new Date(startDateTime);
    const endTime = new Date(endDateTime);
    const isPast = startTime < new Date();
    
    // Determine session type
    let sessionType = 'portrait';
    const lower = summary.toLowerCase();
    if (lower.includes('familie') || lower.includes('family')) sessionType = 'family';
    else if (lower.includes('hochzeit') || lower.includes('wedding')) sessionType = 'wedding';
    else if (lower.includes('newborn') || lower.includes('baby')) sessionType = 'portrait';
    
    // Generate unique ID
    const sessionId = `gcal_${event.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await sql`
        INSERT INTO photography_sessions (
          id, title, description, session_type, status, 
          start_time, end_time, location_name,
          google_calendar_event_id, ical_uid, external_calendar_sync,
          delivery_status, editing_status, priority,
          created_at, updated_at
        ) VALUES (
          ${sessionId}, ${summary}, ${event.description || null}, ${sessionType}, 
          ${isPast ? 'completed' : 'scheduled'},
          ${startTime.toISOString()}, ${endTime.toISOString()}, ${event.location || null},
          ${event.id}, ${event.iCalUID || null}, true,
          ${isPast ? 'delivered' : 'pending'}, ${isPast ? 'completed' : 'pending'}, 'medium',
          NOW(), NOW()
        )
      `;
      imported++;
      console.log(`  ✅ Imported: ${summary} (${startTime.toLocaleDateString()})`);
    } catch (err) {
      errors.push({ event: summary, error: err.message });
      console.log(`  ❌ Error: ${summary} - ${err.message}`);
    }
  }
  
  // 5. Update last sync time
  await sql`
    UPDATE calendar_sync_settings 
    SET last_sync_at = NOW(), updated_at = NOW()
    WHERE id = ${config.id}
  `;
  
  console.log(`\n✅ Import complete!`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors.length}`);
}

importEvents().catch(e => console.error('Fatal error:', e));
