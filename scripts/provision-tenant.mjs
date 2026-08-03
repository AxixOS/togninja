#!/usr/bin/env node
/**
 * Provision a NEW customer instance — one command per sale.
 *
 *   node scripts/provision-tenant.mjs --name "Susan Grace Hinman" \
 *        --db "postgresql://…FRESH-EMPTY-DB…"
 *
 * What it does (in order):
 *   1. Refuses if the target database is protected or already populated.
 *   2. Creates the schema + baseline (reuses bootstrap-tenant).
 *   3. Generates a strong SESSION_SECRET for the instance.
 *   4. Prints the exact env block to paste into Render/Heroku, plus the
 *      /setup URL to send the customer.
 *
 * It deliberately does NOT touch any existing database, and never reads or
 * writes the New Age Fotografie production CRM.
 *
 * Flags:
 *   --name   <string>  Studio name (labelling only)
 *   --db     <url>     Connection string for a FRESH, EMPTY Postgres
 *   --demo             Also load demo content (default: clean, no demo data)
 *   --host   <url>     Where the instance will be hosted (for the printed URL)
 *   --yes              Skip the confirmation prompt (for automation)
 */
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import readline from 'node:readline';
import pg from 'pg';

const argv = process.argv.slice(2);
const flag = (name, fallback = '') => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const studioName = flag('name', 'New studio');
const dbUrl = flag('db', process.env.TENANT_DATABASE_URL || '');
const hostUrl = flag('host', '');
const withDemo = has('demo');
const autoYes = has('yes');

const fail = (msg) => { console.error(`\n✖ ${msg}\n`); process.exit(1); };

if (!dbUrl) {
  fail('Missing --db. Pass a connection string for a FRESH, EMPTY Postgres database.\n' +
       '  Create one at neon.tech or supabase.com (takes ~2 minutes), then re-run.');
}

let parsed;
try { parsed = new URL(dbUrl); } catch { fail('--db is not a valid connection string.'); }

// ── Guard 1: never a protected/production host ─────────────────────────────
const protectedHosts = (process.env.PROTECTED_DB_HOSTS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
if (protectedHosts.some(p => parsed.hostname.toLowerCase().includes(p))) {
  fail(`REFUSED — ${parsed.hostname} is listed in PROTECTED_DB_HOSTS.\n` +
       '  Provisioning only ever targets a brand-new empty database.');
}

console.log('\n────────────────────────────────────────────────────────');
console.log('  PROVISION NEW TENANT');
console.log('────────────────────────────────────────────────────────');
console.log(`  Studio    : ${studioName}`);
console.log(`  Host      : ${parsed.hostname}`);
console.log(`  Database  : ${parsed.pathname.replace(/^\//, '') || '(default)'}`);
console.log(`  Content   : ${withDemo ? 'baseline + demo content' : 'clean (no demo data)'}`);
console.log('────────────────────────────────────────────────────────\n');

// ── Guard 2: the database must be EMPTY ────────────────────────────────────
console.log('▶ Checking the target database is empty…');
const client = new pg.Client({
  connectionString: dbUrl,
  ssl: /localhost|127\.0\.0\.1/.test(parsed.hostname) ? undefined : { rejectUnauthorized: false },
});
try {
  await client.connect();
  const { rows } = await client.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' LIMIT 5`
  );
  if (rows.length > 0) {
    const names = rows.map(r => r.table_name).join(', ');
    await client.end();
    fail(`REFUSED — that database already contains tables (${names}…).\n` +
         '  Provisioning must target an EMPTY database so an existing studio can never be overwritten.\n' +
         '  Create a new database and re-run.');
  }
  await client.end();
  console.log('  ✓ Database is empty — safe to provision.\n');
} catch (e) {
  try { await client.end(); } catch {}
  if (String(e?.message || '').includes('REFUSED')) throw e;
  fail(`Could not connect to the database: ${e?.message || e}`);
}

// ── Confirm ────────────────────────────────────────────────────────────────
if (!autoYes) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(r => rl.question('Provision this tenant? Type "yes" to continue: ', a => { rl.close(); r(a); }));
  if (answer.trim().toLowerCase() !== 'yes') fail('Aborted — nothing was created.');
}

// ── Build the schema + baseline ────────────────────────────────────────────
const env = { ...process.env, DATABASE_URL: dbUrl, DB_TARGET_CONFIRMED: '1' };
try {
  console.log('\n▶ Creating schema and baseline data…\n');
  execSync(`node scripts/bootstrap-tenant.mjs${withDemo ? ' --demo' : ''}`, { stdio: 'inherit', env });
} catch {
  fail('Bootstrap failed — see the output above. Nothing else was changed.');
}

// ── Instance secrets + handover ────────────────────────────────────────────
const sessionSecret = randomBytes(48).toString('base64');
const setupUrl = hostUrl ? `${hostUrl.replace(/\/+$/, '')}/setup` : 'https://<your-instance-host>/setup';

console.log('\n────────────────────────────────────────────────────────');
console.log('  ✅ TENANT READY');
console.log('────────────────────────────────────────────────────────\n');
console.log('1) Set these environment variables on the new instance:\n');
console.log(`DATABASE_URL=${dbUrl}`);
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log('NODE_ENV=production');
console.log('DEMO_MODE=false');
console.log(`PUBLIC_SITE_URL=${hostUrl || 'https://<customer-domain>'}`);
console.log('\n   (Leave OpenAI/Stripe/SMTP/storage unset — the customer enters');
console.log('    their own in the setup wizard, stored encrypted per tenant.)\n');
console.log('2) Deploy, then send the customer:\n');
console.log(`   ${setupUrl}\n`);
console.log('3) They complete the wizard; the CRM then contains ONLY their data.\n');
