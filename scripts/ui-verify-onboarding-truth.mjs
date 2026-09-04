// Five things a finished onboarding told a studio that were not true.
//
// All reported from one live run on 3 Sep 2026 (Van Lonsprech Photography, vanlonsperch.at):
//
//   1. The generated page's copyright read "© 2026 Studio Austria" — a business that does not
//      exist — directly above a footer reading "Van Lonsprech Photography".
//   2. Step 3 said "we could not build the pages behind your services this time". Four service
//      pages were built four and a half minutes later.
//   3. "6 things left to connect → Finish setup" led to a completed wizard and back to itself.
//   4. The CRM scan announced "We found some opportunities" over 0 / 0 / 0.
//   5. The reviews endpoint reported "add an API key" whether or not one was configured.
//
// Each is a claim the product had the information to get right.
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const codeOnly = (src) =>
  src.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
const read = (p) => fs.readFileSync(p, 'utf8');

const footer = codeOnly(read('client/src/features/landing-pages/components/public/PublicLandingPageSeoFooter.tsx'));
const images = codeOnly(read('client/src/pages/setup/phases/SiteImagesPhase.tsx'));
const banner = codeOnly(read('client/src/components/admin/SetupProgressBanner.tsx'));
const scan = codeOnly(read('client/src/pages/setup/phases/ScanningPhase.tsx'));
const reviews = codeOnly(read('server/services/googleReviews.ts'));

console.log('\n=== the copyright names the studio, and does not invent one ===');

// The name, from the same per-tenant identity the site footer and header already use.
check('the footer uses the injected studio identity', /\{SITE\.name\}/.test(footer));
check('and imports it', /import \{ SITE \} from/.test(footer));
// A name assembled from a location. "Studio Austria" is not a business; it is a place with a
// word in front of it, and it appeared on a real studio's public page.
check('it no longer builds a name out of the city', !/`Studio \$\{city\}`/.test(footer));
// The worse half of the old ternary: with no city it printed OUR product's name on a
// customer's site, in the one line on a page that asserts who owns it.
check('and never falls back to the product\'s own name',
  !/TogNinja Photography/.test(footer));
// The city was the SEO point of this footer and is worth keeping — as a location, not as the
// identity. Checked as a separate token so it cannot quietly become the name again.
check('the city survives as a location beside the name', /\$\{town\}/.test(footer));

console.log('\n=== the service pages are not called failed while they are being built ===');

// The top-level status turns terminal when the HOMEPAGE is written. The pillars run on after
// it as their own chain: homepage 'ready' 15:11:03, service pages 15:15:46, services.status
// 'ready', pillarsCreated 4. Everything on this screen stopped at the first of those times.
check('there is a settled test that includes the service chain', /const genSettled = /.test(images));
check('and it asks the chain directly', /run\?\.services\?\.status !== 'running'/.test(images));
// ALL FOUR call sites, not one. The status poll, the own-images poll, the slots poll and the
// terminal-transition refresh each carried the same stop condition, and any one left behind
// keeps the studio from seeing the service pages arrive. The arrow-function definition reads
// `genSettled = (`, so it is not counted here — these are uses.
const settledUses = (images.match(/genSettled\(/g) || []).length;
check('every poll and the final refresh stop on it', settledUses >= 4,
  `${settledUses} call sites (3 polls + the terminal refresh)`);
// GEN_TERMINAL itself is still right, and still used by genSettled and by readStopped /
// readFinished. What must not come back is a POLL or the refresh deciding on it alone:
// those took `run.status` and `gen.status` un-chained, which the derived booleans never do.
check('no poll decides on the homepage status alone',
  !/if \(!run \|\| GEN_TERMINAL\.includes\(run\.status\)\)/.test(images)
  && !/GEN_TERMINAL\.includes\(q\.state\.data\?\.status\)/.test(images));
check('and neither does the final refresh',
  !/if \(gen && GEN_TERMINAL\.includes\(gen\.status\)\)/.test(images)
  && /if \(genSettled\(gen\)\)/.test(images));
// The refresh must also RE-RUN when the service chain finishes; keying the effect on the
// homepage status alone would leave it observing a value that stopped changing minutes early.
check('the refresh re-runs when the service chain ends',
  /\[gen\?\.status, gen\?\.services\?\.status, qc\]/.test(images));
// The panel itself: the failure sentence must wait for the chain to actually stop.
check('the failure sentence waits for the chain to stop',
  /readFinished && !servicesRunning \?/.test(images));
check('and there is a state for "still building"', /const servicesRunning = /.test(images));

console.log('\n=== the banner links to something that can act on it ===');

// Everything the banner lists is a studio-owned integration configured in settings. It linked
// to /setup, the creative wizard, which contains none of them on its essential path — so
// following it returned to a completed wizard and then to this banner again.
check('the destination comes from the capability itself',
  /missing\.find\(\(c\) => c\.settingsPath\)\?\.settingsPath/.test(banner));
check('and the link uses it', /to=\{target\}/.test(banner));
check('it no longer sends a finished studio back into the wizard',
  !/to="\/setup"/.test(banner));
// Kept as the fallback for a capability that names no screen — which is where this began.
check('with the wizard still the last resort', /\|\| '\/setup'/.test(banner));

console.log('\n=== the scan does not claim findings it does not have ===');

// This reads the CRM, not the website. A studio with no clients yet — every studio on day one
// — has nothing for it to read, and 0/0/0 is the correct answer, not a failure.
check('nothing scanned is said plainly',
  /pagesScanned \|\| 0\) === 0 \? 'Nothing to check yet'/.test(scan));
check('and a clean scan is distinguished from an empty one',
  /issuesFound \|\| 0\) === 0/.test(scan));

console.log('\n=== the reviews endpoint says WHICH account is missing ===');

// getPlacesKey() returns nothing both when nothing is configured and when the platform's key
// has deliberately stopped answering because onboarding finished. One sentence for both meant
// a studio whose reviews vanished was told to "add a key" as though none had ever worked, and
// from outside there was no way to tell a missing platform key from a completed handover.
check('the handover has its own answer', /needs: 'own-key'/.test(reviews));
check('and is decided by the ungated provider', /unGated\.source === 'platform'/.test(reviews));
// The gated resolver still decides whether a call is MADE. This must not become a way to
// spend the platform's key after onboarding.
check('the gated key is still what gets spent',
  /const p = await placesKeyInUse\(\);/.test(reviews));
// Never a key, never part of one — only which account is absent.
check('and no key value is ever reported',
  !/apiKey: p\.apiKey/.test(reviews) && !/message:[^\n]*apiKey/.test(reviews));

console.log(bad ? `\n${bad} FAILING\n` : '\nall good\n');
process.exit(bad ? 1 : 0);
