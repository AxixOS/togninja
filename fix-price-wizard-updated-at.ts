/**
 * Fix: Add updated_at column to price_wizard_sessions table
 */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
  try {
    console.log('Adding updated_at column to price_wizard_sessions...');
    await pool.query(`
      ALTER TABLE price_wizard_sessions 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now()
    `);
    console.log('✅ updated_at column added to price_wizard_sessions');
  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

fix();
