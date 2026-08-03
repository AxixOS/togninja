import { pool } from './server/db';

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS spam_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_type TEXT NOT NULL,
        value TEXT NOT NULL,
        reason TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_spam_rules_type ON spam_rules(rule_type);
      CREATE INDEX IF NOT EXISTS idx_spam_rules_active ON spam_rules(is_active);
    `);
    console.log('✅ spam_rules table created');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
