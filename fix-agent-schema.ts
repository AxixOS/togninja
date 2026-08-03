import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});

async function addMetadata() {
  try {
    await pool.query(`ALTER TABLE agent_session ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb`);
    console.log('✅ Added metadata column to agent_session');
    
    // Also fix agent_message if needed
    await pool.query(`ALTER TABLE agent_message ADD COLUMN IF NOT EXISTS tool_call_id TEXT`);
    console.log('✅ Added tool_call_id column to agent_message');
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addMetadata();
