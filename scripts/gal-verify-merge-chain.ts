// Can a contract still be sent, and does the preview show the address that is sent?
//
// Two defects, both of which end the same way: a draft the studio cannot send and cannot
// repair, because contracts.body is a SNAPSHOT that is never re-rendered. Deleting the
// contract and rebuilding it is the only exit, so neither of these is cosmetic.
//
//   1. A MERGED VALUE RE-READ AS A TOKEN. POST /:id/send and the draft screen run
//      mergeContract(body, {}) over the already-merged body to ask "did a placeholder
//      survive?". That question only has an answer if every bracket in the body came from
//      the template. Free text reaches every non-studio field — "Meet at the north gate
//      [not the main car park]", "Studio 7 [Vienna] GmbH" — so a merged value could supply
//      brackets of its own, and the gate then reported a field that does not exist.
//      There is no injection here: pass two substitutes nothing (values is {}) and
//      mergeContract is single-pass by construction. The damage is a permanent refusal.
//
//   2. TWO RESOLUTION CHAINS FOR [Studio Email]. studio_configs.email is nullable and
//      empty until the Studio Customization form is saved; owner_email is NOT NULL and is
//      written by the bootstrap insert. The browser's preview read an endpoint that fell
//      back to owner_email; the sender did not fall back at all. On a fresh instance the
//      composer therefore rendered the address and said every field was filled, while the
//      stored body kept the placeholder and the send was refused — naming a field the
//      studio could see was filled. They are never two different addresses: one address
//      and one blank. So the fix is one chain, not a reconciliation.
//
// WHAT THIS FILE CHECKS. Defect 1 is checked by BEHAVIOUR — the real two-pass the send gate
// performs, run against the real module. Defect 2 is checked by behaviour AND by structure,
// because "all three share one function" is a fact about the call sites and cannot be seen
// from the module alone. The structural checks are SCOPED to the function that resolves the
// address: a whole-file grep for 'resolveStudioEmail' would pass on a file that imports it
// and then ignores it, and a check that cannot fail is not a check.
//
// Run: npx tsx scripts/gal-verify-merge-chain.ts
import fs from 'fs';
import { mergeContract, canSend, resolveStudioEmail } from '../shared/contractMerge';

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const read = (p: string) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');

/** Whole comment lines removed, so a file cannot pass by quoting the code in its header. */
const code = (src: string): string => {
  let inBlock = false;
  return String(src)
    .split(/\r?\n/)
    .filter((raw) => {
      const l = raw.trim();
      if (inBlock) {
        if (l.includes('*/')) inBlock = false;
        return false;
      }
      if (l.startsWith('/*')) {
        if (!l.includes('*/')) inBlock = true;
        return false;
      }
      return !l.startsWith('//') && !l.startsWith('*');
    })
    .join('\n');
};

/**
 * The part of a file one function occupies.
 *
 * Bounded by the NEXT declaration rather than by a character count: a fixed window either
 * truncates the function or reaches into its neighbour, and both make every check below
 * answer a question about the wrong code. Returns '' when the opening anchor is gone, and
 * the caller checks for that — a guard that cannot find its subject must fail, not pass.
 */
const region = (src: string, start: string, end: string): string => {
  const a = src.indexOf(start);
  if (a < 0) return '';
  const b = src.indexOf(end, a + start.length);
  return src.slice(a, b < 0 ? src.length : b);
};

/** What a renderer does with the numeric references escapeHtml emits. */
const decodeNumeric = (t: string): string =>
  t
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(Number(d)))
    .split('&amp;')
    .join('&');

// ────────────────────────────────────────────────────────────────────────────
// 1. A merged value cannot be re-read as a token
// ────────────────────────────────────────────────────────────────────────────
console.log('\n=== the send gate really is a second pass over the merged body (premise) ===');
const route = code(read('server/routes/contracts.ts'));
check('POST /:id/send re-merges the STORED body with no values',
  route.includes('mergeContract(contract.body, {})') && route.includes('canSend('));
const draft = code(read('client/src/pages/admin/ContractDetailPage.tsx'));
check('and the draft screen performs the same pass',
  draft.includes('mergeContract(') && draft.includes(', {})') && draft.includes('canSend('));

/** Exactly what happens between "create" and "send": merge, store, re-scan, rule. */
const roundTrip = (template: string, values: Record<string, string>) => {
  const stored = mergeContract(template, values).text;   // POST / — the snapshot
  const recheck = mergeContract(stored, {});             // POST /:id/send — the gate
  return { stored, recheck, verdict: canSend(recheck) };
};

