#!/usr/bin/env node
/**
 * Inspect a database connection WITHOUT changing anything.
 *
 *   npm run db:check -- --db "postgresql://…"
 *   npm run db:check                      # uses $DATABASE_URL
 *
 * Reports: provider, host, whether it's PROTECTED, whether it's reachable, and
 * whether it's EMPTY (safe to provision) or already populated. Read-only — it
 * only runs SELECTs against information_schema. Nothing is created or dropped.
 */
import pg from 'pg';

const argv = process.argv.slice(2);
const i = argv.indexOf('--db');
const url = (i >= 0 && argv[i + 1]) ? argv[i + 1] : (process.env.DATABASE_URL || '');

if (!url) {
  console.error('\n✖ No database given. Pass --db "postgresql://…" or set DATABASE_URL.\n');
  process.exit(1);
}

let parsed;
try { parsed = new URL(url); } catch { console.error('\n✖ Not a valid connection string.\n'); process.exit(1); }

const host = parsed.hostname;
const dbName = parsed.pathname.replace(/^\//, '') || '(default)';
const provider =
  /neon\.tech$/i.test(host) ? 'Neon' :
  /supabase\.(com|co)$/i.test(host) ? 'Supabase' :
  /amazonaws\.com$/i.test(host) ? 'AWS RDS / Heroku Postgres' :
  /localhost|127\.0\.0\.1/.test(host) ? 'Local' : 'Other';

const protectedHosts = (process.env.PROTECTED_DB_HOSTS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const isProtected = protectedHosts.some(p => host.toLowerCase().includes(p));

console.log('\n────────────────────────────────────────────────────────');
console.log('  DATABASE CHECK (read-only)');
console.log('────────────────────────────────────────────────────────');
console.log(`  Provider  : ${provider}`);
console.log(`  Host      : ${host}`);
console.log(`  Database  : ${dbName}`);
console.log(`  Protected : ${isProtected ? '🛑 YES — schema pushes are blocked' : 'no'}`);
console.log('────────────────────────────────────────────────────────');

// Don't even connect to a protected (production) database — just report.
if (isProtected) {
  console.log('\n🛑 This is a PROTECTED database (your live CRM). Never provision or push schema here.\n');
  process.exit(0);
}

const client = new pg.Client({
  connectionString: url,
  ssl: /localhost|127\.0\.0\.1/.test(host) ? undefined : { rejectUnauthorized: false },
});

try {
  await client.connect();
  const { rows } = await client.query(
    `SELECT count(*)::int AS n FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  );
  const n = rows[0]?.n ?? 0;
  await client.end();

  console.log(`  Tables    : ${n}`);
  console.log('────────────────────────────────────────────────────────');
  if (isProtected) {
    console.log('\n🛑 This is a PROTECTED database (your live CRM). Never provision or push schema here.\n');
  } else if (n === 0) {
    console.log('\n✅ EMPTY and not protected — safe to provision a clean tenant here.\n');
  } else {
    console.log(`\n⚠️  This database already has ${n} table(s). Provisioning would REFUSE it.`);
    console.log('   For a clean tenant, create a brand-new empty database instead.\n');
  }
} catch (e) {
  try { await client.end(); } catch {}
  console.log('────────────────────────────────────────────────────────');
  console.error(`\n✖ Could not connect: ${e?.message || e}\n`);
  process.exit(1);
}
