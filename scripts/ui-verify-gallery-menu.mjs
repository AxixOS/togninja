// Do the gallery row-menu actions actually do anything?
//
// Four of the six did not, for two different reasons, and both reasons are invisible to a
// type checker and to a build.
//
//   View and Share both address a gallery by its SLUG. fetchGalleries() maps the API
//   response into an explicit object literal — id, title, description, clientName, … —
//   and `slug` was not one of the keys. There is no spread to fall back on, so every row
//   carried slug: undefined. galleryPublicUrl() correctly returned null (its docblock even
//   says "callers should disable the control instead"), the View handler did
//   `if (url) window.open(url)`, and the click did nothing at all. The Share dialog opened
//   with an empty link and no QR code. One missing key, two dead controls.
//
//   Set Expiration and Add to Catalog were `onClick={() => setOpenMenuId(null)}` — they
//   closed the menu and nothing else. Set Expiration had a complete server side the whole
//   time (PUT /api/galleries/:id maps expiresAt -> expires_at, and the public route already
//   410s past that date); only the UI was absent. Add to Catalog had nothing behind it at
//   all: /galleries is a 95-line page with one input where a client types their gallery
//   code, not a catalog. A control with no feature is worse than an absent one.
//
// Run: node scripts/ui-verify-gallery-menu.mjs
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const PAGE = 'client/src/pages/admin/AdminGalleriesPage.tsx';
const src = fs.readFileSync(PAGE, 'utf8');
const api = fs.readFileSync('client/src/lib/gallery-api.ts', 'utf8');
const dialog = fs.readFileSync('client/src/components/admin/GalleryShareDialog.tsx', 'utf8');
const routes = fs.readFileSync('server/routes.ts', 'utf8');

// A comment explaining the old bug necessarily quotes it.
const code = (s) => s.split('\n').filter((l) => {
  const t = l.trim();
  return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
}).join('\n');
const pageCode = code(src);

console.log('\n=== the row carries the one field View and Share both need ===');
// The whole defect in one assertion.
check('the transform copies slug off the API response', /slug: g\.slug/.test(pageCode));
check('the Gallery type declares it', /^\s*slug\?: string;/m.test(pageCode));
// This is the check that would have caught it: the literal must not silently omit a field
// the render depends on. Both consumers read gallery.slug, so it has to be produced.
const consumers = (pageCode.match(/gallery\.slug/g) || []).length;
check('something actually consumes it', consumers >= 3, `${consumers} use(s)`);

console.log('\n=== View opens the client-facing address, or says it cannot ===');
check('it builds the URL from the shared helper', /galleryPublicUrl\(gallery\.slug\)/.test(pageCode));
check('it opens a window', /window\.open\(url, "_blank"/.test(pageCode));
// A tab opened with window.open gets a handle back to this page unless noopener is set.
check('the opened tab cannot reach back into the admin', /window\.open\(url, "_blank", "noopener"\)/.test(pageCode));
// The helper's docblock asks for exactly this, and the caller used to ignore it.
check('the control is disabled when there is no address',
  /disabled=\{!gallery\.slug\}/.test(pageCode));
const disabledCount = (pageCode.match(/disabled=\{!gallery\.slug\}/g) || []).length;
check('both View and Share are guarded', disabledCount === 2, `${disabledCount} of 2`);
check('a disabled control explains itself', /no public address yet/.test(src));

console.log('\n=== Share has something to share ===');
check('the dialog is rendered when a gallery is picked', /\{sharing && \(/.test(pageCode));
check('it is handed the whole gallery', /<GalleryShareDialog gallery=\{sharing\}/.test(pageCode));
check('the dialog reads the slug it is now given', /galleryPublicUrl\(gallery\.slug/.test(dialog));

console.log('\n=== Set Expiration saves ===');
check('the menu item opens a dialog', /setExpiring\(gallery\)/.test(pageCode));
check('the dialog exists', /const ExpiryDialog/.test(src));
check('it is rendered', /<ExpiryDialog/.test(pageCode));
// The stub. If this comes back, the feature is gone again.
const stubs = (pageCode.match(/onClick=\{\(\) => setOpenMenuId\(null\)\}/g) || []).length;
check('no menu item is still a close-the-menu stub', stubs === 0, `${stubs} stub(s)`);
check('saving goes through the API layer', /setGalleryExpiry\(gallery\.id, iso\)/.test(pageCode));
check('a single-purpose helper exists', /export async function setGalleryExpiry/.test(api));
// updateGallery takes a whole GalleryFormData; a partial object passed to it could blank
// a title or a password on what the studio thought was a date change.
check('it does not reuse the whole-form updater', !/updateGallery\(/.test(code(
  src.slice(src.indexOf('const ExpiryDialog')))));
check('it sends only the expiry key', /body: JSON\.stringify\(\{ expiresAt \}\)/.test(api));
check('the list refreshes after saving', /onSaved=\{\(\) => \{ setExpiring\(null\); fetchGalleries\(\)/.test(pageCode));
check('a failure surfaces the server\'s reason', /body\?\.message \|\| body\?\.error/.test(api));

console.log('\n=== and the server end of it is real ===');
check('the update route maps expiresAt', /'expiresAt': 'expires_at'/.test(routes));
check('clearing it stores NULL', /values\.push\(value \? new Date\(value as any\) : null\)/.test(routes));
check('an expired gallery is refused', /gallery_expired/.test(routes));

console.log('\n=== the date is the studio\'s date ===');
// toISOString() on a local Date shifts the day for anyone west of UTC — every US studio.
check('the date input is built in local time, not from toISOString',
  /const localDate = \(d: Date\)/.test(src) && !/toISOString\(\)\.split\('T'\)\[0\]/.test(src));
// "Expires on the 14th" has to mean the client can still open it during the 14th.
check('expiry falls at the end of the chosen day', /T23:59:59/.test(src));
check('a past date cannot be chosen', /min=\{localDate\(new Date\(\)\)\}/.test(src));
check('an expiry can be removed again', /save\(null\)/.test(src));

console.log('\n=== no control promises a feature that does not exist ===');
// /galleries is a code-entry form, not a catalog. Leaving "Add to Catalog" in the menu
// meant a studio clicking it got silence and no way to know why.
check('Add to Catalog is gone', !/Add to Catalog/.test(src));
const pub = fs.readFileSync('client/src/pages/PublicGalleriesPage.tsx', 'utf8');
check('confirming /galleries really is a code-entry page, not a catalog',
  /Gallery code or link|Galerie-Code/.test(pub) && !/galleries\.map\(/.test(pub));

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED\n`
  : '\n  ALL CHECKS PASSED — every item in the menu does the thing it names\n');
process.exit(bad ? 1 : 0);