const TEMPLATE = 'Shoot at [Session Location] for [Client Name]. Fee [Total Fee].';

console.log('\n=== brackets inside a merged VALUE do not block the send ===');
const bracketed = roundTrip(TEMPLATE, {
  'Session Location': 'Meet at the north gate [not the main car park]',
  'Client Name': 'Jane Doe',
  'Total Fee': '£1,200.00',
});
check('nothing is reported as an unknown field',
  bracketed.recheck.unknown.length === 0, bracketed.recheck.unknown.join(', '));
check('nothing is reported as missing',
  bracketed.recheck.missing.length === 0, bracketed.recheck.missing.join(', '));
check('the contract can be sent', bracketed.verdict.ok, bracketed.verdict.reason || '');
check('the words the studio typed survive to the page',
  decodeNumeric(bracketed.stored).includes('Meet at the north gate [not the main car park]'),
  bracketed.stored);

console.log('\n=== a value that looks like a REAL field is not treated as one either ===');
// A client literally named "[Client Name]" used to be filed under `missing` on pass two,
// and the studio was told to fill in a field that was already filled.
const lookalike = roundTrip(TEMPLATE, {
  'Session Location': 'Hove',
  'Client Name': 'Studio 7 [Client Name] GmbH',
  'Total Fee': '£1,200.00',
});
check('the contract can be sent', lookalike.verdict.ok, lookalike.verdict.reason || '');
check('and the name is still the name, not a substituted value',
  decodeNumeric(lookalike.stored).includes('Studio 7 [Client Name] GmbH'), lookalike.stored);
check('the fee was substituted exactly once',
  (lookalike.stored.match(/£1,200\.00/g) || []).length === 1, lookalike.stored);

console.log('\n=== the gate still refuses what it is FOR ===');
// The whole point of the second pass. If either of these ever passes, the fix above went
// too far and a contract reading "the fee is [Total Fee]" reaches a client.
const gap = roundTrip(TEMPLATE, { 'Session Location': 'Hove', 'Client Name': 'Jane Doe' });
check('a field with no value still blocks the send', !gap.verdict.ok, gap.verdict.reason || 'ALLOWED');
check('and is named as missing', gap.recheck.missing.includes('Total Fee'));
check('and the placeholder is still visible in the body', gap.stored.includes('[Total Fee]'));

const typo = roundTrip('Delivery by [Sesion Date].', { 'Session Date': '1 October' });
check('a template typo still blocks the send', !typo.verdict.ok, typo.verdict.reason || 'ALLOWED');
check('and is named as a field that does not exist',
  (typo.verdict.reason || '').includes('does not exist'), typo.verdict.reason || '');

console.log('\n=== the escaping is escaping, not deletion ===');
const tagged = mergeContract('Client: [Client Name].', { 'Client Name': '<b>x</b> & [y]' });
check('a tag in a value still cannot become markup', !tagged.text.includes('<b>'), tagged.text);
check('a bracket is written as a numeric reference', tagged.text.includes('&#91;'), tagged.text);
check('an ampersand is escaped BEFORE the bracket, so "&#91;" in a value reads back as itself',
  decodeNumeric(mergeContract('[Client Name]', { 'Client Name': '&#91;not a bracket' }).text)
    === '&#91;not a bracket');
const plain = mergeContract('Subject: [Client Name]', { 'Client Name': 'Smith [Hove] & Co' },
  { escape: false });
check('plain-text output is untouched — nothing re-scans a subject line',
  plain.text === 'Subject: Smith [Hove] & Co', plain.text);

// ────────────────────────────────────────────────────────────────────────────
// 2. One resolution chain for [Studio Email]
// ────────────────────────────────────────────────────────────────────────────
console.log('\n=== resolveStudioEmail is one rule, and it is the right one ===');
check('a saved address wins',
  resolveStudioEmail({ email: 'hello@studio.com', ownerEmail: 'admin@localhost' }) === 'hello@studio.com');
// These four asserted the OPPOSITE until the fallback was removed, and the reason is worth
// keeping: owner_email is not a spare address, it is a bootstrap placeholder.
// server/index.ts seeds it 'admin@localhost' whenever studio_configs is empty, setup-routes
// uses 'setup@togninja.com', and onboarding never repairs either — its UPDATE carries no
// email field at all. The one writer that sets a REAL owner_email
// (server/technical-setup-routes.ts) sets `email` in the same statement, so a fallback can
// only ever fire when the value is the placeholder.
//
// Falling back therefore converts a hard block — "Fill in [Studio Email] before sending" —
// into a signed contract naming an address nobody can reach, in a body snapshot that is
// never re-rendered and so can never be corrected. The blank is the safe answer: it keeps
// the send gate shut until a human types a real address.
check('the bootstrap placeholder is NOT substituted for a real address',
  resolveStudioEmail({ email: '', ownerEmail: 'admin@localhost' }) === '');
