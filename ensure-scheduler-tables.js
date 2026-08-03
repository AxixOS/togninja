require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // Create schedulers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedulers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        session_type TEXT NOT NULL DEFAULT 'portrait',
        duration INTEGER NOT NULL DEFAULT 60,
        location TEXT,
        price DECIMAL(10,2) DEFAULT 0,
        availability_type TEXT DEFAULT 'ongoing',
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        timezone TEXT DEFAULT 'Europe/Vienna',
        weekly_availability JSONB,
        specific_dates JSONB,
        buffer_before INTEGER DEFAULT 0,
        buffer_after INTEGER DEFAULT 0,
        min_notice INTEGER DEFAULT 24,
        max_advance INTEGER DEFAULT 90,
        max_per_day INTEGER,
        availability_increments INTEGER DEFAULT 60,
        confirmation_message TEXT,
        questionnaire_id INTEGER,
        auto_approve BOOLEAN DEFAULT true,
        send_reminders BOOLEAN DEFAULT true,
        reminder_hours INTEGER DEFAULT 24,
        brand_name TEXT,
        brand_color TEXT DEFAULT '#0d9488',
        is_active BOOLEAN DEFAULT true,
        created_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('schedulers table created/verified');

    // Create scheduler_bookings table
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
    console.log('scheduler_bookings table created/verified');

    // Create scheduler_blocked_times table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduler_blocked_times (
        id TEXT PRIMARY KEY,
        scheduler_id TEXT,
        title TEXT,
        start_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ NOT NULL,
        is_all_day BOOLEAN DEFAULT false,
        is_recurring BOOLEAN DEFAULT false,
        recurrence_rule TEXT,
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('scheduler_blocked_times table created/verified');

    // Verify columns
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='schedulers' ORDER BY ordinal_position");
    console.log('Scheduler columns:', res.rows.map(x => x.column_name).join(', '));

    const res2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='scheduler_bookings' ORDER BY ordinal_position");
    console.log('Booking columns:', res2.rows.map(x => x.column_name).join(', '));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
}
run();
