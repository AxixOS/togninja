// Is a studio actually told their CRM cannot yet invoice anyone?
//
// A studio finishes onboarding with a live website and lands on a dashboard of four zeros.
// The only thing saying the product was unfinished was a one-line amber strip at the top of
// the frame — cookie-notice weight, with a dismiss cross — and its link went to /setup, the
// wizard they had just completed. Read strip, click, arrive at a finished wizard, click
// again, and only then reach a screen where a key can be typed.
//
// The registry knew all of it: label, blockedMessage and settingsPath per capability, already
// written and already what the rest of the product refuses against.
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const codeOnly = (src) =>
  src.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
const read = (p) => fs.readFileSync(p, 'utf8');

const cardRaw = read('client/src/components/admin/SetupNeededCard.tsx');
const card = codeOnly(cardRaw);
const strip = codeOnly(read('client/src/components/admin/SetupProgressBanner.tsx'));
const dash = codeOnly(read('client/src/pages/admin/AdminDashboardPage.tsx'));
const caps = codeOnly(read('server/lib/capabilities.ts'));

console.log('\n=== the prompt exists, where the studio lands ===');

check('the dashboard renders it', /<SetupNeededCard \/>/.test(dash));
// FIRST in the dashboard's column — above the four headline zeros, which are the CONSEQUENCE
// of the missing keys. A studio who reads them in the other order concludes the product does
// not work.
//
// Checked against the sibling it must precede, not against a character offset: the revenue
// tile's markup sits at line 309 in a component DEFINED above the page's own render and
// INVOKED below it, so comparing file positions compared the wrong two things and failed on
// correct code. Render order is what matters, and the banner stack is where it is decided.
const renderBlock = (() => {
  const at = dash.indexOf('<AdminLayout>');
  return at < 0 ? '' : dash.slice(at, at + 1200);
})();
check('the dashboard render block was found', renderBlock.length > 0);
const cardAt = renderBlock.indexOf('<SetupNeededCard />');
const nextBannerAt = renderBlock.indexOf('<GCalStatusBanner />');
check('it comes first, above everything else on the page',
  cardAt >= 0 && nextBannerAt > cardAt,
  cardAt < 0 ? 'not in the render block' : `card@${cardAt} nextBanner@${nextBannerAt}`);

console.log('\n=== it says what is wrong and where to fix it ===');

// Straight to the screen that takes the key. Sending everyone to /setup was the detour.
check('each item links to its own settings screen', /to=\{c\.settingsPath\}/.test(card));
check('and not back through the finished wizard', !/to="\/setup"/.test(card));
// Registry words, not a second opinion that drifts from the first.
check('the reason comes from the capability registry', /\{c\.blockedMessage\}/.test(card));
check('the registry still carries those words',
  /blockedMessage:/.test(caps) && /settingsPath:/.test(caps));
// Half-configured is the state that looks finished and is not.
check('part-filled credentials are called out', /part-filled/.test(cardRaw));

console.log('\n=== it asks only for what the studio can give ===');

// capabilities.ts Rule 3: a platform-owned key is not theirs to add, and listing it asks for
// something they cannot give.
check('platform-owned keys are never listed', /c\.owner === 'studio'/.test(card));

console.log('\n=== it is ordered by what a business actually needs ===');

// The registry's order is roughly how the integrations were built. Reaching clients and being
// paid come before writing help.
check('an explicit priority is applied', /const FIRST/.test(card));
const first = (cardRaw.match(/const FIRST: string\[\] = \[([\s\S]*?)\n\];/) || ['', ''])[1];
// The key that unlocks WORK comes before the ones that unlock plumbing, and prices come
// before payments — a studio cannot take money for packages that have no price on them.
const order = ['ai_features', 'set_prices', 'sending_email', 'online_payments', 'import_clients'];
for (let i = 1; i < order.length; i++) {
  check(`  "${order[i - 1]}" is asked for before "${order[i]}"`,
    first.indexOf(order[i - 1]) >= 0
    && first.indexOf(order[i]) > first.indexOf(order[i - 1]));
}

console.log('\n=== it lists work, not only credentials ===');

// The card asked the capability registry alone, which answers "what needs a key". Two of the
// biggest things stopping a studio need no key at all, so neither could ever appear here
// however prominent the card became.
const tasksLib = codeOnly(read('server/lib/firstTasks.ts'));
check('the first tasks are computed', /export async function firstTasks/.test(tasksLib));
// Seeded starter packages exist with price 0 and is_active false, so counting rows would
// report "done" the moment onboarding created them.
check('prices count as set only when something is actually priced',
  /price IS NOT NULL AND price > 0/.test(tasksLib));
check('clients count as imported when any exist', /FROM crm_clients/.test(tasksLib));
check('the endpoint serves them', /tasks,/.test(codeOnly(read('server/routes/capabilities.ts'))));
check('the hook carries them', /setTasks/.test(codeOnly(read('client/src/hooks/useCapabilities.ts'))));
check('and the card renders them beside the credentials', /\.\.\.tasks\s*$/m.test(card) || /\.\.\.tasks/.test(card));
// "Connect" over "Setting your prices" is nonsense.
check('a task is not described as a connection', /TASK_KEYS\.has\(c\.key\) \? 'Set up' : 'Connect'/.test(card));
// Kept out of CAPABILITIES on purpose: that registry means "gated on a credential", and
// every refusal in the product reads it.
check('tasks are not smuggled into the capability registry',
  !/set_prices|import_clients/.test(caps));

console.log('\n=== the things that were simply missing ===');

// Neither existed in the registry, so neither could ever be asked for — while onboarding goes
// to real trouble to capture the Google place id from the studio's own map link.
check('Google reviews is a known capability', /key: 'google_reviews'/.test(caps));
check('and can be resolved', /google_places_api_key/.test(caps));
check('ShootCleaner is a known capability', /key: 'shootcleaner'/.test(caps));
// The column shipped with the feature; the key was never registered, so nothing could read it.
check('and its key is registered where config can read it',
  /shootcleaner_api_key: \{ table: 'studio_configs'/.test(codeOnly(read('server/config-reader.ts'))));

console.log('\n=== it does not nag twice, and does not vanish ===');

// Two amber notices about one subject, stacked, makes both easier to stop reading.
// The early return, not the const. `onDashboard` appears twice, so renaming only the
// declaration left the check green over a strip that no longer stood down — caught by biting.
check('the thin strip stands down on the dashboard',
  /if \(loading \|\| hidden \|\| onDashboard\) return null;/.test(strip));
// Collapsible, not dismissible: it IS the outstanding work, so it should not be possible to
// make it go away while the work is outstanding.
check('the card collapses rather than disappearing', /setCollapsed/.test(card));
check('and has no dismiss-for-ever', !/DISMISS_KEY/.test(card));

console.log(bad ? `\n${bad} FAILING\n` : '\nall good\n');
process.exit(bad ? 1 : 0);
