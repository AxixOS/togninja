// Does the signature a client draws survive being stored?
//
// server/routes/contracts.ts writes the signature as
//
//     String(signature).slice(0, 4000)
//
// into contract_signers.signature, which is an unbounded Postgres `text` column. That one
// expression is therefore the ONLY narrowing between the browser's fetch() and the stored
// row, and it truncates in SILENCE: no error, no warning, just a row holding a prefix.
//
// The obvious way to build a signature pad is canvas.toDataURL('image/png'), which produces
// 5-30KB. Every single one of those would be cut at character 4000 — and 4000 characters of
// a base64 PNG is not a damaged image, it is not an image at all. The studio would hold a
// row saying "signed" that renders as a broken-image icon on a legal document, and neither
// party would find out until the day it mattered. That is strictly worse than never having
// offered a drawing.
//
// So the drawing is stored as an SVG PATH — integer coordinates in a fixed 600x200 box,
// simplified until it fits — and shared/contractSignature.ts is written so that it returns
// null rather than an over-budget string. This file is the proof of that claim, and it
// proves it against the cap READ OUT OF THE ROUTE rather than the copy of the number in the
// shared module: if the next person changes the slice() and not the encoder, the encoder is
// wrong and this must say so.
//
// It also guards the two states that are outcomes rather than errors. The sign UPDATE is
// conditional on `signed_at IS NULL`, so a second attempt returns 409 and the first
// signature stands; a client who double-clicks must be told "already recorded", not shown a
// failure that sends them to the phone. And 410 is the contract's own expiry, which needs
// an explanation and a next step rather than an apology.
//
// Run: node scripts/ui-verify-contract-sign.mjs
import fs from 'fs';
import {
  encodeDrawnSignature,
  parseSignature,
  sanitizeTypedSignature,
  looksLikeEncodedPath,
  SERVER_SIGNATURE_CAP,
  MAX_DRAWN_SIGNATURE_CHARS,
  MAX_TYPED_SIGNATURE_CHARS,
  SIGNATURE_BOX,
} from '../shared/contractSignature.ts';
import { sanitizeContractHtml } from '../client/src/lib/sanitizeContractHtml.ts';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');

// Comments here necessarily quote the thing they warn about — this file's own header
// contains the string "toDataURL" — so every check reads comment-stripped source.
const stripComments = (s) =>
  s
    .split('\n')
    .map((l) => {
      const t = l.trim();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('{/*')) return '';
      return l.replace(/\s\/\/.*$/, '');
    })
    .join('\n');

/** A block bounded at ITS OWN closing brace. A fixed character window either cuts the block in half or spills into the next one. */
const blockAt = (src, marker) => {
  const start = src.indexOf(marker);
  if (start < 0) return '';
  const open = src.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return '';
};

const ROUTE = 'server/routes/contracts.ts';
const SCHEMA = 'shared/schema.ts';
const BOOT = 'server/index.ts';
const APP = 'client/src/App.tsx';
const PAGE = 'client/src/pages/public/ContractSignPage.tsx';
const PAD = 'client/src/components/contracts/SignaturePad.tsx';
const SANITIZER = 'client/src/lib/sanitizeContractHtml.ts';
const LANG = 'client/src/context/LanguageContext.tsx';

const routeCode = stripComments(read(ROUTE));
const app = read(APP);
const page = read(PAGE);
const pageCode = stripComments(page);
const padCode = stripComments(read(PAD));
const sanitizerCode = stripComments(read(SANITIZER));
const lang = read(LANG);

// ── The cap the encoder aims at is the cap the server actually applies ───────
console.log('\n=== the character budget is the one the route really enforces ===');

const capMatch = routeCode.match(/String\(signature\)\.slice\(0,\s*(\d+)\)/);
const realCap = capMatch ? Number(capMatch[1]) : null;
check('the route still truncates the signature with a slice()', realCap !== null,
  realCap === null ? 'expression not found — has the route changed shape?' : `slice(0, ${realCap})`);
check('the encoder was told the same number',
  realCap !== null && realCap === SERVER_SIGNATURE_CAP,
  `route ${realCap} vs shared/contractSignature ${SERVER_SIGNATURE_CAP}`);
