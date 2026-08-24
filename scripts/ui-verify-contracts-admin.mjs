// Does the studio's side of contracts agree with the sender?
//
// The whole feature turns on one thing: what a photographer approves on screen is what
// their client receives. shared/contractMerge.ts exists so that both sides run the same
// substitution — and the moment a browser screen does its own, that guarantee is gone
// while every screen still LOOKS right. A preview that renders differently from what is
// sent is worse than no preview, because it is a document the studio believes they have
// checked.
//
// So this reads the admin screens for the four ways that guarantee gets lost:
//
//   a second field list, so the editor offers a token the sender does not know
//   a second tokenizer, so the two disagree about what a placeholder even is
//   a send gate built out of different code than POST /:id/send, so a screen says yes and
//     the server says no (or, far worse, the reverse)
//   a source added to MERGE_FIELDS that the palette silently drops, so a field exists and
//     cannot be inserted
//
// And two things about the surface that are only true if somebody wired them: the sidebar
// entry pointing at a route App.tsx actually registers, and its label existing in BOTH
// dictionaries — a key in en and not in de renders the raw string 'nav.contracts' in a
// German studio's sidebar.
//
// COMMENT LINES ARE STRIPPED BEFORE ANY OF THIS IS MATCHED. ContractDetailPage.tsx quotes
// the server's own send-gate code in its header comment to explain why it copies it; a
// naive grep would find that comment and pass the check while the page did nothing at all.
// A guard that reads its own documentation and calls it evidence is worse than no guard.
//
// Run: node scripts/ui-verify-contracts-admin.mjs
import fs from 'fs';
import { MERGE_FIELDS } from '../shared/contractMerge.ts';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');

/**
 * The file with its comments removed.
 *
 * Whole comment LINES only, plus the interiors of block and JSX comments. Cutting from a
 * mid-line '//' would eat the tail of any line holding a URL.
 */
const code = (src) => {
  let inBlock = false;
  return String(src)
    .split(/\r?\n/)
    .filter((raw) => {
      const l = raw.trim();
      if (inBlock) {
        if (l.includes('*/')) inBlock = false;
        return false;
      }
      if (l.startsWith('/*') || l.startsWith('{/*')) {
        if (!l.includes('*/')) inBlock = true;
        return false;
      }
      return !l.startsWith('//') && !l.startsWith('*');
    })
    .join('\n');
};

/**
 * The same source with the INSIDE of every string, template literal and comment blanked to
 * spaces, newlines kept.
 *
 * Exactly as long as the input, so an index found in here addresses the same character in
 * the original. It exists only so braces can be counted: a '{' inside a SQL string or an
 * HTML template is punctuation, not structure, and counting it walks the end of a block to
 * the wrong place. `${` and its `}` are blanked together, so a template's interpolations
 * stay balanced rather than half-counted.
 *
 * Two shapes it does not model — a regex literal containing an unmatched brace, and a
 * template nested inside another template's `${}`. Neither occurs in the file this reads,
 * and neither can pass silently: both would run the brace count off the end of the block,
 * and every caller asserts the slice it got back before believing anything about it.
 */
const blank = (src) => {
  const out = src.split('');
  const n = src.length;
  const wipe = (i) => { if (i >= 0 && i < n && src[i] !== '\n') out[i] = ' '; };
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') { wipe(i); i++; }
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      wipe(i); wipe(i + 1); i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { wipe(i); i++; }
      wipe(i); wipe(i + 1); i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      i++;
      while (i < n) {
        if (src[i] === '\\') { wipe(i); wipe(i + 1); i += 2; continue; }
        if (src[i] === c) break;
        wipe(i); i++;
      }
      i++;
      continue;
    }
    i++;
  }
  return out.join('');
};

/**
 * The brace-delimited block that opens at the first '{' after `marker`, up to its match.
 *
 * This is how a claim about ONE handler gets asked of that handler and nothing else. A
 * fixed-width window around a marker is not a substitute — it either truncates a long
 * handler, so a mailer at the bottom of it goes unseen, or it reaches into the next one and
 * answers about the wrong route. This project has already been bitten by that.
 *
 * Returns '' when the marker is missing or the braces never balance. That empty string is
 * the trap every caller has to close: it trivially "contains no mailer", so a broken
 * extraction would read as a clean bill of health. Assert the slice before trusting it.
 */
