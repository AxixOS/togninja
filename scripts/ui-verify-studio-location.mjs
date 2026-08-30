// Does the wizard find out where a studio actually is, instead of asking them to type it?
//
// A photographer's address, phone and map pin go onto their invoices, their emails, their
// public site and their JSON-LD. Setup used to open a blank textarea for the address and put
// the Google Maps link UNDER it, using the link for two coordinates and throwing the rest of
// it away — while the same URL names the business and carries its permanent place id, and
// their own website usually publishes the address on its about page.
//
// This checks the three things that fixed: the link is read for everything it holds, it is
// confirmed by name rather than a bare tick, and the site read looks past the homepage.
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

// Comments describe what the code should do, in the same words a check looks for — so a
// guard that reads them passes on the prose alone and would keep passing after the code
// under it was deleted.
const codeOnly = (src) =>
  src.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
const read = (p) => fs.readFileSync(p, 'utf8');

const routes = codeOnly(read('server/routes.ts'));
const setupRoutes = codeOnly(read('server/setup-routes.ts'));
const identity = codeOnly(read('server/lib/readSiteIdentity.ts'));
const basicsRaw = read('client/src/pages/setup/phases/BasicsPhase.tsx');
const basics = codeOnly(basicsRaw);

console.log('\n=== the maps link is read for everything it carries ===');

// Coordinates were all it took. The business name and the place id were in the same string.
//
// Anchored on the RESPONSE, not on the identifiers. `/placeId/` anywhere in the file passed
// on the `const placeId = …` that computes it, so deleting the line that actually sends it
// left the check green — a bug this caught while being bitten.
const mapResponse = (routes.match(/res\.json\(\{[\s\S]{0,300}?\}\);/g) || [])
  .find((b) => /resolvedUrl/.test(b)) || '';
check('the resolver returns the place name', /placeName/.test(mapResponse));
check('the resolver returns the place id', /placeId/.test(mapResponse));
check('the name is read from the /maps/place/ segment',
  /maps\\\/place/.test(routes) || /maps\/place/.test(routes));
// Two forms, and the newer one is preferred. !16s is the stable knowledge-graph id; the
// !1s hex CID pair is the older form and still resolves, so it stays as the fallback.
check('both place-id forms are handled', /!16s/.test(routes) && /!1s/.test(routes));

console.log('\n=== the place id is kept, not just displayed ===');

// google_places_place_id is what live Google reviews need. Without this the studio is sent
// to Technical Setup to find, by hand, a value that was inside a link they already pasted.
check('the basics step accepts a place id', /googlePlacesPlaceId/.test(setupRoutes));
check('it is written to studio_integrations', /google_places_place_id/.test(setupRoutes));
// Reopening a completed step submits an empty string. `city` above it documents the same
// trap: an unconditional write turns "go back and check something" into a silent wipe.
check('an empty value never wipes a stored place id',
  /googlePlacesPlaceId === 'string' && googlePlacesPlaceId\.trim\(\)/.test(setupRoutes));
check('the client carries the id through the save', /googlePlacesPlaceId/.test(basics));

console.log('\n=== the studio can tell WHICH listing it found ===');

// "Location found" is not confirmable. A link to the cafe next door produces exactly the
// same tick, and the studio finds out when their map points at the cafe.
check('the result names the business it found', /mapPlace\.name/.test(basics));
check('and offers a way out when it is wrong',
  /Not your studio\?/.test(basicsRaw));

// The link is three taps and cannot be typed wrong; the address is prose that can. Asking
// for the address first made the link an afterthought used for two numbers.
const linkAt = basics.indexOf('htmlFor="mapLink"');
const addrAt = basics.indexOf('htmlFor="address"');
check('the link is asked for before the address',
  linkAt > 0 && addrAt > 0 && linkAt < addrAt,
  linkAt < 0 || addrAt < 0 ? 'one of the two fields is gone' : `link@${linkAt} address@${addrAt}`);

