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
check('the essential path stays short', essentials >= 3 && essentials <= 6, essentials + ' steps');

// Named, so adding one is a decision someone makes here rather than a number quietly
// creeping up.
//
// SIXTH, ADDED 28 AUG 2026: 'pricing'. Finding the photographers working in the studio's own
// town is among the few genuinely uncommon things this product does, and it sat at
// /admin/price-wizard behind a management screen — met only by a studio who already knew to
// look for it. Shown during setup it is an argument for buying; shown afterwards it is a
// feature nobody found.
//
// It qualifies under the second half of the rule above rather than the first: no studio needs
// it to launch, and it is dismissed with the "Skip for now" beside it, which the checks
// further down assert is still there. If the path ever needs shortening again this is the
// first of the six to demote — mark it non-essential and it moves to the long path intact.
const ESSENTIAL_KEYS = ['look', 'basics', 'photographs', 'security', 'pricing', 'scanning'];
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

// ── The photographs actually reach the page ─────────────────────────────────
//
// Every studio finished onboarding with no images: homepage_images had zero rows and every
// landing page had a null hero, because the images step was not essential and the essentials
// path is the default.
//
// Worse, fixing that alone would not have helped. The renderer reads
// landing_pages.hero_image_url; the pipeline never set it, and the upload handler set it only
// for PILLAR sections. So the 'hero' slot — the single most important photograph on the site
// — wrote a row the generated homepage does not read, and the preview stayed empty no matter
// what was uploaded.
const setupRoutes = read('server/setup-routes.ts');
const pipeline = read('server/lib/homepage-pipeline.ts');
const images = read('client/src/pages/setup/phases/SiteImagesPhase.tsx');

// Moved out of setup-routes into lib/siteImageStore, so the AUTOMATIC path gets it too — it
// used to be reachable only by a human picking a file in the wizard. The property is
// unchanged and so is this check; only the file it reads moved.
const siteImageStore = read('server/lib/siteImageStore.ts');
check('a hero uploaded after generation reaches the draft',
  siteImageStore.includes("if (section === 'hero') {")
  && siteImageStore.includes('UPDATE landing_pages SET hero_image_url'));

check('a hero uploaded before generation reaches the draft',
  pipeline.includes("SELECT url FROM homepage_images WHERE section = 'hero'")
  && pipeline.includes('hero_image_url'));

// The two together are what make the concurrent step safe: the studio can finish uploading
// before or after the draft is written, and either way the picture is on it.

// ── The upload runs while the site is read ──────────────────────────────────
// Matched on the PROPERTY — startScan gates it, and it POSTs the generate endpoint — rather
// than on one exact line. This pinned `if (!startScan) return;`, so adding the condition that
// stops a revisit re-crawling and wiping the studio's own photographs out of the picker broke
// a check whose meaning was untouched. Third time this file has taught that lesson; a guard
// that fails when the code around it grows gets edited rather than heeded.
check('the photographs step starts the website read',
  /if \(!startScan[^)]*\) return;/.test(images)
  && images.includes("fetch('/api/setup/homepage/generate'"));

// This asserted the step was SPLIT — site slots early, service slots in a later step. The
// split was sound reasoning applied to the wrong lever: the site slots need no crawl and the
// service slots do, so they went in two steps, and the second was never marked essential. The
// default path therefore skipped it, and a studio finished onboarding having been offered
// three photographs out of nine while the other six existed, were listed by the endpoint, and
// were rendered nowhere.
//
// One step now shows all of them. The property that split was protecting — never make the
// studio WAIT for the crawl — is unchanged and is what gets checked: the site slots render
// immediately, and only the service block is gated on the crawl having named the pages.
// Asserted on the ESSENTIAL step specifically. The first version of this check said no
// only="pillar" step may exist at all, which would have meant deleting the revisit entry from
// the long path — the opposite of the deferral-not-removal rule checked further down. What
// matters is that the step every studio actually walks offers every slot.
check('every slot is offered in the step every studio walks',
  /essential: true, render: \(\) => <SiteImagesPhase only="all"/.test(wiz),
  'the service slots existed and were listed by the endpoint, and were shown to nobody');

check('the service slots still wait for the crawl, and only they do',
  images.includes("only === 'site' ? [] : slots.filter")
  && images.includes('data?.pillarsReady ? ('),
  'the site slots must not be held back by a read that has not finished');