// An invariant balanced on the exact boundary flips the first time anyone adds a few
// characters to the prefix, so the budget must be clear of the cap, not equal to it.
check('the drawn budget leaves real headroom under the cap',
  realCap !== null && MAX_DRAWN_SIGNATURE_CHARS < realCap - 500,
  `${MAX_DRAWN_SIGNATURE_CHARS} of ${realCap}`);
check('a typed name cannot approach it either',
  realCap !== null && MAX_TYPED_SIGNATURE_CHARS < realCap,
  `${MAX_TYPED_SIGNATURE_CHARS}`);

console.log('\n=== and that slice is the ONLY thing that narrows the value ===');
// If the column were varchar(n) the encoder would be aiming at the wrong number entirely.
const signerTable = blockAt(read(SCHEMA), 'export const contractSigners = pgTable(');
check('the signers table was located in the schema', signerTable.length > 0);
check('signature is an unbounded text column, not a varchar',
  signerTable.includes('signature: text("signature")') && !/signature:\s*varchar/.test(signerTable));
const ddl = read(BOOT);
const createSigners = ddl.slice(
  Math.max(ddl.indexOf("ensureTable('contract_signers'"), 0),
  ddl.indexOf("ensureTable('contract_signers'") + 600,
);
check('the CREATE TABLE agrees',
  createSigners.includes('signature text') && !/signature\s+varchar/.test(createSigners));

// ── The round trip, at the exact boundary ───────────────────────────────────
console.log('\n=== an encoded signature survives the route\'s own expression byte for byte ===');

