// Can a studio we just sold to actually complete their own setup?
//
// They could not. Three links, each defensible alone:
//
//   scripts/init-database.ts seeded admin@photography-crm.local / admin123 on every
//   provisioned instance — a known credential on a public URL.
//
//   server/index.ts read "an admin row exists" as "this instance has already been set up"
//   and flipped technical_setup_complete and creative_setup_complete to true. On a fresh
//   instance that was true the moment the seeder ran, before the buyer had typed anything.
//
//   server/routes.ts:2083 then put every POST /api/setup behind authenticateUser, because
//   onboarding was "complete".
//
// So the buyer was locked out of the setup they had just bought, by a flag set because of
// an account they were never given — and the login page pre-filled that account's email,
// which on the live instance is not even the real admin.
//
// Run: node scripts/gal-verify-first-run.mjs
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};
const code = (s) => s.split('\n').filter((l) => {
  const t = l.trim();
  return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
}).join('\n');

const init = fs.readFileSync('scripts/init-database.ts', 'utf8');
const index = fs.readFileSync('server/index.ts', 'utf8');
const login = fs.readFileSync('client/src/pages/admin/AdminLoginPage.tsx', 'utf8');
const routes = fs.readFileSync('server/routes.ts', 'utf8');

console.log('\n=== no instance ships with a known password ===');
check('the demo admin is opt-in', /SEED_DEMO_ADMIN/.test(init));
check('and off unless explicitly asked for',
  /!== 'true'/.test(code(init)) && /return true;/.test(code(init)));
// The literal may remain as the demo default, but only behind the flag.
const guardAt = init.indexOf('SEED_DEMO_ADMIN');
const hashAt = init.indexOf('bcrypt.hash(demoPassword');
check('the password hash is only reached past the guard', guardAt > 0 && hashAt > guardAt);
check('the demo password is overridable', /SEED_DEMO_ADMIN_PASSWORD/.test(init));

console.log('\n=== the login form advertises nobody ===');
// Match the declaration directly. The first version sliced the file BEFORE the first
// occurrence of setEmail and searched that, so the useState it was looking for was never
// in the string — a guard failing on correct code, which is worse than no guard at all.
check('the email field starts empty',
  /const \[email, setEmail\] = useState\(''\)/.test(code(login)));
check('the seeded address is gone from the form', !/admin@photography-crm\.local/.test(code(login)));

console.log('\n=== "already set up" is a fact about the STUDIO, not the auth table ===');
check('the check no longer counts admin rows',
  !/SELECT EXISTS\(SELECT 1 FROM admin_users/.test(code(index)));
check('it asks whether the studio has a name',
  /FROM studio_configs[\s\S]{0,120}business_name/.test(code(index)));
// Whitespace-only is not a name; a studio that typed a space has not onboarded.
check('a blank or whitespace name does not count', /nullif\(trim\(/.test(code(index)));

console.log('\n=== the gate it feeds still exists, and still opens for a fresh instance ===');
// If this regressed the other way, setup would be open forever on a live studio.
check('setup mutations are gated once onboarding completes',
  /creative_setup_complete AS done/.test(routes) && /return authenticateUser\(req, res, next\)/.test(routes));
check('and an incomplete instance is allowed through',
  /if \(!done\) return next\(\)/.test(routes));
check('as is an empty database', /catch \{[\s\S]{0,80}return next\(\)/.test(routes));

console.log('\n=== the buyer can still become an admin ===');
// Removing the seed would be worse than the bug if nothing else created one.
const tech = fs.readFileSync('server/technical-setup-routes.ts', 'utf8');
check('onboarding creates an admin from the buyer\'s own details',
  /db\.insert\(adminUsers\)\.values\(\{[\s\S]{0,200}passwordHash: hash/.test(tech));
check('and it updates rather than duplicates an existing one',
  /if \(existing\) \{[\s\S]{0,160}db\.update\(adminUsers\)/.test(tech));

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED — a new studio may not be able to set itself up\n`
  : '\n  ALL CHECKS PASSED — a provisioned studio can complete its own setup, and ships with no default credential\n');
process.exit(bad ? 1 : 0);
