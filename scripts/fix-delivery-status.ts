/**
 * Fix photography sessions:
 * 1. Mark all past sessions as 'delivered' (delivery status)
 * 2. Verify future sessions exist
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const runFix = async () => {
  try {
    console.log('🔄 Starting photography sessions fix...');

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    const connection = neon(process.env.DATABASE_URL);
    const db = drizzle(connection);

    console.log('📊 Connected to database\n');

    // Get current counts
    const countsBefore = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE delivery_status = 'pending') as pending_delivery,
        COUNT(*) FILTER (WHERE delivery_status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE start_time < NOW()) as past_sessions,
        COUNT(*) FILTER (WHERE start_time >= NOW()) as future_sessions
      FROM photography_sessions
    `);
    
    console.log('📈 BEFORE FIX:');
    console.log('   Total sessions:', countsBefore.rows[0].total);
    console.log('   Pending delivery:', countsBefore.rows[0].pending_delivery);
    console.log('   Already delivered:', countsBefore.rows[0].delivered);
    console.log('   Past sessions:', countsBefore.rows[0].past_sessions);
    console.log('   Future sessions:', countsBefore.rows[0].future_sessions);
    console.log('');

    // Update all past sessions to 'delivered'
    console.log('🔧 Marking all past sessions as delivered...');
    const updateResult = await db.execute(sql`
      UPDATE photography_sessions 
      SET 
        delivery_status = 'delivered',
        editing_status = 'completed',
        status = CASE WHEN status = 'pending' OR status = 'scheduled' OR status = 'confirmed' THEN 'completed' ELSE status END,
        updated_at = NOW()
      WHERE start_time < NOW()
      AND delivery_status != 'delivered'
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount || 0} past sessions to delivered status`);
    console.log('');

    // Check for future sessions
    const futureSessions = await db.execute(sql`
      SELECT id, title, start_time, end_time, status, delivery_status
      FROM photography_sessions 
      WHERE start_time >= NOW()
      ORDER BY start_time ASC
      LIMIT 20
    `);

    console.log(`📅 Future sessions found: ${futureSessions.rows.length}`);
    if (futureSessions.rows.length > 0) {
      console.log('\nUpcoming sessions:');
      futureSessions.rows.forEach((s: any) => {
        const date = new Date(s.start_time).toLocaleDateString('en-GB', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        console.log(`   - ${date}: ${s.title} (${s.status})`);
      });
    } else {
      console.log('⚠️  No future sessions found in photography_sessions table');
    }

    // Get updated counts
    const countsAfter = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE delivery_status = 'pending') as pending_delivery,
        COUNT(*) FILTER (WHERE delivery_status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE start_time < NOW()) as past_sessions,
        COUNT(*) FILTER (WHERE start_time >= NOW()) as future_sessions
      FROM photography_sessions
    `);
    
    console.log('\n📈 AFTER FIX:');
    console.log('   Total sessions:', countsAfter.rows[0].total);
    console.log('   Pending delivery:', countsAfter.rows[0].pending_delivery);
    console.log('   Already delivered:', countsAfter.rows[0].delivered);
    console.log('   Past sessions:', countsAfter.rows[0].past_sessions);
    console.log('   Future sessions:', countsAfter.rows[0].future_sessions);

    // Check what's in studio_appointments (Google Calendar imported events)
    console.log('\n📅 Checking studio_appointments table...');
    const appointmentsFuture = await db.execute(sql`
      SELECT id, title, start_date_time, end_date_time, google_calendar_event_id
      FROM studio_appointments 
      WHERE start_date_time >= NOW()
      ORDER BY start_date_time ASC
      LIMIT 20
    `);
    
    console.log(`Found ${appointmentsFuture.rows.length} future appointments in studio_appointments`);
    if (appointmentsFuture.rows.length > 0) {
      appointmentsFuture.rows.forEach((a: any) => {
        const date = new Date(a.start_date_time).toLocaleDateString('en-GB', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        console.log(`   - ${date}: ${a.title} (Google ID: ${a.google_calendar_event_id ? 'Yes' : 'No'})`);
      });
    }

    console.log('\n🎉 Fix completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
  }
};

runFix();
