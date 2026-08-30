// After a reset, can the studio actually onboard again?
//
// On 30 Aug 2026 the demo answered no, silently. reset-demo cleared creative_setup_complete,
// technical_setup_complete and onboarding_state in ONE statement wrapped in a bare `catch {}`,
// run early — right after twenty-three TRUNCATE ... CASCADE calls. It threw, the catch ate it,
// the next statement succeeded, and the response said "Demo data cleared. Open /setup to start
// onboarding again."
//
// It had not. creative_setup_complete gates the /api/setup mount: true means mutations need
// authentication, and the same reset truncates admin_users — so there was no account to
// authenticate with, and the step that CREATES one is inside the wizard whose every save was
// now returning 401. Locked out of onboarding with no way back and nothing saying why.
//
// These checks are about that failure staying fixed, and about the fix that was REJECTED.
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

// Comments say what the code should do in the same words a check looks for, so a guard that
// reads them passes on the prose after the code beneath it is gone.
const codeOnly = (src) =>
  src.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
const read = (p) => fs.readFileSync(p, 'utf8');

const setupRoutes = codeOnly(read('server/setup-routes.ts'));
const tech = codeOnly(read('server/technical-setup-routes.ts'));
const routes = codeOnly(read('server/routes.ts'));

// Just the reset handler. Other parts of this file legitimately touch these columns.
const resetHandler = (() => {
  const at = setupRoutes.indexOf("router.post('/reset-demo'");
  if (at < 0) return '';
  const next = setupRoutes.indexOf('router.post(', at + 10);
  return setupRoutes.slice(at, next > 0 ? next : undefined);
})();

console.log('\n=== the reset reopens onboarding, and knows whether it did ===');

check('the reset handler is still there', resetHandler.length > 0);

// One statement setting all three is what failed. Each column now stands alone, so a problem
// with one cannot take the other two down with it.
check('each flag is cleared by its own statement',
  /SET creative_setup_complete = false`/.test(resetHandler)
  && /SET technical_setup_complete = false`/.test(resetHandler)
  && /SET onboarding_state = NULL`/.test(resetHandler));
check('never all three in one statement again',
  !/creative_setup_complete = false, technical_setup_complete = false/.test(resetHandler));

// The write claiming success is not evidence it happened — that is the whole lesson.
//
// Anchored on the SELECT itself. `/state_cleared/` matched the name in two places, so
// removing one still passed; the check has to be that the row is actually re-read.
check('the reopen is read back',
  /SELECT[\s\S]{0,200}creative_setup_complete AS creative[\s\S]{0,200}FROM studio_configs/.test(resetHandler));
// Silence is what made this expensive. A reset that cannot reopen must say so.
check('a failed reopen is reported, not swallowed',
  /reopenFailed/.test(resetHandler) && /ok: false/.test(resetHandler));
check('and answers with an error status', /status\(500\)[\s\S]{0,200}reopenFailed/.test(resetHandler));
check('the three writes are not in a bare catch',
  !/catch \{\}[^\n]*creative_setup_complete/.test(resetHandler));

// LAST, so nothing else in a 200-line handler can fail ahead of it.
// The CALL, not the definition. Deleting the call left the arrow function declared further
// down the handler, so looking for the name alone kept passing with nothing invoking it.
const clearsName = resetHandler.indexOf('business_name = NULL');
const reopens = resetHandler.indexOf('await reopenOnboarding()');
check('the reopen runs after the rest of the reset',
  clearsName > 0 && reopens > clearsName,
  clearsName < 0 ? 'the business_name clear moved' : `name@${clearsName} reopen@${reopens}`);

console.log('\n=== a read endpoint does not re-lock the wizard ===');

// GET /api/setup/technical/status is polled by the admin shell and three setup screens. It
// used to write BOTH flags, so looking at a page could shut the wizard. The SKIP_ONBOARDING
// half of its condition reaches that with no admin account — nobody left who could log in.
const statusHandler = (() => {
  const at = tech.indexOf("router.get('/status'");
  if (at < 0) return '';
  const next = tech.indexOf('router.', at + 10);
  return tech.slice(at, next > 0 ? next : undefined);
})();
check('the status endpoint is still there', statusHandler.length > 0);
check('it no longer writes the completion flags',
  !/UPDATE studio_configs[\s\S]{0,160}creative_setup_complete = true/.test(statusHandler));

console.log('\n=== the auth gate was NOT loosened ===');

// The tempting fix was: let /api/setup mutations through when admin_users is empty, since the
// admin is created inside the wizard so no admin means setup cannot have finished.
//
// It is UNSAFE, and only mount ordering shows why. `/api/setup` is mounted BEFORE
// `/api/setup/technical`, so every /api/setup/technical/* request passes through this gate
// first; setupRoutes has no such route, calls next(), and falls into the technical mount —
// whose own rule is already "no admin, open". Today this gate is the ONLY thing in front of
// POST /api/setup/technical/security, which CREATES an admin_users row with a caller-chosen
// email and password and signs them in. Opening it on zero admins is one-request takeover of
// a live studio, plus SMTP/Stripe/storage overwrite.
//
// So the lockout was fixed in the reset instead. If this check ever fails, that reasoning is
// being undone: read it before changing the assertion.
// Bounded at `}, setupRoutes)` — the gate's own body and nothing after it. A fixed-size slice
// ran past the end into the /api/setup/technical mount, which checks admin_users legitimately,
// so the check reported the rejected fix as applied when it was not.
const gate = (() => {
  const at = routes.indexOf("app.use('/api/setup'");
  if (at < 0) return '';
  const end = routes.indexOf('}, setupRoutes)', at);
  return routes.slice(at, end > 0 ? end : at + 1400);
})();
check('the setup gate is still there', gate.length > 0);
check('a completed setup still requires authentication',
  /authenticateUser\(req, res, next\)/.test(gate));
check('and emptiness of admin_users does not open it',
  !/admin_users/.test(gate),
  /admin_users/.test(gate) ? 'the rejected fix appears to have been applied' : '');

console.log(bad ? `\n${bad} FAILING\n` : '\nall good\n');
process.exit(bad ? 1 : 0);
