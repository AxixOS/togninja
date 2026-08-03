const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduler_bookings (
        id TEXT PRIMARY KEY,
        scheduler_id TEXT NOT NULL,
        client_id TEXT,
        client_name TEXT NOT NULL,
        client_email TEXT NOT NULL,
        client_phone TEXT,
        scheduled_date TIMESTAMPTZ NOT NULL,
        scheduled_end_date TIMESTAMPTZ NOT NULL,
        timezone TEXT DEFAULT 'Europe/Vienna',
        status TEXT DEFAULT 'pending',
        session_id TEXT,
        google_calendar_event_id TEXT,
        client_notes TEXT,
        questionnaire_responses JSONB,
        confirmation_sent BOOLEAN DEFAULT false,
        confirmation_sent_at TIMESTAMPTZ,
        reminder_sent BOOLEAN DEFAULT false,
        reminder_sent_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        cancellation_reason TEXT,
        ip_address TEXT,
        user_agent TEXT,
        source TEXT DEFAULT 'scheduler',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Table scheduler_bookings created/verified');

    // Also ensure the column exists if table was already there
    await pool.query(`ALTER TABLE scheduler_bookings ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT`);
    console.log('google_calendar_event_id column ensured');

    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'scheduler_bookings' ORDER BY ordinal_position");
    console.log('Columns:', res.rows.map(x => x.column_name).join(', '));
  } catch (e) {
    console.error(e.message);
  } finally {
    pool.end();
  }
}
run();
