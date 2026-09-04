// A studio's portfolio, published from ShootCleaner into the page TogNinja already has.
//
// ShootCleaner's handoff opens by asking whether a portfolio page exists here, "because it
// changes everything below §4". It does — /portfolio, portfolio_images, the masonry grid and
// a crawl seeder that fills it during onboarding — so these endpoints write into that page
// rather than inventing a second one. The checks below hold the parts where a reasonable
// implementation can still be the wrong one.
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const codeOnly = (src) =>
  src.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
const read = (p) => fs.readFileSync(p, 'utf8');

const sc = codeOnly(read('server/routes/shootcleaner.ts'));

/**
 * JUST THE PORTFOLIO ROUTES.
 *
 * The gallery commit route does the same things with the same helper names — it looks up an
 * externalRef, HEADs the object before writing a row, and reads `bucket`/`fileKey` from the
 * same variables. Checking the whole file therefore passed over a gutted portfolio handler
 * every time, because the gallery version still matched: four bites sailed through before
 * this slice existed.
 *
 * Anchored on code, not on the section comment — codeOnly strips comment lines, so the
 * divider is not in this string.
 */
const section = (() => {
  const a = sc.indexOf("const PORTFOLIO_CATEGORY = 'featured'");
  const b = sc.indexOf("router.post('/digital-files/presign'");
  if (a < 0) return '';
  return b > a ? sc.slice(a, b) : sc.slice(a);
})();
check('the portfolio section was located', section.length > 0,
  section.length ? `${section.length} chars` : 'anchors not found');

console.log('\n=== the key arrives under the name it is documented with ===');

// Every handoff states the transport as `x-togninja-api-key`, with `x-naf-api-key` accepted
// from older builds. Neither was read — only x-api-key and a Bearer token — so anything
// written from the specification 401'd on every endpoint in the integration, reported as
// "Invalid API key", which reads as a wrong credential rather than an unread header.
check('the documented header is read', /'x-togninja-api-key'/.test(sc));
check('and the older one still is', /'x-naf-api-key'/.test(sc));
// Not a swap. These two are what the shipped client sends today — their §6 says those calls
// work — so dropping them would break the integration in the act of documenting it.
check('without dropping what ships today',
  /'x-api-key'/.test(sc) && /authHeader\.startsWith\('Bearer '\)/.test(sc));

console.log('\n=== one portfolio per studio, enforced where it cannot be forgotten ===');

// Their §5.1: "the single most important property in this document". A studio who presses
// Publish twice must not end up with two portfolios and no way to delete one.
check('a second row is impossible',
  /only_row\s+boolean PRIMARY KEY DEFAULT true CHECK \(only_row\)/.test(sc));
check('and a re-publish updates the row rather than adding one',
  /ON CONFLICT \(only_row\) DO UPDATE/.test(sc));
// The id must survive an update, or the address ShootCleaner stored stops resolving.
// SCOPED to the upsert's own SET clause. `SET ... id = ` within a window also matched the
// `WHERE id = $1` of the unrelated image UPDATE, so the first version of this failed over a
// statement it was not about.
const upsertSet = (() => {
  const at = sc.indexOf('ON CONFLICT (only_row) DO UPDATE');
  if (at < 0) return '';
  const end = sc.indexOf('RETURNING', at);
  return end < 0 ? sc.slice(at) : sc.slice(at, end);
})();
check('the id is not reassigned on update',
  upsertSet.length > 0 && !/\bid\s*=/.test(upsertSet),
  upsertSet.length ? '' : 'upsert not found');

console.log('\n=== replace, without deleting what the studio did elsewhere ===');

// §5.2 is honoured — an image absent from a publish disappears — but portfolio_images also
// holds the onboarding crawl's photographs and anything added by hand in admin. A literal
// replace would delete a studio's own work the first time they pressed Publish in another
// application.
check('the delete is scoped to rows this integration created',
  /const previous = await shootcleanerPortfolioImageIds\(\);/.test(section));
check('and that scope comes from the export ref table, not a guess',
  /entity_type = 'portfolio_image'/.test(sc) && /JOIN portfolio_images/.test(sc));
