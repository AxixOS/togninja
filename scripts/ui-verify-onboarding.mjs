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

const read = (p) => fs.readFileSync(p, 'utf8');
const wiz = fs.readFileSync('client/src/pages/setup/UnifiedSetupWizard.tsx', 'utf8');
const caps = fs.readFileSync('server/lib/capabilities.ts', 'utf8');

console.log('\n=== the short path exists ===');
// The property is a SHORT path to a working site, not a particular integer.
//
// This asserted exactly three, which was right when the three were basics, admin account
// and scan. A fourth was then added deliberately — "Choose your look", first, because a
// photographer should be asked what they want their site to look like before they are asked
// for a VAT number, and because it is two clicks with a Skip beside them.
//
// Pinning the number would have forced a choice between reverting that and editing a guard
// to say whatever the code now does, which is how a guard stops meaning anything. What is
// asserted instead is the ceiling that keeps the path short, and separately that each
// essential step is one a studio genuinely cannot launch without or can dismiss in a click.
const essentials = [...wiz.matchAll(/essential: true/g)].length;
check('the essential path stays short', essentials >= 3 && essentials <= 5, essentials + ' steps');

// Named, so adding a fifth is a decision someone makes here rather than a number quietly
// creeping up.
const ESSENTIAL_KEYS = ['look', 'basics', 'security', 'scanning'];
const markedEssential = [...wiz.matchAll(/\{ key: '([a-z_]+)'[^}]*essential: true/g)].map((m) => m[1]);
check('the essential steps are the expected ones',
  ESSENTIAL_KEYS.length === markedEssential.length
  && ESSENTIAL_KEYS.every((k) => markedEssential.includes(k)),
  markedEssential.join(', '));

// A step placed first must be skippable, or it is a gate rather than an invitation.
check('the first step can be skipped',
  /Skip for now/.test(fs.readFileSync('client/src/pages/setup/phases/LookPhase.tsx', 'utf8')));
// The last step must END setup, not sit there.
//
// goNext() clamped to the final index, so on the last step it scrolled to the top and did
// nothing. Only the drafts step called finish() directly, and drafts is not in the
// essentials path — so for every studio taking the short route, which is the DEFAULT, the
// final button in onboarding was dead. They finished the scan, pressed Continue, and the
// page moved half an inch.
const scanning = read('client/src/pages/setup/phases/ScanningPhase.tsx');

check('finishing the last step finishes setup',
  wiz.includes('if (safeIndex >= VISIBLE.length - 1) {')
  && wiz.includes('void finish();'));

// And it must say so. The scan step promised to continue to a Fix-first step that the
// essentials path never shows.
check('the last step does not promise a step that is not there',
  scanning.includes("isLast ? 'Finish setup'"));

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
