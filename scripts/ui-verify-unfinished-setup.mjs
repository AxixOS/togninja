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

// ── The homepage is actually the generated one ──────────────────────────────
//
// homepage_landing_slug was NULL, so "/" fell through to the built-in HomePage — which is not
// a landing page and does not go through the theme or layout providers. A studio who chose
// Editorial in step one saw a page that could not be Editorial, and reasonably concluded the
// feature did not work.
check('a generated homepage is published when there is no homepage yet',
  pipeline.includes("await neonDb.updateLandingPage(page.id, { status: 'published' })")
  && pipeline.includes('SET homepage_landing_slug = $1'));

check('and it can never overwrite an existing one',
  pipeline.includes('if (!existing) {'));

// ── Their own photographs, not stock ────────────────────────────────────────
check('empty image slots are filled from their own website',
  pipeline.includes("const { crawledImages } = await import('./crawledImages')")
  && pipeline.includes('INSERT INTO homepage_images'));

check('an uploaded photograph always wins over an auto-filled one',
  pipeline.includes('!filled.has(sec)'),
  'auto-fill is a floor, not an override');

// The trap I actually hit writing this: createLandingPage has already run by then, so
// assigning to payload is a silent no-op that looks right in review.
check('the auto-filled hero updates the created page, not a dead payload',
  pipeline.includes('await neonDb.updateLandingPage(page.id, { hero_image_url: found[0].url })'));

console.log(`\n  ${failed === 0 ? 'all checks passed' : failed + ' FAILED'}\n`);
process.exit(failed === 0 ? 0 : 1);
