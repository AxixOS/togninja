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
  // True when studio_configs exists, i.e. this instance has been provisioned before.
  let coreSchemaPresent = false;
  try {
    await client.connect();
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    tableCount = rows[0]?.n ?? 0;

    // Is the CORE schema here, as opposed to any schema at all?
    //
    // studio_configs is the sentinel: every instance that has ever been provisioned has it,
    // and it is not one of the tables server/index.ts creates at boot.
    const { rows: core } = await client.query(
      `SELECT to_regclass('public.studio_configs') IS NOT NULL AS present`
    );
    coreSchemaPresent = core[0]?.present === true;
    await client.end();
  } catch (e) {
    try { await client.end(); } catch {}
    // Can't connect — let the server start and surface the real error.
    done(`could not inspect the database (${e?.message || e}) — skipping.`);
  }

  // THE WINDOW THIS USED TO NEED WAS ALREADY CLOSED BY THE TIME IT LOOKED.
  //
  // The test was `tableCount > 0`, which is a fair reading of "never touch a populated
  // database" and was wrong for the only case that matters. server/index.ts creates 32
  // tables of its own on every boot, so a database is empty exactly once — before the very
  // first start — and that moment has passed before anyone can set AUTO_INIT_SCHEMA.
  //
  // Observed on a Blueprint-provisioned tenant: first deploy skipped (the flag was not set
  // yet), the server booted and created its 32 tables, and every deploy after that reported
  // "database already has 32 table(s) — nothing to do". The instance sat permanently half
  // provisioned: studio_configs did not exist, /api/setup/status returned 500, and
  // /api/studio-config returned 200 because it degrades to neutral defaults — which made it
  // look fine from outside.
  //
  // The question is whether the CORE schema is present, not whether anything is. Safety is
  // unchanged and arguably stronger: a real instance always has studio_configs, so this
  // still cannot touch one.
  if (coreSchemaPresent) {
    done(`studio_configs already exists (${tableCount} table(s) present) — nothing to do.`);
  }
  if (tableCount > 0) {
    console.log(
      `[ensure-schema] ${tableCount} table(s) present but studio_configs is missing — ` +
      'this instance booted before it was provisioned. Creating the core schema.'
    );
  }

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