// The specific mistake being guarded: a bare delete over the whole table.
check('nothing deletes the portfolio wholesale',
  !/DELETE FROM portfolio_images\s*(;|`|')/.test(sc) && !/DELETE FROM portfolio_images WHERE category/.test(sc));

console.log('\n=== the same photograph twice is the same row ===');

// §5.3. Reuse the stored row rather than a second copy of identical bytes — and UPDATE it,
// which is also what makes their test 5 (re-order) work without re-uploading anything.
check('an externalRef already seen is reused', /await lookupExternalRef\(externalRef\)/.test(section));
check('and its order and alt text are refreshed',
  /UPDATE portfolio_images[\s\S]{0,120}SET sort_order = \$2/.test(sc));
// A row deleted in admin and published again must be re-created, not left pointing at nothing.
check('a stale mapping is repointed rather than orphaned',
  /ON CONFLICT \(external_ref\) DO UPDATE SET entity_type = 'portfolio_image'/.test(sc));

console.log('\n=== the order the studio chose is the order shown ===');

// §5.4. The public endpoint orders by `category, sort_order`, so sharing a category with the
// crawl's rows would interleave two independent 0-based orderings. 'featured' sorts before
// 'portfolio', which puts these at the top of the grid in the order sent, and is already one
// of the categories the admin portfolio editor offers.
check('these rows get their own category', /const PORTFOLIO_CATEGORY = 'featured'/.test(sc));
check('and it sorts ahead of the crawl\'s', 'featured' < 'portfolio');
// A missing sortOrder falls back to the array index rather than rejecting the publish: the
// order sent is never ambiguous, and losing an upload over it would be the worse outcome.
check('a missing sortOrder keeps the order sent',
  /Number\.isFinite\(Number\(img\.sortOrder\)\) \? Number\(img\.sortOrder\) : i/.test(sc));

console.log('\n=== the failures they asked to be able to act on (§8) ===');

// 422, not 500 and not a row pointing at nothing: a presigned URL lasts 15 minutes and a slow
// batch can outlive one. Their client re-presigns and retries once on exactly this code.
check('an expired or unknown fileKey is 422 invalid_file_key',
  /code: 'invalid_file_key'/.test(sc) && /status\(422\)/.test(sc));
check('and the object is confirmed present before a row is written',
  /HeadObjectCommand\(\{ Bucket: bucket, Key: fileKey \}\)/.test(section));
check('a concurrent publish is 409 portfolio_conflict',
  /code: 'portfolio_conflict'/.test(sc) && /pg_try_advisory_lock/.test(sc));
// A lock that outlives the request would wedge every later publish behind a 409.
check('and the lock is always released', /pg_advisory_unlock/.test(sc) && /\} finally \{/.test(sc));
// Said, not truncated.
check('over the cap is 413 with the cap named',
  /code: 'too_many_images'/.test(sc) && /at most \$\{MAX_PORTFOLIO_IMAGES\} images/.test(sc));

console.log('\n=== the app can ask before it publishes (§4.2, §7) ===');

check('there is a read-back route', /router\.get\('\/portfolio'/.test(sc));
// A normal answer, not a fault — the app shows "not published yet".
// Scoped to the GET handler: the DELETE route answers with the same code, so checking the
// file left this green over a GET that had been changed to report a server error.
const getRoute = (() => {
  const a = sc.indexOf("router.get('/portfolio'");
  const b = sc.indexOf("router.delete('/portfolio'");
  if (a < 0) return '';
  return b > a ? sc.slice(a, b) : sc.slice(a);
})();
check('never published is a 404, not an error',
  /status\(404\)[\s\S]{0,120}code: 'portfolio_not_found'/.test(getRoute));
check('the scopes are advertised so Publish can be hidden rather than fail',
  /'portfolio:write'/.test(sc) && /'portfolio:read'/.test(sc));
check('and both are in the list /health returns',
  /READ_SCOPES = \[[^\]]*'portfolio:read'/.test(sc) && /WRITE_SCOPES = \[[^\]]*'portfolio:write'/.test(sc));

console.log('\n=== the title they publish is a title somebody sees ===');

// POST /portfolio takes a REQUIRED title and an optional intro and stored both, and nothing
// rendered either — so a studio named their portfolio in one application and their public page
// went on saying "Our Portfolio" underneath. A field a product insists on and then never shows
// is worse than not asking for it.
const routes = codeOnly(read('server/routes.ts'));
const page = codeOnly(read('client/src/pages/PortfolioPage.tsx'));

check('there is a public endpoint for it', /app\.get\("\/api\/portfolio\/meta"/.test(routes));
const metaRoute = (() => {
  const a = routes.indexOf('app.get("/api/portfolio/meta"');
  if (a < 0) return '';
  const b = routes.indexOf('app.get("/api/portfolio/images/:id"', a);
  return b > a ? routes.slice(a, b) : routes.slice(a, a + 1200);
})();
check('it reads the published record', /SELECT title, intro FROM shootcleaner_portfolio/.test(metaRoute));
// The row also holds source_user_id, which identifies an account in another application and
// has no business on an endpoint that needs no key.
check('and never exposes who published it',
  metaRoute.length > 0 && !/source_user_id/.test(metaRoute));
// The table is created lazily by the integration. On an instance where ShootCleaner has never
// run it does not exist, and that is not a fault — the page keeps its own heading.
check('a missing table is an empty answer, not a 500',
  /catch \{[\s\S]{0,200}res\.json\(\{\}\);/.test(metaRoute));

check('the page renders a published title', /publishedTitle \? \(/.test(page));
check('and a published intro', /\{publishedIntro \|\| t\('portfolio\.momentsThatLastForever'\)\}/.test(page));
// The default third paragraph names family photos, baby photography and business portraits and
// links all three to /fotoshootings — the ORIGIN studio's services. Under a photographer's own
// standfirst it contradicts them and sends their visitors to somebody else's pages.
check('the origin studio\'s services are not shown over a studio\'s own words',
  /\{!publishedTitle && !publishedIntro && \(/.test(page));

console.log(bad ? `\n${bad} FAILING\n` : '\nall good\n');
process.exit(bad ? 1 : 0);
