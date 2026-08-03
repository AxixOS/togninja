// Mint a scoped integration API key (e.g. for Infinite Authority).
//
//   npx tsx mint-integration-key.ts "Infinite Authority - prod" blog:write landing-pages:write
//
// The raw key is printed ONCE and never stored — copy it into the calling app's
// secrets. Only its SHA-256 hash is saved. Use scope "*" to grant everything.
import 'dotenv/config';
import { createHash, randomBytes } from 'crypto';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

async function mint() {
  const [, , name, ...scopes] = process.argv;
  if (!name || scopes.length === 0) {
    console.error('Usage: npx tsx mint-integration-key.ts "<name>" <scope> [<scope> ...]');
    console.error('Example: npx tsx mint-integration-key.ts "Infinite Authority - prod" blog:write landing-pages:write');
    process.exitCode = 1;
    await pool.end();
    return;
  }

  const raw = 'ia_live_' + randomBytes(24).toString('hex');
  const keyHash = createHash('sha256').update(raw).digest('hex');
  const keyPrefix = raw.slice(0, 16);

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS integration_api_keys (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL, key_prefix text NOT NULL, key_hash text UNIQUE NOT NULL,
        scopes jsonb NOT NULL DEFAULT '[]'::jsonb, status text NOT NULL DEFAULT 'active',
        last_used_at timestamptz, created_at timestamptz DEFAULT now()
      )
    `);
    const r = await pool.query(
      `INSERT INTO integration_api_keys (name, key_prefix, key_hash, scopes)
       VALUES ($1, $2, $3, $4::jsonb) RETURNING id`,
      [name, keyPrefix, keyHash, JSON.stringify(scopes)],
    );
    console.log('\n✅ Key minted (shown once — copy it now):\n');
    console.log('   ' + raw + '\n');
    console.log('   id:     ' + r.rows[0].id);
    console.log('   name:   ' + name);
    console.log('   scopes: ' + scopes.join(', ') + '\n');
    console.log('   Send it as:  Authorization: Bearer ' + keyPrefix + '…\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

mint();