// A studio who wants none of this must still be able to leave. Nine slots is a lot of cards to
// look at, and an unfilled one blocking Continue would turn an optional step into a wall.
check('and nothing blocks Continue on an unfilled slot',
  !/disabled=\{[^}]*shownFilled/.test(images),
  'every slot is optional — the auto-assignment has already filled them anyway');

// One component in two modes. A second copy would have drifted from this one within a week,
// which is a thing this codebase has already paid for several times.
// An upload that cannot succeed must say so BEFORE the file picker.
//
// The payload carried no storage state, so every slot rendered an enabled Add image button
// and a "use one of your own photographs" link, and a studio on an instance without storage
// credentials found out by choosing a file and getting a 503 — once per slot. Survivable
// while the step was optional and last; not now that it is essential and third, on the screen
// whose job is to make the crawl wait feel productive.
check('the step is told whether uploads can succeed',
  setupRoutes.includes('storageReady,') && setupRoutes.includes('getS3Config().isConfigured'));

// Matched on the CONDITION, not the whole expression. This pinned the exact string
// `disabled={upload.isPending || !storageReady}`, so adding a second, unrelated reason to
// disable the button — waiting for the crawl to finish — failed a check whose property was
// still perfectly true. A guard that breaks when the code around it grows teaches people to
// edit the guard, which is how it stops meaning anything.
check('and refuses up front rather than after a file picker',
  /disabled=\{[^}]*!storageReady[^}]*\}/.test(images)
  && images.includes('We cannot store photographs yet'));

