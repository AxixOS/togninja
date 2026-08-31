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

console.log('\n=== the form is not built before the answers arrive ===');

const wizard = codeOnly(read('client/src/pages/setup/UnifiedSetupWizard.tsx'));

// Every phase seeds state with `useState({ field: initialData?.field || '' })`, and that
// initializer runs once. Rendering a phase while the status query is still in flight seeds
// every field blank and never looks again — so the studio meets an empty form, and pressing
// Continue writes those blanks over their stored address, phone, website and socials.
check('the wizard tracks whether the status query has resolved',
  /isPending: statusPending/.test(wizard));
check('and renders nothing until it has', /if \(statusPending\)/.test(wizard));
// Before the steps, not after — a gate below the render is not a gate.
const gateAt = wizard.indexOf('if (statusPending)');
const rendersAt = wizard.indexOf('current.render()');
check('the wait comes before the phase is rendered',
  gateAt > 0 && rendersAt > 0 && gateAt < rendersAt,
  gateAt < 0 ? 'the gate is gone' : rendersAt < 0 ? 'the render call moved — check this' : `gate@${gateAt} render@${rendersAt}`);

console.log('\n=== a blank submit cannot delete what is stored ===');

// The `fields` object POST /basics builds. `x || null` there means an unanswered field
// overwrites the stored one; drizzle drops `undefined` keys, so `|| undefined` preserves.
// Fourteen fields were on the wrong side of this, including `address` — which the comment
// on `city` had named as the counter-example and left in place.
const fieldsBlock = (() => {
  const at = setupRoutes.indexOf('    const fields = {');
  if (at < 0) return '';
  const end = setupRoutes.indexOf('    const existing = await getConfigRow();', at);
  return setupRoutes.slice(at, end > 0 ? end : at + 4000);
})();
check('the basics fields block was found', fieldsBlock.length > 0);
const nulls = [...fieldsBlock.matchAll(/^\s*([a-zA-Z]+):\s*[a-zA-Z?.\s]*\|\|\s*null,/gm)].map((m) => m[1]);
check('no field wipes a stored value to null', nulls.length === 0, nulls.join(', ') || 'none');
// `|| ''` is the same wipe wearing a different hat — metaDescription used it.
const blanks = [...fieldsBlock.matchAll(/^\s*([a-zA-Z]+):\s*[a-zA-Z?.\s]*\|\|\s*'',/gm)].map((m) => m[1]);
check('and none wipes it to an empty string', blanks.length === 0, blanks.join(', ') || 'none');

// Empty array is a value drizzle writes. cleanCredentials returned [] for a blank textarea,
// erasing a studio's degrees and insurance — under a comment promising it could not.
check('blank credentials are not stored as an empty list',
  /return out\.length \? out : undefined;/.test(setupRoutes));

// A currency default applied on every save resets a studio who chose otherwise. It belongs
// on the row being created and nowhere else.
const insert = (() => {
  const at = setupRoutes.indexOf('await db.insert(studioConfigs).values({');
  return at < 0 ? '' : setupRoutes.slice(at, at + 500);
})();
check('product defaults are applied only when creating the row',
  /dateFormat: fields\.dateFormat \|\| 'auto'/.test(insert)
  && /currency: fields\.currency \|\| 'EUR'/.test(insert));

console.log('\n=== the studio is not invited to do work twice ===');

// The image slots were live from the moment the step opened, beside a panel reading
// "Meanwhile, we are reading your website". So a studio could go and find a hero on their
// computer while the crawl was fetching the photographs already on their site — doing the
// job by hand a minute before the better option appeared underneath it.
const imagesRaw = read('client/src/pages/setup/phases/SiteImagesPhase.tsx');
const images = codeOnly(imagesRaw);
check('the slot knows the read is still running', /crawlRunning/.test(images));
check('uploading waits for it',
  /disabled=\{upload\.isPending \|\| !storageReady \|\| crawlRunning\}/.test(images));
// A disabled control with no reason beside it reads as broken rather than deliberate.
check('and says why', /Waiting until we have finished reading your website/.test(images));
// Offering the picker mid-crawl shows a partial set as though it were all of them.
check('their own photographs are offered only once the set is complete',
  /storageReady && !crawlRunning &&/.test(images));
// Both groups of slots, not just the site-wide three.
check('every slot gets the flag',
  (images.match(/crawlRunning=\{readRunning\}/g) || []).length === 2,
  `${(images.match(/crawlRunning=\{readRunning\}/g) || []).length} of 2 call sites`);

console.log('\n=== the photographs appear when they are found ===');

// The picker was fetched once, on the same mount that STARTS the crawl, with a five minute
// staleTime and nothing invalidating the key — so it was guaranteed to show an empty list for
// that entire visit. Observed as "it found them but very delayed": 34 photographs sitting in
// the database, invisible because the screen had stopped asking.
const ownQuery = (() => {
  const at = images.indexOf("queryKey: ['setup-crawled-images']");
  return at < 0 ? '' : images.slice(Math.max(0, at - 200), at + 500);
})();
check('the crawled-photograph query was found', ownQuery.length > 0);
check('it asks again while the read is unfinished', /refetchInterval/.test(ownQuery));
check('and stops once the run is over', /GEN_TERMINAL\.includes\(run\.status\)/.test(ownQuery));
check('a finished run refreshes it once more',
  /invalidateQueries\(\{ queryKey: \['setup-crawled-images'\] \}\)/.test(images));