const blockAfter = (src, marker) => {
  const at = src.indexOf(marker);
  if (at < 0) return '';
  const flat = blank(src);
  // Where the body opens depends on what is being extracted, and getting this wrong in
  // either direction produces a guard nobody can trust.
  //
  // A ROUTE registration can carry middleware that takes an object literal —
  // upload.single({ ... }), rateLimit({ ... }) — so the first brace after the path may be
  // that config rather than the handler. Anchor those on the arrow, which only the
  // handler has.
  //
  // A plain `async function foo(...) {` has no arrow at all, and searching for one runs
  // past the declaration into whatever arrow appears next, slicing an unrelated region.
  // (Anchoring everything on the arrow did exactly that here and turned a passing check
  // red.) Those open at the first brace, which is already correct for them.
  const brace = flat.indexOf('{', at);
  const arrow = marker.includes('router.') ? flat.indexOf('=> {', at) : -1;
  const open = arrow >= 0 ? arrow + 3 : brace;
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < flat.length; i++) {
    if (flat[i] === '{') depth++;
    else if (flat[i] === '}' && --depth === 0) return src.slice(open, i + 1);
  }
  return '';
};

const DIR = 'client/src/pages/admin';
const PAGES = {
  api: `${DIR}/contractsApi.ts`,
  list: `${DIR}/ContractsPage.tsx`,
  composer: `${DIR}/ContractComposerPage.tsx`,
  detail: `${DIR}/ContractDetailPage.tsx`,
  templates: `${DIR}/ContractTemplatesPage.tsx`,
};

const src = Object.fromEntries(Object.entries(PAGES).map(([k, p]) => [k, code(read(p))]));
const app = code(read('client/src/App.tsx'));
const layout = code(read('client/src/components/admin/AdminLayout.tsx'));
const lang = read('client/src/context/LanguageContext.tsx');
const route = code(read('server/routes/contracts.ts'));

// ── The screens exist and can be reached ────────────────────────────────────
console.log('\n=== the studio can get to it ===');
for (const [name, path] of Object.entries(PAGES)) {
  check(`${name} screen exists`, fs.existsSync(path), path);
}

const ROUTES = [
  ['/admin/contracts', 'ContractsPage'],
  ['/admin/contracts/new', 'ContractComposerPage'],
  ['/admin/contracts/templates', 'ContractTemplatesPage'],
  ['/admin/contracts/:id', 'ContractDetailPage'],
];
for (const [path, component] of ROUTES) {
  const at = app.indexOf(`path="${path}"`);
  // Bounded at the NEXT route rather than at a fixed number of characters: a fixed window
  // either truncates a long element or reaches into its neighbour, and both make this
  // check answer a question about the wrong route.
  const nextAt = at < 0 ? -1 : app.indexOf('<Route', at);
  const element = at < 0 ? '' : app.slice(at, nextAt < 0 ? app.length : nextAt);
  check(`App.tsx registers ${path}`, at >= 0);
  check(`  and renders <${component} /> behind NeonProtectedRoute`,
    element.includes(`<${component} />`) && element.includes('NeonProtectedRoute'));
}

console.log('\n=== the sidebar entry ===');
const sidebarLine = layout
  .split('\n')
  .find((l) => l.includes("path: '/admin/contracts'"));
check('AdminLayout has a contracts row', !!sidebarLine, sidebarLine ? sidebarLine.trim() : 'none');
check('it uses the i18n form, not a hardcoded English label',
  !!sidebarLine && sidebarLine.includes("t('nav.contracts')"));
check('and points at a path App.tsx registers',
  !!sidebarLine && app.includes('path="/admin/contracts"'));

// ── The label, in both dictionaries ─────────────────────────────────────────
console.log('\n=== the label exists in BOTH locales ===');
// The raw file, not `code`: these are data lines, and one of the two dictionaries sits
// under a comment banner that the stripper would otherwise leave intact anyway.
const labels = [...lang.matchAll(/'nav\.contracts':\s*'([^']*)'/g)].map((m) => m[1]);
check('nav.contracts is defined twice (en and de)', labels.length === 2, `${labels.length} definition(s)`);
check('neither definition is empty', labels.length === 2 && labels.every((v) => v.trim().length > 0),
  labels.join(' / '));
check('the two are actually translated, not the same string twice',
  labels.length === 2 && labels[0] !== labels[1], labels.join(' / '));

// ── One merge engine, not two ───────────────────────────────────────────────
console.log('\n=== the screens use the shared merge engine ===');
const SHARED = '../../../../shared/contractMerge';
check('the composer imports it', src.composer.includes(SHARED));
check('the draft imports it', src.detail.includes(SHARED));
check('the template editor imports it', src.templates.includes(SHARED));