/** Cursive-ish strokes, the shape a real signature has. */
const scrawl = (strokes, perStroke, jitter, seed = 1) => {
  let s = seed;
  const rnd = () => {
    // Deterministic: a property test that only fails on some runs is not a test.
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const out = [];
  for (let k = 0; k < strokes; k++) {
    const pts = [];
    for (let i = 0; i < perStroke; i++) {
      const t = i / Math.max(perStroke - 1, 1);
      pts.push({
        x: 20 + k * 40 + t * 520,
        y: 100 + Math.sin(t * 13 + k) * 60 + (rnd() - 0.5) * jitter,
      });
    }
    out.push(pts);
  }
  return out;
};

// The server's expression, applied here to whatever the encoder produced.
const asStored = (v) => String(v).slice(0, realCap ?? SERVER_SIGNATURE_CAP);

const CASES = [
  ['a three-stroke signature', scrawl(3, 200, 2, 7)],
  ['a slow, heavily sampled signature', scrawl(4, 1200, 4, 11)],
  ['one continuous 20000-point stroke', scrawl(1, 20000, 9, 13)],
  ['a dense six-stroke scribble', scrawl(6, 3000, 12, 17)],
  ['a single dot', [[{ x: 300, y: 100 }]]],
  ['coordinates far outside the box', [[{ x: -9999, y: 9999 }, { x: 1e9, y: -1e9 }, { x: 12, y: 40 }]]],
  ['NaN and undefined coordinates', [[{ x: NaN, y: 40 }, { x: 12, y: undefined }, { x: 20, y: 20 }]]],
];

let roundTripped = 0;
let allIdentical = true;
let allInBudget = true;
let allReparse = true;
for (const [label, strokes] of CASES) {
  const encoded = encodeDrawnSignature(strokes);
  if (encoded === null) {
    check(`${label} — encoded`, false, 'refused, but this case should fit');
    continue;
  }
  roundTripped++;
  if (encoded.length > MAX_DRAWN_SIGNATURE_CHARS) allInBudget = false;
  const stored = asStored(encoded);
  if (stored !== encoded) allIdentical = false;
  const parsed = parseSignature(stored);
  if (!parsed || parsed.kind !== 'drawn' || 'M' + parsed.d.slice(1) !== encoded.slice(encoded.indexOf('M'))) {
    allReparse = false;
  }
}
check('every realistic signature encoded to something', roundTripped === CASES.length,
  `${roundTripped}/${CASES.length}`);
check('none exceeded the drawn budget', allInBudget, `<= ${MAX_DRAWN_SIGNATURE_CHARS}`);
check('the route\'s slice() changed NONE of them — stored === sent', allIdentical);
check('and each one still parses back to the same path after storage', allReparse);

// The point of the exercise: what this replaced would not have survived.
const typicalPngDataUrl = 'data:image/png;base64,' + 'A'.repeat(12000);
check('the raster alternative provably would NOT have survived',
  asStored(typicalPngDataUrl) !== typicalPngDataUrl,
  `${typicalPngDataUrl.length} chars in, ${asStored(typicalPngDataUrl).length} out`);

console.log('\n=== the encoder cannot return an over-budget string, whatever it is fed ===');
// The invariant the page depends on: two outcomes only — a value that fits, or null.
let overBudget = 0;
let tried = 0;
let seed = 99;
const rand = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
for (let i = 0; i < 400; i++) {
  const nStrokes = 1 + Math.floor(rand() * 40);
  const strokes = [];
  for (let k = 0; k < nStrokes; k++) {
    const n = 1 + Math.floor(rand() * 200);
    const pts = [];
    for (let j = 0; j < n; j++) {
      pts.push({
        x: (rand() - 0.2) * SIGNATURE_BOX.width * 1.5,
        y: (rand() - 0.2) * SIGNATURE_BOX.height * 1.5,
      });
    }
    strokes.push(pts);
  }
  tried++;
  const out = encodeDrawnSignature(strokes);
  if (out !== null && out.length > MAX_DRAWN_SIGNATURE_CHARS) overBudget++;
}
check('400 randomised inputs, none produced an over-budget string', overBudget === 0,
  `${tried} tried, ${overBudget} over`);
// And the pathological case really is refused rather than quietly truncated.
const tapStorm = Array.from({ length: 600 }, (_, i) => [{ x: (i * 7) % 600, y: (i * 11) % 200 }]);
check('an input that cannot fit is REFUSED (null), never truncated',
  encodeDrawnSignature(tapStorm) === null);

console.log('\n=== a signature stays small enough to be worth having ===');
// If the tolerances were set too fine, every signature would be degraded to fit and the
// budget would be doing the work the simplifier is supposed to do.
const ordinary = encodeDrawnSignature(scrawl(3, 200, 2, 7));
check('an ordinary signature is comfortably small, not squeezed to the limit',
  ordinary !== null && ordinary.length < 1800, `${ordinary ? ordinary.length : 'null'} chars`);

// ── A stored value cannot become markup ─────────────────────────────────────
console.log('\n=== a stored signature cannot carry anything into the renderer ===');
const HOSTILE = [
  'svgpath:600x200:M0,0"/><script>alert(1)</script>',
  'svgpath:600x200:M0,0 <img src=x onerror=alert(1)>',
  'svgpath:600x200:Mjavascript:alert(1)',
  'svgpath:600x200:M0,0Z" onload="alert(1)',
  'svgpath:600x200:',
];
const leaked = HOSTILE.filter((v) => (parseSignature(v) || {}).kind === 'drawn');
check('nothing outside the grammar is ever treated as geometry', leaked.length === 0,
  leaked.join(' | ') || `${HOSTILE.length} rejected`);
check('a genuine encoding still IS treated as geometry',
  (parseSignature('svgpath:600x200:M12,40 45,22M80,10 90,40') || {}).kind === 'drawn');
check('a value that leaves the grammar degrades to visible text, not a blank signature',
  (parseSignature('svgpath:600x200:M12,40 45,') || {}).kind === 'typed');

console.log('\n=== typed signatures ===');
check('a typed name is capped far below the server cap',
  sanitizeTypedSignature('x'.repeat(5000)).length === MAX_TYPED_SIGNATURE_CHARS);
check('and survives the route expression unchanged',
  asStored(sanitizeTypedSignature('Jane Doe')) === 'Jane Doe');
check('a value that would be mistaken for geometry is spotted', looksLikeEncodedPath('svgpath:600x200:M1,1'));
check('an ordinary name is not', !looksLikeEncodedPath('Jane Doe'));

// ── The pad captures geometry, not pixels ───────────────────────────────────
console.log('\n=== nothing in the signing path rasterises ===');
check('the pad exists', padCode.length > 0, PAD);
for (const [what, src, name] of [['pad', padCode, PAD], ['page', pageCode, PAGE]]) {
  check(`the ${what} never calls toDataURL or toBlob`,
    src.length > 0 && !/toDataURL|toBlob/.test(src), name);
  check(`the ${what} never mentions a PNG data URL`,
    src.length > 0 && !/data:image|image\/png/.test(src), name);
}
check('the pad captures in box units, not screen pixels', /SIGNATURE_BOX\.width/.test(padCode));
check('and hands the parent strokes, which the shared encoder turns into a path',
  /encodeDrawnSignature\(/.test(pageCode));

// ── Where the page is mounted ───────────────────────────────────────────────
console.log('\n=== the page is at the URL the server hands out ===');
const signUrl = (routeCode.match(/signUrl:\s*`([^`$]*)\$\{/) || [])[1];
check('the route still returns a signUrl', !!signUrl, signUrl || 'not found');
const registered = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
check('/contract/:token is registered in App.tsx', registered.includes('/contract/:token'));
check('exactly once — a duplicate would be dead code nobody notices',
  registered.filter((r) => r === '/contract/:token').length === 1);
check('the registered path is the prefix the server sends clients to',
  !!signUrl && '/contract/:token'.startsWith(signUrl), `${signUrl} vs /contract/:token`);
check('the page is imported statically, like every other public page',
  /^import ContractSignPage from '\.\/pages\/public\/ContractSignPage';$/m.test(app));
check('it is a standalone shell, not wrapped in the marketing Layout',
  pageCode.length > 0 && !/<Layout/.test(pageCode));
check('it uses the same bare shell as the other public pages',
  /min-h-screen bg-gray-50 py-8 px-4/.test(pageCode));

// ── It must not widen what the token exposes ────────────────────────────────
console.log('\n=== the page reads only what the public endpoint offers ===');
const contractCalls = [...pageCode.matchAll(/['"`]\/api\/contracts\/([^'"`$]*)/g)].map((m) => m[1]);
check('it calls the public contract endpoints', contractCalls.length >= 2, contractCalls.join(', '));
const nonPublic = contractCalls.filter((p) => !p.startsWith('public/'));
check('and NOTHING under /api/contracts that is not /public/',
  nonPublic.length === 0, nonPublic.join(', ') || 'none');
// Every fetch URL must be an approved public endpoint.
//
// This used to COUNT fetch calls against approved-URL matches and assert the two were
// equal, which quietly assumed an approved URL only ever appears inside a fetch — so
// adding a plain <a href> to the public PDF failed a check that is about authenticated
// calls. A guard with false positives is worse than no guard: assert the real property,
// which is that no fetch on this page reaches a non-public endpoint.
const fetchUrls = [];
for (let i = pageCode.indexOf("fetch("); i >= 0; i = pageCode.indexOf("fetch(", i + 1)) {
  const rest = pageCode.slice(i + 6).trimStart();
  const q = rest[0];
  if (q !== "`" && q !== "'" && q !== '"') continue; // a variable, not a literal URL
  const close = rest.indexOf(q, 1);
  if (close > 0) fetchUrls.push(rest.slice(1, close));
}
const approved = (u) => u.startsWith("/api/contracts/public/") || u.startsWith("/api/studio-config");
const offenders = fetchUrls.filter((u) => !approved(u));
check('every fetch on the page targets a public endpoint',
  fetchUrls.length > 0 && offenders.length === 0,
  offenders.join(', ') || `${fetchUrls.length} call(s), all public`);

// ── The states that are outcomes, not errors ────────────────────────────────
console.log('\n=== 409 already_signed is handled as a normal outcome ===');
const branch409 = blockAt(pageCode, 'if (res.status === 409)');
check('there is a 409 branch, and it was located', branch409.length > 0);
check('it records that the signature already exists', /setAlreadySigned\(true\)/.test(branch409));
check('it does NOT raise a form error', branch409.length > 0 && !/setFormError\(/.test(branch409));
check('it does NOT drop the page into the error state',
  branch409.length > 0 && !/setState\('error'\)/.test(branch409));
check('it refreshes the contract so the client sees where things stand',
  /await load\(\)/.test(branch409));
check('and the copy explains it is not a failure',
  /contractSign\.alreadyTitle/.test(pageCode) && /contractSign\.alreadyBody/.test(pageCode));

console.log('\n=== 410 expired explains itself, on load and on submit ===');
const branch410load = blockAt(pageCode, "if (res.status === 410)");
check('the loader has a 410 branch', branch410load.length > 0);
check("it moves the page to its own 'expired' state", /setState\('expired'\)/.test(branch410load));
check('submitting an expired contract lands in the same state',
  (pageCode.match(/setState\('expired'\)/g) || []).length >= 2,
  `${(pageCode.match(/setState\('expired'\)/g) || []).length} site(s)`);
check('the expired notice carries a next step, not just an apology',
  /contractSign\.expiredBody/.test(pageCode));
check('a 404 is its own state too, not folded into a generic error',
  /setState\('invalid'\)/.test(pageCode) && /contractSign\.invalidBody/.test(pageCode));

// ── The shared link, and signing as somebody else ───────────────────────────
console.log('\n=== one shared link, several signers, nobody signed for by accident ===');
check('a signer is preselected ONLY when exactly one is left to sign',
  /unsigned\.length === 1 \? unsigned\[0\]\.id : null/.test(pageCode));
check('and NOT even then once somebody has signed on this device — the only name left is their partner',
  /if \(soleUnsignedId && !signedHere\)/.test(pageCode));
check('the radio list offers only signers who have NOT signed',
  /\{unsigned\.map\(/.test(pageCode) && !/\{signers\.map\(\(s\) => \{[\s\S]{0,200}type="radio"/.test(pageCode));
check('choosing a different signer clears the confirmation tick',
  /setSelectedSignerId\(s\.id\);\s*\n\s*setAgreed\(false\)/.test(pageCode));
check('the confirmation names the person out loud',
  /contractSign\.attestIAm/.test(pageCode) && /selectedSigner\.name/.test(pageCode));
check('signing sends the chosen signer id, not an assumed one',
  /signerId: selectedSignerId/.test(pageCode));
check('everyone can see who else has signed and who has not',
  /contractSign\.awaiting/.test(pageCode) && /contractSign\.signedOn/.test(pageCode));
check('co-signer addresses are masked — a leaked link is not an address book',
  /function maskEmail/.test(page) && /maskEmail\(s\.email\)/.test(pageCode));
check('the completing signature shows ONE confirmation, not two green panels saying the same thing',
  /\{!result && everyoneSigned \?/.test(pageCode));
check('and the form disappears once everybody has signed',
  /\{everyoneSigned \? null : \(/.test(pageCode));
// Both halves: the localised message is shown AND the API's raw English is not.
check('a server 400 is shown in the language the client is reading, not raw English from the API',
  /setFormError\(t\('contractSign\.submitFailed'\)\)/.test(pageCode)
    && !/setFormError\(String\(body/.test(pageCode));
check('after signing, the client is told what happens next',
  /contractSign\.doneCompleteBody/.test(pageCode) && /contractSign\.donePartialBody/.test(pageCode));
check('including how many signatures are still outstanding',
  /result\.remaining/.test(pageCode) && /contractSign\.stillToCome/.test(pageCode));

// ── The body is somebody else's HTML ────────────────────────────────────────
console.log('\n=== the merged body is sanitised before it reaches the DOM ===');
const dangerous = [...pageCode.matchAll(/dangerouslySetInnerHTML=\{\{\s*__html:\s*([A-Za-z_$][\w$.]*)\s*\}\}/g)]
  .map((m) => m[1]);
const dangerousCount = (pageCode.match(/dangerouslySetInnerHTML/g) || []).length;
check('every dangerouslySetInnerHTML was parsed', dangerous.length === dangerousCount,
  `${dangerous.length}/${dangerousCount}`);
check('and every one of them is fed the sanitised value',
  dangerous.length > 0 && dangerous.every((v) => v === 'safeBody'), dangerous.join(', '));
check('safeBody comes from the sanitiser', /sanitizeContractHtml\(contract\?\.body\)/.test(pageCode));
check('raw contract.body never reaches the attribute', !dangerous.includes('contract.body'));
check('the sanitiser is an allowlist, not a denylist',
  /ALLOWED_TAGS/.test(sanitizerCode) && /ALLOWED_ATTRS/.test(sanitizerCode));
check('it parses rather than pattern-matching tags in a string',
  /new DOMParser\(\)/.test(sanitizerCode));
check('link schemes are restricted', /SAFE_LINK/.test(sanitizerCode) && /https\?/.test(sanitizerCode));
// Node has no DOMParser, so this exercises the fallback the prerender would take — the one
// place a sanitiser is most likely to hand back the raw string by accident.
const fallback = sanitizeContractHtml('<script>alert(1)</script><p onclick="x">hi</p>');
check('with no DOMParser available it escapes rather than passing HTML through',
  fallback.length > 0 && !fallback.includes('<'), fallback.slice(0, 60));
check('and still shows the words, rather than failing to a blank document',
  fallback.includes('hi'));

// ── Translations ────────────────────────────────────────────────────────────
console.log('\n=== every string the page asks for exists in BOTH dictionaries ===');
const enStart = lang.indexOf('\n  en: {');
const deStart = lang.indexOf('\n  de: {');
const enBlock = enStart >= 0 && deStart > enStart ? lang.slice(enStart, deStart) : '';
const deBlock = deStart >= 0 ? lang.slice(deStart) : '';
check('both dictionaries were located', enBlock.length > 0 && deBlock.length > 0);
const usedKeys = [...new Set([...pageCode.matchAll(/\bt\('([^']+)'\)/g)].map((m) => m[1]))];
check('the page asks for translated strings at all', usedKeys.length > 0, `${usedKeys.length} key(s)`);
const missingEn = usedKeys.filter((k) => !enBlock.includes(`'${k}':`));
const missingDe = usedKeys.filter((k) => !deBlock.includes(`'${k}':`));
check('every key is in en', usedKeys.length > 0 && missingEn.length === 0,
  missingEn.join(', ') || `${usedKeys.length}/${usedKeys.length}`);
check('every key is in de — a missing one renders the raw key string',
  usedKeys.length > 0 && missingDe.length === 0,
  missingDe.join(', ') || `${usedKeys.length}/${usedKeys.length}`);
const enSet = [...enBlock.matchAll(/'(contractSign\.[\w.]+)':/g)].map((m) => m[1]).sort();
const deSet = [...deBlock.matchAll(/'(contractSign\.[\w.]+)':/g)].map((m) => m[1]).sort();
check('the contractSign.* sets are identical in both dictionaries',
  enSet.length > 0 && enSet.join('|') === deSet.join('|'), `en ${enSet.length} / de ${deSet.length}`);
const untranslated = deSet.filter((k) => {
  const grab = (block) => {
    const at = block.indexOf(`'${k}':`);
    if (at < 0) return null;
    const q = block.indexOf("'", at + k.length + 3);
    const end = block.indexOf("',", q + 1);
    return q < 0 || end < 0 ? null : block.slice(q + 1, end);
  };
  const en = grab(enBlock);
  const de = grab(deBlock);
  return en !== null && de !== null && en === de;
});
check('the de values are not just the English copied across',
  deSet.length > 0 && untranslated.length === 0, untranslated.join(', ') || `${deSet.length} translated`);
check('no studio name, city or country is hardcoded on the page',
  pageCode.length > 0 && !/New Age|Fotografie|Vienna|Wien|Austria|Shreveport/i.test(pageCode));
// The header name comes from the tenant's own config, or is simply absent.
check('the studio name on the document comes from studio-config',
  /studioName/.test(pageCode) && /\/api\/studio-config/.test(pageCode));

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED — a signature on this page may not survive being stored\n`
  : '\n  ALL CHECKS PASSED — what the client draws is what the database keeps, and the shared link cannot sign for somebody else\n');
process.exit(bad ? 1 : 0);
