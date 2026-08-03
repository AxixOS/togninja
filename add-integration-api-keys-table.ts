import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

async function addIntegrationApiKeysTable() {
  console.log('\n🔨 Creating integration_api_keys table...\n');
  try {
    // Scoped API keys for trusted external apps (e.g. Infinite Authority). Keys are
    // stored only as a SHA-256 hash; each carries an explicit scope list.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS integration_api_keys (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name         text NOT NULL,
        key_prefix   text NOT NULL,
        key_hash     text UNIQUE NOT NULL,
        scopes       jsonb NOT NULL DEFAULT '[]'::jsonb,
        status       text NOT NULL DEFAULT 'active',
        last_used_at timestamptz,
        created_at   timestamptz DEFAULT now()
      )
    `);
    console.log('✅ integration_api_keys table ready\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

addIntegrationApiKeysTable();