for (const [name, s] of Object.entries(src)) {
  // A second copy of the field list is the failure this whole file exists for.
  check(`${name} does not declare its own MERGE_FIELDS`, !/\b(const|let|var)\s+MERGE_FIELDS\s*=/.test(s));
  // The shared tokenizer's character class. Copying it is how two sides start disagreeing
  // about what counts as a placeholder.
  check(`${name} does not copy the token regex`, !s.includes('[^\\][\\n]'));
}

check('the template editor builds its palette FROM MERGE_FIELDS',
  src.templates.includes('MERGE_FIELDS.filter('));
check('it reports fields with fieldsUsed() rather than its own scan',
  src.templates.includes('fieldsUsed(') && src.composer.includes('fieldsUsed('));

// Every source in the shared list must be one the palette groups by, or fields with that
// source are offered nowhere and nobody finds out.
console.log('\n=== the palette covers every source MERGE_FIELDS uses ===');
const sources = [...new Set(MERGE_FIELDS.map((f) => f.source))];
// Read from the ARRAY, starting after the '=': the type annotation on the declaration is
// MergeField['source'][], and reading from the name would count 'source' as a value.
const declAt = src.api.indexOf('SOURCE_ORDER');
const eqAt = declAt < 0 ? -1 : src.api.indexOf('=', declAt);
const orderAt = eqAt < 0 ? -1 : src.api.indexOf('[', eqAt);
const orderEnd = orderAt < 0 ? -1 : src.api.indexOf(']', orderAt);
const ordered = orderAt < 0 || orderEnd < 0
  ? []
  : [...src.api.slice(orderAt, orderEnd).matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
check('SOURCE_ORDER was found', ordered.length > 0, ordered.join(', '));
for (const s of sources) {
  check(`  '${s}' is grouped by the palette`, ordered.includes(s));
  check(`  '${s}' has a label`, src.api.includes(`  ${s}:`));
}

// ── The send gate is the server's gate ──────────────────────────────────────
console.log('\n=== the draft screen refuses exactly what the server refuses ===');
// Premise, read out of the route: this is the check the send endpoint performs.
check('the route re-merges the STORED body before sending (premise)',
  route.includes('mergeContract(contract.body, {})') && route.includes('canSend('));
const detailMergeLines = src.detail
  .split('\n')
  .filter((l) => l.includes('mergeContract('));
check('the draft screen runs mergeContract over the stored body with no values',
  detailMergeLines.some((l) => l.includes(', {})')),
  detailMergeLines.map((l) => l.trim()).join(' | ') || 'no call found');
check('and rules on it with canSend, not its own opinion', src.detail.includes('canSend('));
check('Send is disabled on that verdict',
  src.detail.includes('disabled={sending || !!blockedReason}') && src.detail.includes('verdict.ok'));
check('and the studio is shown the reason canSend gave', src.detail.includes('verdict.reason'));
check('an unresolved field is named, not merely counted',
  src.detail.includes('merged.missing.map') && src.detail.includes('merged.unknown.map'));

console.log('\n=== the composer surfaces unresolved fields before anything is created ===');
check('it reports what the merge engine reported', src.composer.includes('merged.missing'));
check('and separates the fields the SERVER fills from the ones the studio must',
  src.composer.includes('isServerFilled') && src.composer.includes('missingServer'));
check('isServerFilled matches the route: studio-sourced keys, plus Today',
  src.api.includes("=== 'studio' || key === 'Today'"));

// The keys studioValues() actually supplies, read from its own body — bounded at the
// function's closing brace rather than a character count.
const studioBody = blockAfter(route, 'async function studioValues');
const serverKeys = [...studioBody.matchAll(/^\s*(?:'([^']+)'|([A-Za-z][A-Za-z ]*)):/gm)]
  .map((m) => (m[1] || m[2] || '').trim())
  // `const s: any = ...` inside the function matches the unquoted branch; a declaration is
  // not a merge key.
  .filter((k) => k && !/^(const|let|var|return)\b/.test(k));
check('studioValues() was read from the route', serverKeys.length > 0, serverKeys.join(', '));
const byKey = Object.fromEntries(MERGE_FIELDS.map((f) => [f.key, f]));
const misfiled = serverKeys.filter((k) => byKey[k] && !(byKey[k].source === 'studio' || k === 'Today'));
check('every key the server fills is one the composer treats as server-filled',
  misfiled.length === 0, misfiled.length ? misfiled.join(', ') : `${serverKeys.length} key(s)`);

// ── The signer list ─────────────────────────────────────────────────────────
console.log('\n=== editing signers cannot destroy a signature ===');
// Premise: the endpoint REPLACES the list, and those rows hold the evidence.
check('PUT /:id/signers deletes the existing rows (premise)',
  route.includes('DELETE FROM contract_signers'));
check('the draft screen locks the signer editor once anything is signed',
  src.detail.includes('anySigned ? (') && src.detail.includes('signed_at'));
check('and says why rather than just greying out',
  src.detail.includes('throw away the signature'));

// ── What "Send" actually does ───────────────────────────────────────────────
//
// POST /:id/send mints an access_token and sets status='sent'. It emails NOBODY: there is
// no mailer in the route, and the link only leaves the building if a person copies it. A
// button labelled Send that quietly does not send is the same defect class as the agent
// page that promised a confirmation prompt which never fired — a studio acts on the claim,
// then waits a week for a signature on a link that never left the screen.
//
// Note the shape of that claim: it is about ONE handler, not about the file. contracts.ts
// mails people from its SIGN route, correctly, via deliverExecutedContract(). So this used
// to be read out of the whole file and was wrong twice over — silent when /send gained a
// mailer it reached through a helper the word list did not name, and red when mail was
// added to the sign route, where mail belongs. It reads the handler now.
console.log('\n=== the screens do not claim an email was sent ===');
// Asked of the HANDLER, not of the file. contracts.ts really does email people — the sign
// route calls deliverExecutedContract(), which mails every signer and the studio with the
// executed PDF attached — so a whole-file scan gets the question wrong in both directions.
// It stays green while POST /:id/send grows a mailer it reaches through a helper whose name
// is not in the list, and it goes red when mail is added to the sign route, where mailing is
// the correct behaviour. The claim these three screens make is about one route, so one route
// is what gets read.
const sendRoute = blockAfter(route, "router.post('/:id/send'");
// The trap first. An extraction that failed returns '', and '' contains no mailer name at
// all — so an unchecked slice would turn a broken guard into a passing one, which is the
// precise failure this whole file was written to refuse. So the slice is proved before it is
// believed: against landmarks only this handler has, and against the route that follows it.
const extracted = sendRoute.includes("'unresolved_fields'") && sendRoute.includes('access_token');
check('the send handler was extracted from the route (premise)', extracted,
  sendRoute.length ? `${sendRoute.length} chars` : 'nothing extracted');
check('  and the slice stops before the next route begins',
  extracted && !sendRoute.includes("router.get('/public/:token'"));
// Proof that scoping it is load-bearing rather than decorative: this file DOES mail people,
// just not from here. A whole-file scan would have to either miss that or fail on it.
check('  (the file mails elsewhere, which is why the scan is scoped)',
  route.includes('deliverExecutedContract('));
const MAILERS = [
  'sendMail', 'nodemailer', 'sendEmail', 'transporter', 'sendgrid',
  // The indirect ones. A scan for 'sendEmail' never sees a mailer reached through a helper,
  // and deliverExecutedContract is already imported at the top of contracts.ts — putting it
  // in this route is a one-line change, so it is named here rather than left to be noticed.
  'deliverExecutedContract', 'EnhancedEmailService', 'BrevoService',
];
const mailerInSend = MAILERS.filter((m) => sendRoute.includes(m));
// Conditioned on `extracted`, so this line can never report a clean handler it never read.
// "I searched nothing and found nothing" is the answer a broken guard gives.
check('the send endpoint really has no mailer in it (premise)',
  extracted && mailerInSend.length === 0,
  mailerInSend.join(', ') || (extracted ? 'none' : 'no handler was read — this is not evidence'));
check('the draft screen says so beside the Send button',
  src.detail.includes('does not email anybody'));
check('and again where the link is shown', src.detail.includes('Nothing was emailed'));
check('the list says so after a send', src.list.includes('Nothing was emailed'));
check('and it is told as news, not as an error', src.list.includes('rowNote'));

// ── The link ────────────────────────────────────────────────────────────────
console.log('\n=== the client link is built in one place ===');
check('signUrlFor builds /contract/<token>', src.api.includes('/contract/${token}'));
check('App.tsx registers that route', app.includes('path="/contract/:token"'));
for (const name of ['list', 'composer', 'detail', 'templates']) {
  check(`${name} does not spell the link itself`, !src[name].includes('/contract/'));
}
check('the list offers a copy action at all', src.list.includes('copyLink('));
check('and it says so when the clipboard refuses', src.api.includes('Could not reach the clipboard') || src.list.includes('Could not reach the clipboard'));

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED — the studio's side and the sender do not agree\n`
  : '\n  ALL CHECKS PASSED — one merge engine, one gate, one link, and a sidebar entry that leads somewhere\n');
process.exit(bad ? 1 : 0);
