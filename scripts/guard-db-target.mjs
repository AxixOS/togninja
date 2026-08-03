#!/usr/bin/env node
/**
 * Guard rail for destructive schema commands (drizzle-kit push).
 *
 * `drizzle-kit push` rewrites a database's schema to match the code and CAN DROP
 * COLUMNS AND DATA. Run it against the live New Age Fotografie CRM by accident
 * and you lose client records. This guard sits in front of it.
 *
 * Behaviour:
 *   1. Prints the target host + database so you always see where it's aimed.
 *   2. HARD REFUSES if the target matches PROTECTED_DB_HOSTS (never overridable).
 *   3. Otherwise requires you to type the database name to confirm.
 *   4. Automation may set DB_TARGET_CONFIRMED=1 to skip the prompt (the
 *      protected-host check still applies).
 *
 * Protect your production database by setting, in your local shell/CI:
 *   PROTECTED_DB_HOSTS="ep-xxxx.eu-central-1.aws.neon.tech,my-prod-host"
 */
import readline from 'node:readline';

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('\n✖ DATABASE_URL is not set. Point it at the TARGET database and retry.\n');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error('\n✖ DATABASE_URL is not a valid connection string.\n');
  process.exit(1);
}

const host = parsed.hostname;
const dbName = parsed.pathname.replace(/^\//, '') || '(default)';
const user = parsed.username || '(none)';

console.log('\n────────────────────────────────────────────────────────');
console.log('  SCHEMA PUSH — this can DROP COLUMNS AND DATA');
console.log('────────────────────────────────────────────────────────');
console.log(`  Host      : ${host}`);
console.log(`  Database  : ${dbName}`);
console.log(`  User      : ${user}`);
console.log('────────────────────────────────────────────────────────\n');

// 1) Never-overridable protection for known production databases.
const protectedHosts = (process.env.PROTECTED_DB_HOSTS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

const isProtected = protectedHosts.some(p => host.toLowerCase().includes(p));
if (isProtected) {
  console.error('🛑 REFUSED — this host is listed in PROTECTED_DB_HOSTS.');
  console.error('   That list exists to protect your live CRM. Schema pushes to it are blocked.');
  console.error('   If you genuinely need to migrate production, take a backup and do it deliberately,');
  console.error('   not through this command.\n');
  process.exit(1);
}

// 2) Non-interactive automation (the provisioner) may pre-confirm.
if (process.env.DB_TARGET_CONFIRMED === '1') {
  console.log('✓ DB_TARGET_CONFIRMED=1 — proceeding without a prompt.\n');
  process.exit(0);
}

// 3) Interactive confirmation: type the database name back.
if (!process.stdin.isTTY) {
  console.error('✖ Not an interactive terminal and DB_TARGET_CONFIRMED is not set — refusing.');
  console.error('  This prevents a scripted push from silently hitting the wrong database.\n');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question(`Type the database name (“${dbName}”) to confirm, or anything else to abort: `, (answer) => {
  rl.close();
  if (answer.trim() === dbName) {
    console.log('\n✓ Confirmed — continuing.\n');
    process.exit(0);
  }
  console.error('\n✖ Aborted — nothing was changed.\n');
  process.exit(1);
});