// The picker uses the same upload path, so it must be subject to the same answer.
// Same reasoning as above: what matters is that storageReady stands in front of the picker,
// not that it is the only thing standing there.
check('the own-photograph picker is gated with it',
  /\{storageReady &&[^}]{0,40}<OwnPhotographs/.test(images)
  || /\{storageReady && !crawlRunning && \([\s\S]{0,80}<OwnPhotographs/.test(images));

// Defaulting to true matters: a client running against a server that has not redeployed
// yet must behave exactly as before, not lock every studio out of uploading.
check('an older server does not lock uploads out',
  images.includes('data?.storageReady !== false'));

check('the two halves are one component',
  !fs.existsSync('client/src/pages/setup/phases/SitePhotographsPhase.tsx'));

// ── Your place survives a reload ────────────────────────────────────────────
//
// The step was useState(0) and /setup was declared as TWO routes rendering the same
// component. React Router treats those as different matches, so moving between /setup and
// /setup/ unmounted the wizard and mounted a fresh one — back to step 1, with every answer
// still saved on the server and no way for the studio to tell. Any refresh did the same.
const app = read('client/src/App.tsx');
check('setup is one route, not two',
  (app.split('element={<UnifiedSetupWizard />}').length - 1) === 1,
  'two entries for one component remount it whenever the match changes');

check('the current step is remembered',
  wiz.includes('sessionStorage.getItem(STEP_KEY)')
  && wiz.includes('sessionStorage.setItem(STEP_KEY'));

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
// The CLAMP, not the name of what is clamped. This pinned `Math.min(index`, so renaming the
// input to `resolvedIndex` — because the position now comes from the server when this tab has
// never been told — failed a check whose property was untouched. Fourth time in this file.
check('a stale index cannot render undefined',
  /const safeIndex = Math\.min\([a-zA-Z]+, Math\.max\(VISIBLE\.length - 1, 0\)\)/.test(wiz));

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
// Asserts the BEHAVIOUR, not the formatting. The first version matched the literal string
// "available: true, missing: []", so reformatting that object into a multi-line literal —
// which is exactly what adding a status field required — turned it red on code that still
// does the right thing. A check that breaks when you reindent is one people learn to edit
// rather than heed.
check('a rotated encryption key does not padlock everything',
  caps.includes('encryptionHealthy')
  && caps.includes('available: true,')
  && caps.includes("status: 'unreadable' as const"),
  'doors stay open; the status carries the truth');

console.log('\n=== a run that stops tells you it stopped ===');
// The homepage pipeline reaches three terminal states. ScanningPhase stops polling on all
// three — but only rendered a panel for two, so 'skipped' made the generation card vanish
// mid-run: "Writing your new homepage…" disappeared and the studio was told nothing. No
// error, no retry, no way to tell a missing credential from a crash from a finished job.
//
// Bound to the pipeline rather than to a list written here, so a fourth terminal state added
// later fails this check instead of silently rendering nothing. quota_exceeded is coming.
// `pipeline` and `scanning` are already read above — reusing them rather than reading the
// same two files a second time under new names.
const terminal = [...new Set(
  [...pipeline.matchAll(/state\.status = '([a-z_]+)'/g)].map((m) => m[1]),
)].filter((s) => s !== 'running');

// Bound to a RENDER, not to a mention. This looked for `hp?.status === '<state>'` anywhere in
// the file — a string that also appears in the polling-stop condition and in any early return.
// It happened to be right only because ScanningPhase's poll uses `hp.status` without the
// optional chain; a single edit to that line would have made every state read as "rendered"
// while nothing appeared on screen. The JSX opener is the thing that puts pixels up.
// The `{` opener and the `&&` are what make it a render; the poll's condition is an `if (...)`
// with no brace and no optional chain, so the two stay distinguishable. Deliberately NOT
// requiring `&& (` immediately after: 'ready' renders under two panels that each add a further
// condition (`&& hp?.previewUrl`), and demanding the state be the sole term failed correct code.
const unrendered = terminal.filter((s) => !scanning.includes(`{hp?.status === '${s}' &&`));
check('every terminal generation state renders something',
  unrendered.length === 0,
  unrendered.length ? `silent: ${unrendered.join(', ')}` : `${terminal.join(', ')} all surface`);

// A missing platform credential is not fixed by asking again. Offering a retry there just
// fails again and reads to the studio as their problem rather than ours.
// Scoped to the PANEL, by balanced parentheses from its JSX opener — not to the first 700
// characters after the first mention of the string. That window was escapable from both ends:
// anchored on any earlier occurrence, and satisfied by pushing the button past character 700.
const skippedBlock = (() => {
  const open = scanning.indexOf("{hp?.status === 'skipped' && (");
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < scanning.length; i++) {
    if (scanning[i] === '(') depth++;
    else if (scanning[i] === ')') { depth--; if (depth === 0) return scanning.slice(open, i + 1); }
  }
  return scanning.slice(open);
})();
check('the unavailable state does not offer a pointless retry',
  skippedBlock.length > 0 && !skippedBlock.includes('handleRegenerate'),
  skippedBlock.length ? 'a platform key does not appear because somebody clicked Try again' : 'panel not found');

console.log('\n=== the open generate endpoint is bounded ===');
// POST /api/setup/homepage/generate is reachable by anyone while creative_setup_complete is
// false — the state a freshly provisioned tenant sits in, on a public URL, before its owner has
// logged in. One run spends a homepage, a profile distil, an authority map and a pillar page
// per pillar, all platform-funded. Its only gate was `status === 'running' && !force`, which
// ?force=1 steps over, so a loop drained the platform's budget for a studio who had not arrived.
const genRoute = (() => {
  const a = setupRoutes.indexOf("router.post('/homepage/generate'");
  const b = setupRoutes.indexOf("router.post('/homepage/starter'");
  return a < 0 ? '' : setupRoutes.slice(a, b > a ? b : a + 6000);
})();

check('a forced regenerate still respects a cooldown',
  genRoute.includes('GENERATE_COOLDOWN_MS') && genRoute.includes('cooling-down'));

check('and a lifetime run limit',
  genRoute.includes('GENERATE_MAX_RUNS') && genRoute.includes('run-limit'));

// The bounds must be unconditional. Inside an `if (!force)` they would be decoration, which is
// precisely what the original gate was.
check('the bounds are not something force can step over',
  genRoute.includes('GENERATE_COOLDOWN_MS')
  && !/!force[\s\S]{0,400}GENERATE_(COOLDOWN_MS|MAX_RUNS)/.test(genRoute),
  'checked unconditionally, after the idempotency gate');

// A counter the pipeline resets counts to one forever. runHomepagePipeline builds a fresh
// state object every run, so this field has to be carried across deliberately.
check('the run counter survives the run that increments it',
  pipeline.includes('priorRuns') && pipeline.includes('runs: priorRuns + 1'),
  'the pipeline rebuilds its state each run and would otherwise zero it');

// A refusal the client discards is a button that does nothing when pressed.
check('a refused regenerate is shown to the studio',
  scanning.includes('setHpNotice') && scanning.includes('{hpNotice &&'),
  'the 429 carries a reason; it has to reach the screen');

// ── Both pollers agree on when the run has stopped ──────────────────────────
//
// TWO components poll the same generation: ScanningPhase and SiteImagesPhase. SiteImagesPhase
// polled on a flat `startScan ? 2500 : false` with no terminal check at all, so it kept asking
// every 2.5s for as long as the step was mounted — and went on rendering "Still reading your
// website" under an animated spinner over a run that had ended in a refusal.
//
// Its GEN_TERMINAL list is checked against the pipeline rather than against a copy written
// here, so a fifth state added server-side fails this instead of silently never arriving.
// `images` is already read near the top of this file — reusing it rather than declaring a
// second binding for the same component, which is the third name collision this script has
// produced by not checking what it already has in scope.
const declared = (images.match(/const GEN_TERMINAL = \[([^\]]*)\]/) || [, ''])[1]
  .split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
