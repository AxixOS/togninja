// Does this product think every studio is in Vienna?
//
// The origin studio's location was not merely a string in a caption. It was a set of
// working defaults that fed real calculations:
//
//   PhotographyCalendarPageSimple initialised studioLocation to 48.2082 / 16.3738 /
//   "Vienna" / "Austria" / Europe/Vienna. Those coordinates feed calculateGoldenHour(),
//   and the panel captions itself "Today in {city}". So a Louisiana photographer planning
//   an outdoor shoot was shown VIENNA'S golden hour, labelled Vienna, at a latitude 16
//   degrees north of their own. And the fetch bails with `if (!resp.ok) return;`, so a
//   failure LEFT those values on screen rather than clearing them.
//
//   calculateGoldenHour took the same coordinates as DEFAULT PARAMETERS — the quietest
//   form of the bug, since a call that forgets to pass them gets Austria with nothing
//   anywhere to indicate a fallback occurred.
//
//   The location scout suggested "Schönbrunn Palace", "Danube riverbank" and "Prater" —
//   the origin studio's own landmarks — to every photographer who bought this product.
//
//   The "Add to Google Calendar" link sent ctz: 'Europe/Vienna', so every event a client
//   added to their own calendar was created in Austrian time.
//
//   And underneath all of it, studio_configs.timezone reached nothing: it sat in
//   config-reader's DB map with no entry in the env map, while DEFAULT_CAL_TZ — the name
//   the calendar code actually reads — sat in the env map with no DB source. The two
//   halves never met, so every consumer fell through to `|| 'Europe/Vienna'`.
//
// Run: node scripts/ui-verify-studio-locale.mjs
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

// Comments here necessarily quote what they replaced.
const code = (s) => s.split('\n').filter((l) => {
  const t = l.trim();
  return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*');
}).join('\n');

const cal = fs.readFileSync('client/src/pages/admin/PhotographyCalendarPageSimple.tsx', 'utf8');
const calCode = code(cal);
const cfg = fs.readFileSync('server/config-reader.ts', 'utf8');
const wizard = fs.readFileSync('client/src/pages/setup/phases/BasicsPhase.tsx', 'utf8');
const gcal = fs.readFileSync('client/src/services/googleCalendarService.ts', 'utf8');

console.log('\n=== the studio timezone reaches the code that reads it ===');
// The single missing link. DEFAULT_CAL_TZ is what four call sites in routes.ts read.
check('studio_configs.timezone maps to DEFAULT_CAL_TZ', /timezone: 'DEFAULT_CAL_TZ'/.test(cfg));
check('default_cal_tz has a DB source', /default_cal_tz: \{ table: 'studio_configs', column: 'timezone' \}/.test(cfg));

console.log('\n=== no Viennese coordinates survive as a default ===');
check('the calendar page does not initialise to Vienna\'s latitude', !/48\.2082/.test(calCode), '48.2082');
check('nor its longitude', !/16\.3738/.test(calCode), '16.3738');
check('nor names Vienna as the city', !/city: 'Vienna'/.test(calCode));
check('nor Austria as the country', !/country: 'Austria'/.test(calCode));
check('an unknown position is null, not a stand-in', /latitude: null/.test(calCode) && /longitude: null/.test(calCode));
check('the timezone falls back to the browser, not to Austria',
  /Intl\.DateTimeFormat\(\)\.resolvedOptions\(\)\.timeZone/.test(calCode));

console.log('\n=== golden hour refuses to answer without a place ===');
// tsconfig has strictNullChecks:false, so typing the params `number` enforces NOTHING —
// null passes through, arithmetic coerces it to 0, and the caller gets 0N 0E, a point in
// the Gulf of Guinea. Which is not an improvement on Vienna.
check('the default parameters are gone', !/latitude: number = 48\.2082/.test(cal));
check('the function guards its own inputs',
  /if \(!Number\.isFinite\(latitude as number\) \|\| !Number\.isFinite\(longitude as number\)\)/.test(cal));
// The guard must be INSIDE the function, so both call sites inherit it — one of them was
// guarded and the other was not, which is exactly how this class of bug persists.
const fnAt = cal.indexOf('const calculateGoldenHour');
const guardAt = cal.indexOf('!Number.isFinite(latitude as number)');
check('the guard is inside the function, not only at a call site',
  fnAt >= 0 && guardAt > fnAt && guardAt - fnAt < 400);
const calls = (calCode.match(/calculateGoldenHour\(/g) || []).length;
check('every call site was found', calls >= 3, `${calls} call(s) incl. the definition`);
check('the session panel explains a missing address', /Add your studio address in Settings/.test(cal));

console.log('\n=== weather is the studio\'s own, or absent ===');
check('no weather fetch with substituted coordinates',
  !/fetchWeatherData\(data\.latitude \|\| 48/.test(calCode));
check('it only fetches with real numbers', /if \(Number\.isFinite\(lat\) && Number\.isFinite\(lon\)\) fetchWeatherData/.test(calCode));

console.log('\n=== location scouting does not recommend another city ===');
for (const landmark of ['Schönbrunn', 'Prater', 'Danube riverbank', 'Coffee shops Vienna', 'Vienna parks']) {
  check(`"${landmark}" is no longer suggested`, !calCode.includes(landmark));
}
check('suggestions are built from the studio\'s own city', /studioLocation\.city/.test(calCode));

console.log('\n=== the Add to Calendar link uses the right timezone ===');
check('ctz is no longer hardcoded to Vienna', !/ctz: 'Europe\/Vienna'/.test(code(gcal)));
check('it resolves the real zone', /resolvedOptions\(\)\.timeZone/.test(gcal));

console.log('\n=== the setup wizard does not preselect Vienna ===');
check('a detected timezone exists', /const detectedTimezone/.test(wizard));
check('the form defaults to it', /initialData\?\.timezone \|\| detectedTimezone/.test(wizard));
// A studio in a zone outside the shipped list would otherwise detect correctly and then
// find no matching <option>, so the select would display the first entry instead.
check('a detected zone outside the list is added to it', /\(detected\)/.test(wizard));
check('US zones are offered', /America\/Chicago/.test(wizard) && /America\/New_York/.test(wizard));

console.log('\n=== the repair for schedulers already written ===');
const repair = 'scripts/gal-repair-scheduler-timezone.mjs';
check('a repair script exists', fs.existsSync(repair));
if (fs.existsSync(repair)) {
  const r = fs.readFileSync(repair, 'utf8');
  check('it is report-only by default', /const APPLY = process\.argv\.includes\('--apply'\)/.test(r));
  // Rewriting every scheduler to a guess would be worse than leaving them wrong.
  check('it refuses to run without a studio timezone', /nothing to align against/.test(r));
  check('it states the offset in hours, not just "mismatch"', /slots land/.test(r));
  check('it drops the Vienna column default too', /DROP DEFAULT/.test(r));
}

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED\n`
  : '\n  ALL CHECKS PASSED — the product asks where the studio is instead of assuming\n');
process.exit(bad ? 1 : 0);