// The server's only idempotency guard is status === 'running'. An unconditional POST on mount
// therefore started a WHOLE NEW run whenever it arrived at a finished one — new crawl_jobs
// row, and crawledImages() reads only the newest job, so the studio's photographs vanished
// from the picker they had come back to use. The sidebar invites exactly that revisit.
check('the read only starts when one has not already run',
  /gen\.status !== 'idle'/.test(images));
check('and never twice in the same visit', /kicked/.test(images));

console.log('\n=== waiting stops when the work does ===');

// Observed live after five minutes of "Still reading your website. Your services will appear
// here in a moment.": status 'ready', authority_map null, one landing page. The reading had
// finished; the services were never coming. The panel polled every four seconds for as long
// as the tab stayed open.
//
// readStopped excludes 'ready' on purpose — a successful run is not a failure to report. But
// the services panel used it to decide whether to keep WAITING, and a written homepage does
// not mean the service pages arrived: they are a separate chain with its own budget.
check('the pillars poll gives up when the run ends',
  /if \(run && GEN_TERMINAL\.includes\(run\.status\)\) return false;/.test(images));
check('the services panel asks whether the run finished, not whether it failed',
  /const readFinished = GEN_TERMINAL\.includes\(gen\?\.status\)/.test(images)
  && /readFinished \? \(/.test(images));
// Three different endings need three different sentences. Telling a studio "we couldn't read
// your services from your website" while their services are listed at the top of the same
// screen is the kind of wrong that discredits the rest of the page.
check('a written homepage with no service pages says exactly that',
  /could not build the pages behind your/.test(imagesRaw));

console.log('\n=== the picker offers photographs, not sponsors ===');

// The server-side assignment measures shape now; this list did not, so a studio was still
// offered "34 photographs" that were largely Mattel, Vapiano, Canon and Trayport.
// The WIRING, not the helper. `naturalWidth` sits inside judge(), which survives deleting the
// onLoad that calls it — so the check passed over thumbnails nothing measured. Caught biting.
check('thumbnails are measured as they load',
  /onLoad=\{\(e\) => judge\(img\.url, e\.currentTarget\)\}/.test(images) && /naturalWidth/.test(images));
check('with the same thresholds as the server', /w < 500 \|\| h < 350/.test(images));
check('and the grid shows only what passed', /\{shown\.map\(\(img\)/.test(images));
// A count that still says 34 while showing 9 is its own small lie.
check('the count follows what is shown', /\$\{shown\.length\} photograph/.test(images));

console.log('\n=== a new tab does not throw away a morning\'s work ===');

// The wizard knew where the studio was ONLY from sessionStorage, which belongs to one tab —
// and drew its progress bar from cursor position, percent = index / lastIndex. So the
// dashboard's "Finish setup" link, opening /setup fresh, showed "Step 1 of 6, 0% complete" to
// a studio whose look, basics, photographs and admin account were all saved. Nothing was
// lost; it read exactly as though everything had been.
// Anchored on the RESPONSE. /stepsComplete/ over the file matched the const that builds it,
// so deleting the line that SENDS it stayed green — the same trap as every other
// declaration-not-use check in this repo.
const statusResponse = (() => {
  const at = setupRoutes.indexOf('      currentStep,');
  return at < 0 ? '' : setupRoutes.slice(at, at + 500);
})();
check('the server reports the six steps by name', /stepsComplete/.test(statusResponse));
for (const k of ['look', 'basics', 'photographs', 'security', 'pricing', 'scanning']) {
  check(`  "${k}" is reported`, new RegExp('\\b' + k + ':').test(
    setupRoutes.slice(setupRoutes.indexOf('const stepsComplete'), setupRoutes.indexOf('const stepsComplete') + 900)));
}
check('the wizard reads it', /setupStatus\?\.stepsComplete/.test(wizard));
// null, not 0 — "we do not know yet" has to be distinguishable from "they are at the start".
check('an unknown position is not assumed to be the start', /useState<number \| null>/.test(wizard));
// The USE, not the declaration — pointing resolvedIndex back at 0 left the const in place.
check('and resolves to the first unfinished step',
  /index === null \? firstUnfinished : index/.test(wizard));
// Progress is work done, not how far they have clicked. Otherwise stepping back to change a
// colour scheme looks like undoing four steps.
check('progress counts finished steps',
  /completedCount \/ VISIBLE\.length/.test(wizard));
check('not cursor position', !/safeIndex \/ last/.test(wizard));
// strictNullChecks is off here, so `null + 1` silently became 1 — resuming at step four and
// sending the studio to step two on Continue. Nothing would have reported it.
check('moving on works from a resumed position',
  /setIndex\(Math\.min\(safeIndex \+ 1/.test(wizard) && /setIndex\(Math\.max\(safeIndex - 1/.test(wizard));
check('and the sidebar agrees with the card on screen',
  /const active = idx === safeIndex;/.test(wizard));

console.log('\n=== there is always a way back ===');

// This phase was the only one the wizard never handed an onBack, and its Back control was
// gated on `card > 0` — so the first card was a dead end and the only route backwards was
// noticing that the sidebar steps happen to be clickable.
check('the wizard hands Basics a way out', /<BasicsPhase[^>]*onBack=\{goBack\}/.test(wizard));
check('the phase accepts it', /onBack\?: \(\) => void;/.test(basics));
check('and the first card offers Back too',
  /card > 0 \? \([\s\S]{0,320}\) : onBack \? \(/.test(basics));

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
