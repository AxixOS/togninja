import { pool } from './server/db';

async function migrate() {
  const client = await pool.connect();
  try {
    // Add new reminder customization columns to schedulers table
    const columns = [
      { name: 'reminder_timings', sql: `ALTER TABLE schedulers ADD COLUMN IF NOT EXISTS reminder_timings jsonb` },
      { name: 'reminder_email_subject', sql: `ALTER TABLE schedulers ADD COLUMN IF NOT EXISTS reminder_email_subject text` },
      { name: 'reminder_email_body', sql: `ALTER TABLE schedulers ADD COLUMN IF NOT EXISTS reminder_email_body text` },
    ];

    for (const col of columns) {
      await client.query(col.sql);
      console.log(`✅ Added column: ${col.name}`);
    }

    console.log('\n✅ Migration complete — scheduler reminder columns added');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
