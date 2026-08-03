import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema.js";

// Portable Postgres connection via standard node-postgres — works with Supabase, Neon,
// AWS RDS, or any self-hosted Postgres. (Previously locked to @neondatabase/serverless,
// which only speaks Neon's WebSocket endpoint.) The app runs as a long-lived server, so
// the standard TCP driver is the right fit and keeps every provider on the table.
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("❌ ERROR: DATABASE_URL environment variable is not set!");
  console.error("Set DATABASE_URL to your Postgres connection string (Supabase/Neon/…).");
  // In production, keep the process up so it can surface a clear error rather than crash-loop.
  if (process.env.NODE_ENV === 'production') {
    console.error("⚠️ App will start but database operations will fail");
  } else {
    throw new Error("DATABASE_URL must be set - provide your Postgres connection string");
  }
}

// Enable TLS for hosted Postgres (Supabase/Neon require it). Skip only for a local/plain
// connection or when the URL explicitly disables SSL. rejectUnauthorized:false accepts the
// provider's cert without bundling a CA — standard for Supabase/Neon Node clients.
const isLocal = !!url && /(^|@)(localhost|127\.0\.0\.1|::1)(:|\/)/.test(url);
const useSsl = !!url && !isLocal && !/sslmode=disable/i.test(url);

export const pool = url ? new Pool({
  connectionString: url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
}) : null as any;

export const db = url ? drizzle(pool, {
  schema,
  logger: true, // SQL query logging (matches prior behaviour)
}) : null as any;

if (url) {
  console.log(`📊 Database: node-postgres (portable) — SSL ${useSsl ? 'on' : 'off'}`);
} else {
  console.warn(`⚠️ Database: No connection - DATABASE_URL not configured`);
}
