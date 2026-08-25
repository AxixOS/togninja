// Can a new studio see their site without handing over four integrations first?
//
// The wizard had 15 steps and asked for Stripe, storage, email and calendar keys BEFORE
// showing anything — four integrations of friction in front of the one moment that sells
// this product. This checks the short path exists, that nothing was deleted to make it, and
// that every key it no longer asks for is gated somewhere a studio will meet it.
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const wiz = fs.readFileSync('client/src/pages/setup/UnifiedSetupWizard.tsx', 'utf8');
const caps = fs.readFileSync('server/lib/capabilities.ts', 'utf8');

console.log('\n=== the short path exists ===');
const essentials = [...wiz.matchAll(/essential: true/g)].length;
check('exactly three steps are essential', essentials === 3, essentials + ' marked');
check('the wizard walks a filtered list', /const VISIBLE = essentialsOnly \? STEPS\.filter/.test(wiz));
check('and defaults to the short one', /useState\(true\)/.test(wiz.slice(wiz.indexOf('essentialsOnly'))));

console.log('\n=== nothing was deleted to achieve it ===');
// The friction steps must still EXIST — the point is deferral, not removal.
for (const key of ['domain', 'email', 'stripe', 'storage', 'extras', 'calendar', 'lead_sources', 'integrations', 'site_images', 'fix_first', 'drafts']) {
  check(`  the ${key} step still exists`, new RegExp(`key: '${key}'`).test(wiz));
}
check('the long version is still reachable', /Set everything up now/.test(wiz));
// A toggle that changes the list without resetting the cursor renders the wrong step.
check('toggling resets the step index', /setEssentialsOnly\(\(v\) => !v\); setIndex\(0\)/.test(wiz));
check('a stale index cannot render undefined', /const safeIndex = Math\.min\(index/.test(wiz));

console.log('\n=== every deferred key is gated somewhere ===');
// This is the promise the short path makes: skip it now, meet it where it matters.
for (const [what, capKey] of [
  ['payments', 'online_payments'],
  ['storage', 'file_storage'],
  ['email', 'sending_email'],
  ['calendar', 'calendar_sync'],
  ['AI', 'ai_features'],
]) {
  check(`  ${what} has a capability`, new RegExp(`key: '${capKey}'`).test(caps));
}

console.log('\n=== and every gate is honest ===');
const entries = [...caps.matchAll(/key: '([a-z_]+)',\s*\n\s*label:/g)].map((m) => m[1]);
check('every capability states what still works',
  entries.length > 0 && (caps.match(/worksWithout:/g) || []).length >= entries.length,
  entries.length + ' capabilities');
check('a platform-owned key offers the studio no link',
  /settingsPath: state\.owner === 'studio' \? state\.settingsPath : null/.test(caps));
check('a rotated encryption key does not padlock everything',
  /encryptionHealthy/.test(caps) && /available: true, missing: \[\]/.test(caps));

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED — a new studio still cannot get to their site quickly\n`
  : '\n  ALL CHECKS PASSED — three steps to a site, nothing deleted, every deferred key gated\n');
process.exit(bad ? 1 : 0);
