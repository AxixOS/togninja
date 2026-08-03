#!/usr/bin/env node
// One-shot tenant bootstrap — run ONCE against a FRESH database to stand up a new instance.
//
//   node scripts/bootstrap-tenant.mjs           # schema + baseline (admin, studio config, prices, vouchers)
//   node scripts/bootstrap-tenant.mjs --demo    # ...plus demo content (clients, galleries, blog posts)
//
// Requires DATABASE_URL pointed at the target tenant DB. Reuses the existing npm scripts
// (db:push → db:init → demo:setup) so there's a single source of truth for each step.
import { execSync } from 'node:child_process';

const demo = process.argv.includes('--demo');

if (!process.env.DATABASE_URL) {
  console.error('✖ DATABASE_URL is not set. Point it at the fresh tenant database and retry.');
  process.exit(1);
}

// Confirm the target ONCE here (guard-db-target refuses a non-interactive
// push), then pass the confirmation down to the individual npm steps.
if (process.env.DB_TARGET_CONFIRMED !== '1') {
  try {
    execSync('node scripts/guard-db-target.mjs', { stdio: 'inherit', env: process.env });
  } catch {
    console.error('\n✖ Bootstrap aborted at the safety check — nothing was changed.\n');
    process.exit(1);
  }
}
process.env.DB_TARGET_CONFIRMED = '1';

const step = (label, cmd) => {
  console.log(`\n▶ ${label}\n  $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: process.env });
};

try {
  // Schema + baseline are required — a failure here aborts.
  step('1/‎' + (demo ? '3' : '2') + '  Create schema (drizzle push)', 'npm run db:push');
  step('2/‎' + (demo ? '3' : '2') + '  Seed baseline (admin, studio config, prices, vouchers, coupons)', 'npm run db:init');
  // Demo content is best-effort — never block provisioning on it.
  if (demo) {
    try {
      step('3/3  Load demo content (clients, leads, galleries, blog posts)', 'npm run demo:setup');
    } catch (demoErr) {
      console.warn('\n⚠️  Demo content step failed (non-fatal):', demoErr?.message || demoErr);
    }
  }
  console.log(`\n✅ Bootstrap complete${demo ? ' (demo content best-effort)' : ''}.`);
  console.log('   Next: open the instance and finish the setup wizard (domain, mail, Stripe, storage, admin password).');
} catch (e) {
  console.error('\n✖ Bootstrap failed:', e?.message || e);
  console.error('  Check DATABASE_URL and that devDependencies (drizzle-kit) are installed.');
  process.exit(1);
}