const missingFromList = terminal.filter((s) => !declared.includes(s));

check('the photographs step knows every terminal state',
  declared.length > 0 && missingFromList.length === 0,
  missingFromList.length ? `not in GEN_TERMINAL: ${missingFromList.join(', ')}` : declared.join(', '));

// The stop condition moved from the homepage status to genSettled, which is the same test
// PLUS the service-page chain. It has to stop — a flat interval polls a finished job for as
// long as the tab is open — but stopping at the homepage was too early: the pillars run on
// after it, so the poll quit minutes before the work did.
check('and stops polling when the run stops',
  images.includes('!genSettled(q.state.data)'),
  'a flat interval polls a finished job for as long as the tab is open');

// ── A run that died with its process stops claiming to be running ───────────
//
// runHomepagePipeline writes 'running' and then works for a minute or two in ONE process. If
// that process goes away mid-run — a deploy, a restart, an OOM — nothing writes a terminal
// status, because the only code that would have has stopped existing.
//
// 'running' is not terminal, so both pollers keep asking and the wizard shows "Writing your
// homepage in your own words" indefinitely, with no way out from inside the product. startedAt
// was written for exactly this case and nothing read it.
check('a run that died with its process stops being "running"',
  setupRoutes.includes('GEN_STALE_MS')
  && /const stalled\s*=/.test(setupRoutes)
  && setupRoutes.includes("status: stalled ? 'error'"),
  'startedAt is read, and a stale run is reported as the state that offers Try again');

// ── Regenerate changes the site, and a partial build still counts ───────────
//
// The homepage assignment was `if (!existing)`, so only the FIRST run ever claimed "/". Every
// later run wrote a page nobody would see: the wizard previewed the new draft, implying the
// site had changed, while "/" served the first attempt and another published page piled up
// behind it. A studio unhappy with their homepage could press Regenerate all day and never
// alter their website.
check('a forced regenerate during setup can change what "/" serves',
  pipeline.includes('opts.force && stillInSetup')
  && pipeline.includes('creative_setup_complete AS done'),
  'bounded to setup: after that, overwriting a live homepage is the studio\'s call');

// A run that stopped early still built pages, and they are live. v1.9.158 aborted the pillar
// loop by rethrowing, which threw the results array away with it — so a refusal on pillar four
// reported a failed build to a studio who had just had three pages created and published.
const scaffold = read('server/lib/authority-scaffold.ts');
check('a pillar build that stops early still reports what it built',
  scaffold.includes('aborted = {') && scaffold.includes('break;')
  && !/if \(e instanceof NoOpenAIError \|\| e\?\.name === 'PlatformAIRefusal'\) throw e;/.test(scaffold),
  'the pages exist; the answer must say so');

// A gateway refusal is not a server crash. These routes classified NoOpenAIError and let
// PlatformAIRefusal fall to the generic branch — 500, carrying the gateway's raw refusal text,
// so a spent allowance read to the studio as a crash worded for us rather than for them.
const routesSrc = read('server/routes.ts');
const refusalHandlers = (routesSrc.match(/const refusal = e\?\.name === 'PlatformAIRefusal';/g) || []).length;
check('a gateway refusal is classified, not returned as a crash',
  refusalHandlers >= 2 && routesSrc.includes("e.code === 'quota_exceeded' ? 429 : 503"),
  `${refusalHandlers} admin route(s) classify it`);

