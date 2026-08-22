// Every field the settings panel saves must be one the update route accepts.
//
// PUT /api/galleries/:id maps incoming keys through a hand-written fieldMapping table. A
// key that is not in that table is not an error — it is silently ignored, and the control
// that sent it appears to save and does not. That is the exact defect this whole tier has
// been unpicking: the create route losing snake_case keys to Drizzle, the client whitelists
// omitting expiresAt and the watermarks, the detail page reading thumb_url when the API
// sends thumbUrl. Every one of them a name that did not line up, and none of them an error.
//
// So the panel's payload is checked against the route's map, mechanically.
//
// Run: node scripts/gal-verify-settings.mjs
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const routes = fs.readFileSync('server/routes.ts', 'utf8');
const page = fs.readFileSync('client/src/pages/admin/GalleryDetailPage.tsx', 'utf8');

// Extract the fieldMapping object from the PUT route.
const mapStart = routes.indexOf('const fieldMapping: Record<string, string> = {');
if (mapStart < 0) { console.log('\n  FAIL: could not find fieldMapping in the update route\n'); process.exit(1); }
const mapEnd = routes.indexOf('};', mapStart);
const mapSrc = routes.slice(mapStart, mapEnd);
const accepted = new Set([...mapSrc.matchAll(/'([A-Za-z_]+)'\s*:/g)].map((m) => m[1]));

console.log(`\n  the update route accepts ${accepted.size} field name(s)\n`);

// The keys saveSettings() sends. Read from the source rather than restated here, so this
// cannot drift into agreeing with a payload that no longer exists.
const saveStart = page.indexOf('const body: Record<string, any> = {');
if (saveStart < 0) { console.log('  FAIL: could not find the settings payload\n'); process.exit(1); }
const saveEnd = page.indexOf('};', saveStart);
const sent = [...page.slice(saveStart, saveEnd).matchAll(/^\s{8}([A-Za-z]+):/gm)].map((m) => m[1]);
// isPasswordProtected is added conditionally, after the literal.
if (page.includes('body.isPasswordProtected = false')) sent.push('isPasswordProtected');

console.log('=== every key the settings panel sends is accepted ===');
check('the payload was found and is not empty', sent.length > 0, sent.join(', '));
for (const key of sent) {
  check(`${key} is in the route's field map`, accepted.has(key));
}

console.log('\n=== the check discriminates (it would fail if it did not) ===');
// Without this, a broken extractor that returned an empty `accepted` set — or one that
// matched everything — would let the block above pass for the wrong reason.
check('a made-up field name is NOT accepted', !accepted.has('notARealGalleryField'));
check('the map contains the columns it should', ['title', 'status', 'password'].every((k) => accepted.has(k)));

console.log('\n=== the panel shows the gallery\'s real values, not defaults ===');
// The controls used to be initialised to hardcoded defaults and never read the gallery,
// so the toggles reported the opposite of the truth for any gallery that differed.
const HYDRATED = [
  ['setVisibleWatermarkEnabled', 'visibleWatermark'],
  ['setInvisibleWatermarkEnabled', 'invisibleWatermark'],
  ['setAllowZipDownload', 'downloadEnabled'],
  ['setRestrictAccess', 'isPasswordProtected'],
  ['setIncludeOnCatalog', 'isPublic'],
  ['setExpirationEnabled', 'expiresAt'],
];
for (const [setter, field] of HYDRATED) {
  const re = new RegExp(setter + '\\([^)]*' + field);
  check(`${setter} reads g.${field}`, re.test(page));
}

console.log('\n=== tabs with no backing are marked, not left looking live ===');
check('a PreviewTab wrapper exists', page.includes('const PreviewTab'));
check('its contents cannot be interacted with', page.includes('pointer-events-none opacity-50'));
const previewCount = (page.match(/<PreviewTab>/g) || []).length;
check('three tabs are wrapped', previewCount === 3, previewCount + ' found');

console.log(bad ? `\n  ${bad} CHECK(S) FAILED\n` : '\n  ALL CHECKS PASSED — what the panel saves, the route accepts\n');
process.exit(bad ? 1 : 0);