console.log('\n=== the site read looks past the homepage ===');

check('an address is extracted at all', /out\.address = addr/.test(identity));
// Marked-up beats prose. A page can say "Address:" about a venue it shot at; JSON-LD
// PostalAddress is the studio's own claim about itself.
check('marked-up address is preferred over prose',
  /postalAddress\(ld\) \|\| labelledAddress\(html\)/.test(identity));
// Only on an explicit label. Anything looser finds last week's wedding venue.
check('prose addresses need an explicit label', /ADDRESS_LABELS/.test(identity));
check('and a number in them', /!\/\\d\/\.test\(v\)/.test(identity));
// hoianfilm.com is the case this exists for: no address anywhere on the homepage, and
// "Address: 26 Dang Van Ngu, Hoi An" on /gioi-thieu-hoi-an-film-studio.
check('their about/contact pages are followed', /contactLinks\(html, url\)/.test(identity));
check('in more than English',
  /gioi-thieu/.test(identity) && /lien-he/.test(identity) && /kontakt/.test(identity));
// Following outward hands a studio whichever address their footer's directory partner lists.
check('the follow never leaves their own host',
  /u\.hostname !== base\.hostname/.test(identity));
check('and is bounded', /out\.length >= 3/.test(identity));
// A homepage answer is the better answer. The follow fills gaps; it does not correct.
check('followed pages fill gaps only', /if \(!out\[k\] && more\[k\]\)/.test(identity));
check('the address says which page it came off', /addressSourceUrl/.test(identity));
check('and the studio is told to check it', /from your own about page/.test(basicsRaw));

console.log('\n=== Google\'s own address, on the studio\'s own key ===');

const reviews = codeOnly(read('server/services/googleReviews.ts'));
const tech = codeOnly(read('server/technical-setup-routes.ts'));
const googleSettings = read('client/src/pages/admin/settings/GoogleSettingsPage.tsx');

// The documented Places Details endpoint, on the studio's own key — deliberately NOT the
// undocumented /maps/embed?pb= route, which returns the same address without a key but sits
// outside Google's documented APIs. That was a decision, not an oversight: if this ever
// stops using places.googleapis.com, someone should have to come here and change this line.
check('the canonical address comes from the documented API',
  /places\.googleapis\.com\/v1\/places/.test(reviews) && /getPlaceProfile/.test(reviews));
// getPlaceProfile's OWN field mask. Two narrowings, both found by biting this:
//   1. `/formattedAddress/` over the file passed with the field gone from the request,
//      because it still appears on the line that reads the response back.
//   2. Scoping to any field mask was no better — the Text Search call below already asks
//      for `places.formattedAddress`, so that one answered for this one.
// Places v1 returns only what the mask requests, so this has to be the mask that this
// function sends, and nothing else.
const profileMask = (reviews.match(/export async function getPlaceProfile[\s\S]{0,900}/) || [''])[0];
check('and asks for the address field',
  /X-Goog-FieldMask':\s*'[^']*formattedAddress/.test(profileMask));
check('no undocumented maps endpoint is called',
  !/maps\/embed\?pb=/.test(reviews) && !/maps\/embed\?pb=/.test(tech) && !/maps\/embed\?pb=/.test(routes));

// Text Search resolves a place id from a name and an address. It is a guess, and it accepts
// a single candidate — so it must never run over the exact id read from the studio's link.
check('a stored place id is not re-guessed by text search',
  /!storedPlaceId/.test(tech));

// Offered, not applied. An address goes onto invoices; the two can legitimately differ.
check('a mismatch is reported', /addressNote/.test(tech));
check('and never written over their address',
  !/set\(\{\s*address:/.test(tech) && /Nothing has been changed/.test(googleSettings));
check('the studio sees it', /addressNote/.test(googleSettings));

console.log(bad ? `\n${bad} FAILING\n` : '\nall good\n');
process.exit(bad ? 1 : 0);
