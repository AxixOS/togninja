/**
 * Create Agent V2 Database Tables
 * Creates tables for agent sessions, messages, and audit logs
 */

import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});

async function createAgentV2Tables() {
  console.log('\n🔨 Creating Agent V2 Database Tables...\n');

  try {
    // Create agent_session table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_session (
        id TEXT PRIMARY KEY,
        studio_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'read_only',
        scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Created agent_session table');

    // Create agent_message table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_message (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES agent_session(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        tool_call_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Created agent_message table');

    // Create agent_audit table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_audit (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES agent_session(id) ON DELETE CASCADE,
        tool TEXT NOT NULL,
        args_json TEXT NOT NULL,
        result_json TEXT,
        ok BOOLEAN NOT NULL DEFAULT false,
        error TEXT,
        duration INTEGER,
        simulated BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Created agent_audit table');

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_message_session 
      ON agent_message(session_id, created_at)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_audit_session 
      ON agent_audit(session_id, created_at)
    `);
    
    console.log('✅ Created indexes');

    console.log('\n🎉 Agent V2 tables created successfully!\n');
    console.log('Tables created:');
    console.log('  - agent_session (session tracking)');
    console.log('  - agent_message (conversation history)');
    console.log('  - agent_audit (tool execution audit log)\n');

  } catch (error: any) {
    console.error('❌ Error creating Agent V2 tables:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createAgentV2Tables().catch(console.error);
