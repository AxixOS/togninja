// Whose Google Places account pays to show a studio their reviews?
//
// The reviews a studio has already earned are the most persuasive thing on their site, and
// showing them on the FIRST PREVIEW — before any credential is handed over — is the moment
// the product proves itself. So the platform's key pays for that.
//
// It must NOT pay for their live site. That is ongoing use on their traffic, and a platform
// key funding every tenant's public pages is a bill that grows with somebody else's visitors
// — the exact shape the key-split rule exists to prevent.
//
// The old getPlacesKey() read the studio's column and fell back to a bare
// GOOGLE_PLACES_API_KEY with no source attached, so a studio running entirely on the
// platform's key was indistinguishable from one who had set up their own, and it spent that
// key on the public site as readily as on the preview.
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const codeOnly = (src) =>
  src.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
const read = (p) => fs.readFileSync(p, 'utf8');

const provider = codeOnly(read('server/lib/placesProvider.ts'));
const reviews = codeOnly(read('server/services/googleReviews.ts'));
const caps = read('server/lib/capabilities.ts');
// RAW, not codeOnly. The rule this file follows is stated in a comment in searchProvider.ts,
// and stripping comments to look for it finds nothing — the check failed on its own premise.
const search = read('server/lib/searchProvider.ts');

console.log('\n=== the studio\'s own key always wins ===');

check('there is a resolver at all', /export async function placesProvider/.test(provider));
// Order matters: a fallback running the other way round would ignore a key they paid for.
const ownAt = provider.indexOf('const own = await studioPlacesKey()');
const platformAt = provider.indexOf('GOOGLE_PLACES_PLATFORM_API_KEY');
check('it checks the studio before the platform',
  ownAt > 0 && platformAt > 0 && ownAt < platformAt,
  ownAt < 0 || platformAt < 0 ? 'one of the two is gone' : `studio@${ownAt} platform@${platformAt}`);
check('and records which one answered', /source: PlacesKeySource/.test(provider));

console.log('\n=== the platform key is read from env, and only from env ===');

// searchProvider.ts states the rule: read through config.get and a platform key becomes
// indistinguishable from a tenant's, because config.get resolves the studio's column first.
check('the rule is still written down where it came from',
  /never through config\.get/.test(search));
check('the platform key comes from the environment',
  /process\.env\.GOOGLE_PLACES_PLATFORM_API_KEY/.test(provider));
check('and is never resolved through config.get',
  !/config\.get\('google_places_api_key'\)[\s\S]{0,80}PLATFORM/.test(provider));
// Named for the convention the other platform credentials follow, so nobody has to guess
// whose account a bare GOOGLE_PLACES_API_KEY belongs to.
check('it follows the platform naming convention',
  /GOOGLE_PLACES_PLATFORM_API_KEY/.test(provider),
  'as TAVILY_PLATFORM_API_KEY and PRODIGI_PLATFORM_API_KEY do');

console.log('\n=== the platform pays for the preview, not for their traffic ===');

check('there is a rule about when the platform key may be spent',
  /export async function placesKeyInUse/.test(provider));
// creative_setup_complete is server-side. A caller-supplied "this is the preview" would be a
// flag any visitor could set, and the only thing it controls is whose card is charged.
check('it keys on setup being unfinished, not on anything the caller sends',
  /creative_setup_complete AS done/.test(provider));
check('and stops once onboarding is finished',
  /if \(onboardingFinished\) return \{ apiKey: null, source: null \};/.test(provider));
// A missing rating is small; a bill that grows because one query failed is not.
check('an unreadable setup state does not spend the platform key',
  /catch \{[\s\S]{0,320}return \{ apiKey: null, source: null \};/.test(provider));
check('the reviews service resolves through it', /placesKeyInUse/.test(reviews));
check('and no longer reads a bare env key itself',
  !/process\.env\.GOOGLE_PLACES_API_KEY/.test(reviews));

console.log('\n=== the studio is told why they are still asked ===');

// They will SEE their reviews on the preview and then be asked for a key. Without a sentence
// explaining the handover that reads as being charged for something already working.
check('the request explains the handover', /from here they run on yours/.test(caps));

console.log(bad ? `\n${bad} FAILING\n` : '\nall good\n');
process.exit(bad ? 1 : 0);
