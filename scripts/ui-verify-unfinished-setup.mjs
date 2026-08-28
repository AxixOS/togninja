// A studio arrives with nothing connected. Does the product say so?
//
// A fresh instance has no payments, no email, no calendar and no clients, and the entire CRM
// opens anyway. Nothing anywhere said "you are not finished" — so a studio walked into
// Invoices and met "No clients yet", into Inbox and got a browser alert() they had to dismiss,
// into Calendar and saw eight zeros, and had to work out for themselves that none of it was
// broken. Three refusals, three styles, none of them mentioning setup.
//
// The registry that knows all of this (server/lib/capabilities.ts, eight capabilities with
// owner, settings path, blocked message and what still works) had existed the whole time, and
// CapabilityGate — a component built to render exactly that — was imported by nothing.

import { readFileSync, existsSync } from 'fs';

const read = (p) => readFileSync(p, 'utf8');
const layout = read('client/src/components/admin/AdminLayout.tsx');
const banner = read('client/src/components/admin/SetupProgressBanner.tsx');
const inbox = read('client/src/pages/admin/AdminInboxPageV2.tsx');
const pipeline = read('server/lib/homepage-pipeline.ts');

let failed = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!ok) failed++;
};

console.log('\nUnfinished setup\n');

// ── Said once, up front ─────────────────────────────────────────────────────
check('the admin shell says what is still unconnected',
  layout.includes('<SetupProgressBanner />') && existsSync('client/src/components/admin/SetupProgressBanner.tsx'));

check('it reads the registry rather than a second list',
  banner.includes('useCapabilities'));

// A platform key is not the studio's to add. Listing it would be asking them for something
// they cannot give — the exact bug capabilities.ts Rule 3 exists to prevent.
check('it never asks the studio for a platform key',
  banner.includes("c.owner === 'studio'"));

check('it names what is missing rather than counting steps',
  banner.includes('missing.slice(0, 3).map'));

// It must not become a wall. A studio poking around an unfinished CRM is doing the right
// thing; the mistake was never telling them which parts wait on them.
check('it can be dismissed and does not block the page',
  banner.includes('sessionStorage.setItem(DISMISS_KEY'));

check('and it disappears once nothing is missing',
  banner.includes('if (missing.length === 0) return null;'));

// ── Not-configured is not an error ──────────────────────────────────────────
check('the inbox no longer opens a modal for an unconfigured account',
  inbox.includes('if (/not configured/i.test(reason))')
  && inbox.includes('setNeedsEmailAccount(true)'));

check('a real failure still interrupts',
  inbox.includes("alert(reason || 'Failed to refresh emails. Please try again.')"),
  'an IMAP password that stopped working IS a failure');

// ── A key is not the same as a working payment ──────────────────────────────
//
// available was a boolean derived from whether credentials existed, so a Stripe account
// that had finished Connect onboarding and was still being verified read as ready. Three of
// the five real account states refuse every charge while holding a perfectly valid key, so
// the product would have shown a checkout button that failed on the first customer.
const caps = read('server/lib/capabilities.ts');

check('capabilities carry a state, not just a verdict',
  caps.includes('export type CapabilityStatus'));

check('Stripe is asked whether it will actually charge',
  caps.includes('account.charges_enabled') && caps.includes('account.payouts_enabled'));

check('a studio waiting on Stripe is told so, and told to do nothing',
  caps.includes('by themselves when it finishes'));

check('and one Stripe is waiting on is told what to do',
  caps.includes('currently_due') && caps.includes('action_required'));

// The distinction that costs money if it is got wrong in either direction.
check('charges-enabled-without-payouts can still sell',
  caps.includes('chargesWorkAnyway'));

// The banner calls capabilityStates() on every admin page load.
check('the Stripe read is cached',
  caps.includes('STRIPE_TTL_MS'));

check('and a Stripe outage cannot padlock the CRM',
  caps.includes('Do not invent a verdict'));

// ── The homepage is actually the generated one ──────────────────────────────
//
// homepage_landing_slug was NULL, so "/" fell through to the built-in HomePage — which is not
// a landing page and does not go through the theme or layout providers. A studio who chose
// Editorial in step one saw a page that could not be Editorial, and reasonably concluded the
// feature did not work.
check('a generated homepage is published when there is no homepage yet',
  pipeline.includes("await neonDb.updateLandingPage(page.id, { status: 'published' })")
  && pipeline.includes('SET homepage_landing_slug = $1'));

// The property is that a LIVE studio's homepage cannot be replaced behind their back — not
// that this particular `if` is spelled a particular way.
//
// This asserted `pipeline.includes('if (!existing) {')`, a literal match on the implementation,
// and it went red on a deliberate change rather than on a regression. The change: `if
// (!existing)` alone made Regenerate a button that could not work. The first run claims "/", so
// every later run wrote a page nobody would ever see — the wizard previewed the new draft while
// "/" kept serving the first attempt. A studio unhappy with their homepage could press it all
// day and never alter their site.
//
// So a forced run MAY now claim "/", but only while creative_setup_complete is false — a page
// they are still choosing, not a homepage they have been running in public. Both halves are
// asserted, because either one alone is the old bug or a new one.
check('and it can never overwrite a homepage the studio is already running',
  pipeline.includes('opts.force && stillInSetup')
  && pipeline.includes('creative_setup_complete AS done'),
  'a regenerate during setup may replace it; after setup, never');

// ── Their own photographs, not stock ────────────────────────────────────────
// The auto-fill moved into lib/assignCrawledImages and now covers the SERVICE pages as well
// as the homepage — a studio was finishing onboarding with pictures on one page and flat
// colour on the rest. The INSERT this used to look for is deliberately gone: writing the row
// directly is what made the automatic path hotlink the studio's old site and skip alt text
// and IPTC entirely. It goes through storeSiteImage now, the same door the wizard uses.
const autoImages = read('server/lib/assignCrawledImages.ts');
check('empty image slots are filled from their own website',
  autoImages.includes("const { crawledImages } = await import('./crawledImages')")
  && pipeline.includes("assignCrawledSiteImages('site')")
  && pipeline.includes("assignCrawledSiteImages('pillars')"));

check('and an auto-filled image is stored, not linked',
  autoImages.includes('storeSiteImage(')
  && !pipeline.includes('INSERT INTO homepage_images'),
  'the pipeline used to INSERT the crawled URL raw — the demo hotlinked squarespace-cdn for it');

check('an uploaded photograph always wins over an auto-filled one',
  autoImages.includes('filledSections.has(w.section)'),
  'auto-fill is a floor, not an override');

// The trap I actually hit writing this: createLandingPage has already run by then, so
// assigning to payload is a silent no-op that looks right in review.
// Same trap, one layer down now: storeSiteImage is what reaches the draft, and it does it by
// looking the draft id up from homepage_gen_state rather than trusting a payload that
// createLandingPage has already consumed.
check('the auto-filled hero updates the created page, not a dead payload',
  read('server/lib/siteImageStore.ts').includes('UPDATE landing_pages SET hero_image_url = ${url} WHERE id = ${draftId}'));

console.log(`\n  ${failed === 0 ? 'all checks passed' : failed + ' FAILED'}\n`);
process.exit(failed === 0 ? 0 : 1);
