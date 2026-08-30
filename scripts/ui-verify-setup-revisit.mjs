// "Click any completed step to go back and change it — nothing is lost."
//
// The wizard's sidebar says that. On 30 Aug 2026 a studio took it at its word: near the end of
// onboarding they went back to step 1 to change the colour scheme, and Business basics came
// back blank — no name, no role, no founding year — and pressing Continue answered
// "Missing required fields: businessName, businessType, timezone".
//
// Nothing had actually been deleted. GET /api/setup/status simply never sent those fields
// back, and businessType was REQUIRED by the save while having no column to be stored in at
// all — asked for, validated against, thrown away, then demanded again on the way back.
//
// These checks are about that sentence in the sidebar being true.
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const codeOnly = (src) =>
  src.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
const read = (p) => fs.readFileSync(p, 'utf8');

const setupRoutes = codeOnly(read('server/setup-routes.ts'));
const schema = codeOnly(read('shared/schema.ts'));
const boot = codeOnly(read('server/index.ts'));
const basics = codeOnly(read('client/src/pages/setup/phases/BasicsPhase.tsx'));

// The object GET /api/setup/status hands to BasicsPhase as initialData.
const payload = (() => {
  const at = setupRoutes.indexOf('      basics: {');
  if (at < 0) return '';
  const end = setupRoutes.indexOf('      integrations: {', at);
  return setupRoutes.slice(at, end > 0 ? end : at + 3000);
})();
const payloadKeys = new Set([...payload.matchAll(/^\s{10,}([a-zA-Z][a-zA-Z0-9]*):/gm)].map((m) => m[1]));

console.log('\n=== every answer the save DEMANDS is an answer it gives back ===');

check('the basics payload was found', payloadKeys.size > 5, `${payloadKeys.size} keys`);

// DERIVED, not listed. Whatever POST /basics validates as mandatory must be round-tripped,
// or reopening the step is a dead end for exactly that field. Adding a new required field
// without sending it back trips this without anyone having to remember to update a list.
const required = (() => {
  const m = setupRoutes.match(/if \(!([a-zA-Z]+) \|\| !([a-zA-Z]+) \|\| !([a-zA-Z]+)\) \{[\s\S]{0,200}Missing required fields/);
  return m ? [m[1], m[2], m[3]] : [];
})();
check('the required-field check was found', required.length === 3, required.join(', '));
for (const field of required) {
  check(`required "${field}" is sent back to the form`, payloadKeys.has(field));
}

console.log('\n=== businessType is actually kept ===');

// It had no column anywhere: not in shared/schema.ts, not in the database. A required field
// with nowhere to live can never come back.
check('the column exists in the schema', /businessType: text\("business_type"\)/.test(schema));
check('and is created on existing instances',
  /ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS business_type/.test(boot));
check('and the save writes it', /businessType: cleanStr\(businessType/.test(setupRoutes));

console.log('\n=== the About-you card comes back filled in ===');

for (const f of ['ownerName', 'ownerRole', 'ownerPortraitUrl', 'foundingYear', 'credentials']) {
  check(`"${f}" is sent back`, payloadKeys.has(f));
}
// The prop type is where this showed up first: five type errors sat on the lines that read
// these out of initialData, for as long as the payload had not been sending them.
check('the form declares them on initialData',
  /ownerName\?: string;/.test(basics) && /foundingYear\?: string;/.test(basics));

console.log('\n=== finishing setup without an account cannot lock the instance ===');

// POST /complete is exempt from authentication at the mount — it must be, it is what a
// first-run wizard calls before any session exists. But it sets creative_setup_complete,
// the flag that mount reads to decide whether mutations need authentication. Called with
// admin_users empty it shuts the door on an instance with nobody able to open it.
const complete = (() => {
  const at = setupRoutes.indexOf("router.post('/complete'");
  if (at < 0) return '';
  const end = setupRoutes.indexOf('router.', at + 10);
  return setupRoutes.slice(at, end > 0 ? end : at + 2000);
})();
check('the /complete handler was found', complete.length > 0);
check('it counts admin accounts first', /count\(\*\)::int AS n FROM admin_users/.test(complete));
check('and refuses when there are none', /needs: 'admin-account'/.test(complete));
// Before the flag, not after — refusing once the instance is already locked helps nobody.
const counts = complete.indexOf('FROM admin_users');
const flips = complete.indexOf('creativeSetupComplete: true');
check('the refusal comes before the flag is set',
  counts > 0 && flips > 0 && counts < flips,
  counts < 0 || flips < 0 ? 'one of the two moved' : `count@${counts} flag@${flips}`);

console.log(bad ? `\n${bad} FAILING\n` : '\nall good\n');
process.exit(bad ? 1 : 0);