check('null is a blank, not a crash (strictNullChecks is off in this repo)',
  resolveStudioEmail({ email: null, ownerEmail: 'admin@localhost' }) === '');
check('a snake_case pg row resolves the same as camelCase JSON',
  resolveStudioEmail({ email: null, owner_email: 'admin@localhost' }) === ''
  && resolveStudioEmail({ email: 'a@b.com' }) === resolveStudioEmail({ email: 'a@b.com' }));
check('whitespace is not an address, and does not open the fallback either',
  resolveStudioEmail({ email: '   ', ownerEmail: 'admin@localhost' }) === '');
check('a padded address is trimmed rather than passed on',
  resolveStudioEmail({ email: ' hello@studio.com ' }) === 'hello@studio.com');
check('no address at all is an empty string', resolveStudioEmail({}) === '');
check('and a missing row does not throw', resolveStudioEmail(null) === '');

// A blank address must reach mergeContract as MISSING rather than as a value, or a contract
// goes out saying the studio's email is nothing at all.
const noEmail = mergeContract('Contact [Studio Email].', { 'Studio Email': resolveStudioEmail({}) });
check('an unresolvable address leaves the placeholder and blocks the send',
  noEmail.missing.includes('Studio Email') && !canSend(noEmail).ok);

console.log('\n=== the preview and the sender call that one function ===');
const FN = 'resolveStudioEmail';

/**
 * `producer` is the line that DECIDES the studio's address in that block.
 *
 * Named per call site rather than scanned for generically. A blanket "no `||` near the word
 * email" rule fires on studio-branding's own `ownerEmail: sc?.ownerEmail || ''` — a
 * different key, exposed for the Studio Customization form, which feeds no merge field —
 * and a check with false positives is worse than no check. `end` is CODE, never a comment
 * banner: comments are stripped above, so a comment anchor is never found and the region
 * silently runs to the end of the file.
 */
const CALLERS: Array<{
  label: string;
  file: string;
  start: string;
  end: string;
  producer: RegExp;
}> = [
  {
    label: 'the sender',
    file: 'server/routes/contracts.ts',
    start: 'async function studioValues',
    end: "router.get('/templates'",
    producer: /'Studio Email'\s*:/,
  },
  {
    label: 'the branding endpoint',
    file: 'server/routes/studio-branding.ts',
    start: "router.get('/branding'",
    end: "router.get('/public-branding'",
    producer: /^\s*email\s*:/,
  },
  {
    label: "the browser's preview",
    file: 'client/src/pages/admin/contractsApi.ts',
    start: 'export async function fetchStudioMergeValues',
    end: 'export const signUrlFor',
    producer: /^\s*const\s+studioEmail\s*=/,
  },
];

for (const c of CALLERS) {
  const src = code(read(c.file));
  const block = region(src, c.start, c.end);
  check(`${c.label}: the resolving function was found in ${c.file}`,
    block.length > 80 && block.length < 4000,
    block ? `${block.length} chars` : 'NOT FOUND');
  check(`${c.label}: imports ${FN} from the shared module`,
    new RegExp(`import[^;]*\\b${FN}\\b[^;]*shared/contractMerge`).test(src));
  check(`${c.label}: does not declare a second ${FN}`,
    !new RegExp(`(function|const|let|var)\\s+${FN}\\b`).test(src));

  const producing = block.split('\n').filter((l) => c.producer.test(l));
  check(`${c.label}: the address is produced somewhere in that block`,
    producing.length > 0, `${producing.length} line(s)`);
  // Every line that decides the address must BE the shared call. A fallback re-typed
  // beside it is a second rule, and a second rule is how these three drifted apart.
  const notShared = producing.filter((l) => !l.includes(`${FN}(`));
  check(`${c.label}: and every line that produces it calls ${FN}`,
    producing.length > 0 && notShared.length === 0,
    (notShared.length ? notShared : producing).map((l) => l.trim()).join(' | '));
}

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED — a draft the studio cannot send is one line away\n`
  : '\n  ALL CHECKS PASSED — brackets in a value are prose, and [Studio Email] has one chain\n');
process.exit(bad ? 1 : 0);
