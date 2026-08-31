// Does a reset actually leave a NEW studio a blank instance?
//
// Observed on 31 Aug 2026, on a demo that had just been reset: a new studio opening Business
// basics found the PREVIOUS tenant's answers already filled in — owner_name "Matthew Jones",
// owner_role "Founder and Lead Photographer", founding_year 1999, and a credentials array
// holding the ORIGIN studio's own marketing copy, "Fast 30 Jahre. Drei Länder. Über 27.000
// Familien." Also owner_email and email, both hello@axixos.com, ready to be published as the
// new studio's contact address.
//
// Twenty-one of studio_configs' sixty-six columns survived that reset.
//
// THE SHAPE OF THE BUG, which matters more than any of the names: reset-demo is an ALLOW-LIST
// OF THINGS TO CLEAR. Every column anyone adds later is retained BY DEFAULT, so the reset rots
// quietly as the schema grows. business_type proved it — added to the schema, the save and the
// round-trip on one day, and leaking on the next day's reset, because nobody thought of a list
// three hundred lines away.
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const read = (p) => fs.readFileSync(p, 'utf8');
// Comments in this file NAME the columns they are about — including one explaining that
// 'tagline' is not a column — so a parser that reads them finds every name twice and reports
// the prose as code. It caught itself doing exactly that.
const codeOnly = (src) =>
  src.split(/\r?\n/)
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');
const routes = read('server/setup-routes.ts');
const schema = read('shared/schema.ts');

// The reset handler alone — other parts of this file legitimately write these columns.
const reset = (() => {
  const at = routes.indexOf("router.post('/reset-demo'");
  if (at < 0) return '';
  const end = routes.indexOf('// ==================== DEMO DATA SEED', at);
  return routes.slice(at, end > 0 ? end : at + 12000);
})();

console.log('\n=== the previous studio does not come back ===');

check('the reset handler was found', reset.length > 0);

// Every field that was found leaking. Named individually because each is a separate promise
// to the next studio, and because a count would pass while the wrong dozen were cleared.
const MUST_CLEAR = [
  // Who the previous studio was.
  'owner_name', 'owner_role', 'owner_portrait_url', 'founding_year', 'credentials',
  'email', 'business_type', 'document_design',
  // Found by auditing the schema against the list rather than against the symptoms — the
  // difference between fixing what was reported and fixing what is wrong. state and zip are
  // the two thirds of an address that were missed while address, city and country were cleared.
  'domain', 'subdomain', 'state', 'zip', 'opening_hours', 'meta_title',
  'enabled_features', 'site_theme_tokens',
];
for (const col of MUST_CLEAR) {
  check(`  "${col}" is cleared`, new RegExp(`'${col}'`).test(reset));
}

// owner_email is NOT NULL, so SET owner_email = NULL throws — and every statement here is
// wrapped in its own swallowing catch, so it would have failed silently and gone on leaking.
// It is reset to the placeholder the insert path in POST /basics uses for a studio who has
// not given one.
check('owner_email is reset to a neutral value, not NULL',
  /SET owner_email = 'setup@togninja\.com'/.test(reset));
check('and is not in the NULL list, where it would throw and be swallowed',
  !/'owner_email'/.test(reset));

console.log('\n=== the next studio does not inherit Vienna\'s clock ===');

// THE DANGEROUS ONE. shared/schema.ts defaults timezone to 'UTC' deliberately. Cleared to
// NULL, config-reader stops hydrating DEFAULT_CAL_TZ and six call sites in
// services/calendarService.ts and services/googleCalendarSyncService.ts fall through to a
// hardcoded 'Europe/Vienna' — the ORIGIN studio's timezone. The reset, whose entire purpose is
// to leave no trace of the previous tenant, was handing the next one Vienna's clock and
// booking their clients' shoots against it.
check('timezone is reset to a value, not NULL', /\['timezone', 'UTC'\]/.test(reset));
check('and is not in the NULL list', !/'timezone'/.test(reset.slice(reset.indexOf('CLEAR_TO_NULL'), reset.indexOf('CLEAR_TO_DEFAULT'))));
// The others have product defaults too: a NULL template or colour renders as nothing rather
// than as the product's own default, and a NULL tax label prints on an invoice.
for (const col of ['date_format', 'primary_color', 'active_template', 'tax_label']) {
  check(`  "${col}" comes back as its default`, new RegExp(`\\['${col}', '`).test(reset));
}
// The fallbacks that make this matter. If these ever stop being hardcoded the check above is
// less critical — but while they exist, a NULL timezone is a de-branding leak.
const cal = read('server/services/calendarService.ts');
check('the Vienna fallback this protects against still exists',
  /Europe\/Vienna/.test(cal),
  'if this fails, check whether the fallback moved rather than deleting the guard above');

console.log('\n=== every name in the list is a real column ===');

// 'tagline' sat in this list and is NOT a column — the tagline lives in meta_description. So
// it threw on every reset since it was written, was swallowed, and cleared nothing. Harmless
// only by luck: meta_description happens to be cleared by a different statement. A misspelling
// in this list is invisible by construction, which is exactly how a leak hides.
// BOTH sources, because this project creates columns two ways: declared in shared/schema.ts,
// or added at boot with ALTER TABLE ... ADD COLUMN IF NOT EXISTS. site_theme_preset and
// site_layout exist only the second way, so a check that read the schema alone called two real
// columns imaginary — a false alarm that would have taught someone to delete the check.
const boot = read('server/index.ts');
const configCols = (() => {
  const cols = new Set();
  const at = schema.indexOf('export const studioConfigs = pgTable');
  if (at >= 0) {
    const block = schema.slice(at, schema.indexOf('});', at));
    for (const m of block.matchAll(/\b(?:text|integer|boolean|jsonb|decimal|timestamp|uuid|numeric|varchar)\("([a-z0-9_]+)"/g)) {
      cols.add(m[1]);
    }
  }
  for (const m of boot.matchAll(/ALTER TABLE studio_configs ADD COLUMN IF NOT EXISTS ([a-z0-9_]+)/g)) {
    cols.add(m[1]);
  }
  return cols;
})();
check('the schema columns were parsed', configCols.size > 20, `${configCols.size} columns`);

const listed = (() => {
  const at = reset.indexOf('const CLEAR_TO_NULL = [');
  if (at < 0) return [];
  const block = codeOnly(reset.slice(at, reset.indexOf('];', at)));
  return [...new Set([...block.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]))];
})();
check('the clear list was parsed', listed.length > 10, `${listed.length} names`);

const notColumns = listed.filter((c) => !configCols.has(c));
check('no name in the clear list is a column that does not exist',
  notColumns.length === 0,
  notColumns.length ? notColumns.join(', ') + ' — these clear nothing, silently' : 'all real');

console.log(bad ? `\n${bad} FAILING\n` : '\nall good\n');
process.exit(bad ? 1 : 0);