// ── The wizard never sends a studio somewhere they cannot go ────────────────
//
// The admin account is created at step FOUR, so for the first three steps there is no session.
// Any link into /admin bounces off authenticateUser and lands back on setup — which looks
// exactly like the page refreshing itself, and was reported as the page crashing.
//
// The photographs step offered "Connect file storage" pointing at
// /admin/settings/technical-setup, from step three, on an instance with no storage configured:
// the one screen where a studio is most likely to click it.
const setupDir = 'client/src/pages/setup';
const wizardFiles = [];
const walkSetup = (d) => {
  for (const n of fs.readdirSync(d)) {
    const p = `${d}/${n}`;
    if (fs.statSync(p).isDirectory()) walkSetup(p);
    else if (n.endsWith('.tsx')) wizardFiles.push(p);
  }
};
walkSetup(setupDir);
// ONE exemption, and it is conditional on the fact that earns it.
//
// SetupCompleteCard renders only after the whole wizard has finished, and the account step
// signs the owner in — it sets the same req.session.userId the login route does, precisely so
// they are not made to retype a password they chose two steps earlier. So by the time this card
// exists there IS a session, and its /admin link goes somewhere.
//
// The exemption is therefore granted only while that sign-in is still there. Remove it and this
// check fails on the card, which is the correct place for that breakage to surface: the link
// would start bouncing off authenticateUser and reading, again, as the page crashing.
const signsOwnerIn = /\(req\.session as any\)\.userId = user\.id;/.test(
  read('server/technical-setup-routes.ts'),
);
const EXEMPT = signsOwnerIn ? ['SetupCompleteCard.tsx'] : [];
const deadLinks = wizardFiles
  .filter((f) => !EXEMPT.some((e) => f.endsWith(e)))
  .filter((f) => /href="\/admin/.test(read(f)));
check('no setup screen links into the authenticated admin area',
  deadLinks.length === 0,
  deadLinks.length
    ? deadLinks.map((f) => f.split('/').pop()).join(', ')
    : `no session exists until step four${signsOwnerIn ? '; the completion card is after it' : ''}`);

// A run that stopped has to say so on the screen the studio is ACTUALLY looking at. The panels
// live in ScanningPhase, which is step five; generation runs during step three.
check('the photographs step says so when generation stopped',
  images.includes('readStopped &&') && images.includes('could not finish writing your homepage'),
  'otherwise the findings list ends mid-sentence and reads as a hang');

// ── The reset that wipes the instance must not need a dialog ────────────────
//
// DemoResetButton gated on window.confirm() and reported failure with alert(). Chrome offers
// "Prevent this page from creating additional dialogs" once a page has shown a few, and the
// choice persists for the rest of that page's life — after which confirm() returns FALSE
// WITHOUT ASKING. The handler took its early return and did nothing: no reset, no message, no
// busy state. Reported as "the reset button isn't clicking", which is precisely how it looks.
//
// alert() is silenced by the same switch, so the error path was mute for the same reason —
// the two mechanisms that were supposed to make this safe both fail closed and silently.
//
// The rule this asserts is narrow on purpose: the single most destructive control in the
// product — it truncates clients, invoices, galleries and admin_users — must not depend on a
// dialog the browser is free to withhold, and its failure must be visible in the DOM.
const reset = read('client/src/components/admin/DemoResetButton.tsx');
const resetCode = reset.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

check('the demo reset does not depend on a suppressible dialog',
  !/window\.confirm|(^|[^.\w])confirm\(|(^|[^.\w])alert\(/.test(resetCode),
  'a browser that withholds confirm() turns this into a button that does nothing');

check('and its confirmation is rendered, so it cannot be withheld',
  /confirming/.test(resetCode) && /setConfirming\(true\)/.test(resetCode),
  'two-stage in the component, not a native dialog');

check('a failed reset says why on the page',
  /setError\(/.test(resetCode) && /\{error &&/.test(resetCode),
  'including the 401 that a stale session produces on a dashboard left open');

// ── Business basics is five cards, not one wall ────────────────────────────
//
// It asked twenty-five questions on a single scroll — opening with a business name and
// reaching the logo well past the fold — and it is the SECOND thing a photographer sees.
// Same fields, same save; shown a few at a time, with the two that actually block a site
// first and the company-registration material last behind a card that says it is optional.
const basics = read('client/src/pages/setup/phases/BasicsPhase.tsx');

check('the step is broken into cards',
  /const CARDS = \[/.test(basics) && /\{card === 0 && \(/.test(basics) && /\{card === 4 && \(/.test(basics));

// THE failure mode worth a guard. A field left outside every {card === n} wrapper renders
// nowhere: the studio cannot fill it, cannot see it, and nothing complains — the save just
// carries an empty value forever. Splitting a form by inserting wrappers is exactly the edit
// that drops one.
// Counting fields that appear after a card OPENS is not the same as counting fields inside
// one, and the difference is the whole bug: the first version of this tracked the last-seen
// opener and never noticed a close, so a field orphaned after the final card still counted as
// inside it. It passed while a field rendered nowhere, which is precisely what it exists to
// catch. So match parens from each opener and take the union of the regions.
const cardRegions = (() => {
  const out = [];
  const re = /\{card === \d+ && \(/g;
  let m;
  while ((m = re.exec(basics))) {
    let depth = 0;
    for (let i = m.index + m[0].length - 1; i < basics.length; i++) {
      const ch = basics[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        if (--depth === 0) { out.push([m.index, i]); break; }
      }
    }
  }
  return out;
})();
const inACard = (idx) => cardRegions.some(([a, b]) => idx > a && idx < b);

let placed = 0;
let total = 0;
{
  const re = /htmlFor="[a-zA-Z]+"/g;
  let m;
  while ((m = re.exec(basics))) { total++; if (inACard(m.index)) placed++; }
}
check('every field sits inside one of them',
  total > 0 && placed === total,
  `${placed}/${total} fields inside a card — any outside would render nowhere at all`);

// Validating everything at the end put the error under a Continue button the studio had
// scrolled a long way past, describing fields they could no longer see.
check('required fields are checked on the card that asks them',
  /const validateCard = \(n: number\)/.test(basics) && /CARDS\[n\]\.requires/.test(basics));

// ── Reading their existing website ─────────────────────────────────────────
//
// Most of this form is facts already published on the studio's own homepage. Deterministic
// on purpose — schema.org, og: tags, tel: links — because this step runs several steps BEFORE
// the AI keys are entered and has to work with none configured.
const reader = read('server/lib/readSiteIdentity.ts');
const setupRoutesSrc = read('server/setup-routes.ts');

check('the wizard can read a studio\'s existing site',
  /\/api\/setup\/read-site/.test(basics) && /router\.get\('\/read-site'/.test(setupRoutesSrc));

check('and never overwrites something they have already typed',
  /if \(String\(next\[key\] \?\? ''\)\.trim\(\)\) return;/.test(basics),
  'a re-read must not undo a correction');

// This fetches a URL supplied by whoever is standing in front of an un-onboarded instance,
// on an unauthenticated mount. Without a guard it is a request forwarder inside the network
// boundary — ask it for 169.254.169.254 and it reads the cloud metadata service.
const safeUrl = read('server/lib/safePublicUrl.ts');
check('a URL it will fetch is vetted by ADDRESS, not by name',
  /dns/.test(safeUrl) && /isPrivateAddress/.test(safeUrl) && /lookup\(host/.test(safeUrl),
  'blocking the string "localhost" stops nobody — DNS is attacker-controlled');

check('and the private ranges are actually enumerated',
  /169 && b === 254/.test(safeUrl) && /a === 127/.test(safeUrl) && /a === 10/.test(safeUrl));

// A social link is matched on HOSTNAME. The first version tested /x\.com/ against the whole
// URL, and "x.com" is a substring of "500px.com" — so a wildlife photographer's 500px
// portfolio was offered to them as their Twitter account.
check('social links are matched by host, not by substring',
  /const hostIs = \(u: URL, domains: string\[\]\)/.test(reader)
  && !/pick\(\/\(\?:twitter\|x\)/.test(reader),
  'the same suffix mistake the crawled-image host check warns about');


console.log('\n=== finishing setup shows the studio what they made ===');
// Finishing POSTed the completion endpoints and navigate('/admin'). So a studio went from the
// last wizard step straight into a dashboard, having never once been shown the website they had
// just spent ten minutes making, with nothing on screen offering to open it.
const doneCard = read('client/src/pages/setup/SetupCompleteCard.tsx');
// Comment-stripped, for the fourth time this session in the same way: the wizard now carries
// a comment reading "Was navigate('/admin')" to explain why it no longer does, and that
// sentence failed the check for the behaviour it documents having been removed.
const wizCode = wiz.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

check('finishing does not dump the studio into the dashboard',
  /setFinished\(true\)/.test(wizCode) && !/navigate\('\/admin'\)/.test(wizCode),
  'it navigated away without ever offering the site');

check('and offers the site as well as the admin',
  /href="\/"/.test(doneCard) && /href="\/admin"/.test(doneCard));

// New tab on purpose: sending them to the site would lose the other door, and a studio who
// wants both should not have to navigate back to find it.
check('the site opens in a new tab, so the other door survives',
  /target="_blank"/.test(doneCard) && /rel="noopener noreferrer"/.test(doneCard));

// THE HONEST PART. The essentials path never asks for SMTP, Stripe or storage, so a studio can
// reach this card unable to send an email, take a payment or store a photograph. Saying
// "you're all set" and nothing else would be the most misleading screen in the product.
check('and names what still will not work',
  /technical\/status/.test(doneCard) && /still to connect/.test(doneCard),
  'read through the capability layer, which since v1.9.204 measures rather than asserts');

// A suggested tagline must be a description, not a bag of search terms.
//
// Meta descriptions are written for search engines at least as often as for people, and on a
// photographer's site that version is usually one phrase repeated with the town in front. Real,
// from a real studio, offered to them as their tagline:
//
//   "Hoi An photographer - Hoi An photography - Hoi An local photographer - Hoi An
//    Professional photographer - Hoi An wedding photographer - Hoi An Studio - ..."
//
// A suggestion that has to be undone is worse than none: the field is optional and says so, so
// offering nothing costs nothing, and offering that costs an edit plus the impression that the
// product cannot tell what it is looking at.
check('a keyword line is not offered as a tagline',
  /function looksLikeKeywords/.test(reader) && /looksLikeKeywords\(v\)\) continue;/.test(reader),
  'meta descriptions are as often written for crawlers as for people');

// Commas must NOT count as list separators. "prints, workshops, courses and lessons from …" is
// a good tagline and reads as one; rejecting it would throw away the useful case to catch the
// useless one. Verified against a real site whose tagline is exactly that shape.
check('and a comma-separated sentence still is',
  !/split\(\/[^/]*,[^/]*\/\)/.test(reader.match(/function looksLikeKeywords[\s\S]*?\n}/)?.[0] || ''),
  'dashes, pipes and bullets only');

// Only words of four letters or more are counted for repetition, so "the" and "and" appearing
// three times in an ordinary sentence do not trip it — which is exactly what the BBC's
// description does.
check('and repetition is counted on content words only',
  /\{4,\}/.test(reader.match(/function looksLikeKeywords[\s\S]*?\n}/)?.[0] || ''),
  'a three-letter stopword repeating is not stuffing');

// Each source judged on its own: a site can have a stuffed meta description and a perfectly
// good og:description, or the reverse. Taking the first present one would inherit the worse.
check('and each candidate source is judged separately',
  /const candidates = \[/.test(reader) && /for \(const raw of candidates\)/.test(reader));

// ── A spent allowance is not a failure to read ─────────────────────────────
//
// Both were one state, so the copy for an exhausted allowance blamed the crawl:
//
//     "You shoot Giới Thiệu, Wedding, Lưu Trữ Ảnh Cưới and 2 more"          ← the panel
//     "We couldn't read your services from your website this time"          ← four lines below
//
// Seen on the live demo. The crawl had worked perfectly — ten pages read, six services named,
// forty photographs found — and the WRITING was refused because the instance had used its ten
// included generations. A studio reading both at once learns the product does not know what it
// just did, and is pointed at the wrong remedy: a read failure means check the address, a spent
// allowance means retrying cannot help however many times they try.
check('an exhausted allowance is told apart from a failed read',
  // Defined once and branched on in BOTH places the old single state spoke: the homepage line
  // and the services block. One without the other leaves half the screen still blaming the
  // crawl, which is the half a studio reads first.
  /const quotaSpent = gen\?\.status === 'quota_exceeded';/.test(images)
  && (images.match(/quotaSpent$\s*\?/gm) || images.match(/\{quotaSpent/g) || []).length >= 2,
  'the two have different remedies, so they cannot share a sentence');

// And it must not claim the reading failed when the findings say it succeeded.
check('and does not blame the crawl for it',
  /We found your services, but the site writing included/.test(images),
  'the services were found — the pages behind them were not built');
console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED — a new studio still cannot get to their site quickly\n`
  : '\n  ALL CHECKS PASSED — three steps to a site, nothing deleted, every deferred key gated\n');
process.exit(bad ? 1 : 0);
