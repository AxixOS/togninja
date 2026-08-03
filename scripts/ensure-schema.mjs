#!/usr/bin/env node
/**
 * Auto-provision a new instance's schema on first boot — OPT-IN.
 *
 * The point of the sellable product: a customer (or you) points a new instance
 * at an EMPTY database and it just works, with no separate `npm run provision`.
 *
 * SAFETY — this does nothing unless ALL of these hold:
 *   1. AUTO_INIT_SCHEMA is truthy         (opt-in; production leaves it unset)
 *   2. DATABASE_URL is set and postgres://
 *   3. the host is NOT in PROTECTED_DB_HOSTS   (never auto-init a protected DB)
 *   4. the database is EMPTY (0 public tables) (never touch a populated DB)
 *
 * It is BEST-EFFORT: any failure logs loudly and exits 0, so it can never block
 * the container from starting. If it can't provision, the server still boots and
 * prints the "run npm run provision" banner.
 *
 * Runs BEFORE `npm start` (see Dockerfile CMD).
 */
import { execSync } from 'node:child_process';
import pg from 'pg';

const truthy = (v) => /^(1|true|yes|on)$/i.test(String(v || ''));
const done = (msg) => { if (msg) console.log(`[ensure-schema] ${msg}`); process.exit(0); };

if (!truthy(process.env.AUTO_INIT_SCHEMA)) done('AUTO_INIT_SCHEMA not set — skipping (this is normal for existing instances).');

const url = process.env.DATABASE_URL || '';
if (!url) done('DATABASE_URL not set — skipping.');
if (!/^postgres(ql)?:\/\//i.test(url)) done('DATABASE_URL is not a postgres:// string — skipping (the server will report this).');

let host = '';
try { host = new URL(url).hostname.toLowerCase(); } catch { done('DATABASE_URL unparseable — skipping.'); }

// Never auto-init a protected/production database.
const protectedHosts = (process.env.PROTECTED_DB_HOSTS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
if (protectedHosts.some(p => host.includes(p))) done(`host ${host} is PROTECTED — refusing to auto-init.`);

async function run() {
  const client = new pg.Client({
    connectionString: url,
    ssl: /localhost|127\.0\.0\.1/.test(host) ? undefined : { rejectUnauthorized: false },
  });
  let tableCount = -1;
  try {
    await client.connect();
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    tableCount = rows[0]?.n ?? 0;
    await client.end();
  } catch (e) {
    try { await client.end(); } catch {}
    // Can't connect — let the server start and surface the real error.
    done(`could not inspect the database (${e?.message || e}) — skipping.`);
  }

  if (tableCount > 0) done(`database already has ${tableCount} table(s) — nothing to do.`);

  console.log(`[ensure-schema] EMPTY database on ${host} — creating schema + baseline…`);
  const env = { ...process.env, DB_TARGET_CONFIRMED: '1' };
  try {
    // db:push:raw skips the interactive guard; DB_TARGET_CONFIRMED short-circuits it too.
    // A 4-minute cap means a hung step can never wedge the boot.
    execSync('npm run db:push:raw', { stdio: 'inherit', env, timeout: 240_000 });
    try {
      execSync('npm run db:init', { stdio: 'inherit', env, timeout: 120_000 });
    } catch (initErr) {
      console.warn('[ensure-schema] baseline seed failed (non-fatal):', initErr?.message || initErr);
    }
    console.log('[ensure-schema] ✅ schema ready — the setup wizard can now run.');
  } catch (pushErr) {
    console.error('[ensure-schema] ⚠️ schema creation failed:', pushErr?.message || pushErr);
    console.error('[ensure-schema]    The server will still start; run `npm run provision` manually against this DB.');
  }
  process.exit(0);
}

run().catch((e) => { console.error('[ensure-schema] unexpected:', e?.message || e); process.exit(0); });
