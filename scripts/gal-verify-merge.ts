// Does a contract go out with the right numbers in it?
//
// A contract template is prose full of placeholders — [Final Due Date], [Retainer Amount],
// [Client Name]. This is the one place in the product where getting a substitution wrong is
// a legal problem rather than a cosmetic one: a client receives a signed agreement quoting
// the wrong fee, or the previous client's name, or a bare "the retainer is ." where a number
// should be.
//
// So the rules are deliberately strict, and these assertions are the specification:
//   an unknown field is LEFT VISIBLE, never blanked
//   a known field with no value is LEFT VISIBLE and reported, never blanked
//   sending is BLOCKED while either is true
//   substitution is single-pass, so a value cannot inject another field
//
// Run: npx tsx scripts/gal-verify-merge.ts
import { mergeContract, canSend, fieldsUsed, MERGE_FIELDS } from '../shared/contractMerge';

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const VALUES = {
  'Studio Name': 'Kristina Banks Photography',
  'Client Name': 'Jane Doe',
  'Total Fee': '£1,200.00',
  'Retainer Amount': '£300.00',
  'Final Due Date': '1 October 2026',
  'City Name': 'Hove',
};

console.log('\n=== the ordinary case ===');
const a = mergeContract(
  'This agreement is between [Studio Name] and [Client Name]. The total fee is [Total Fee].',
  VALUES,
);
check('every field is substituted',
  a.text === 'This agreement is between Kristina Banks Photography and Jane Doe. The total fee is £1,200.00.',
  a.text);
check('nothing is reported missing', a.missing.length === 0);
check('nothing is reported unknown', a.unknown.length === 0);
check('it is safe to send', canSend(a).ok);

console.log('\n=== a field with no value is NOT blanked ===');
// "the retainer is ." reads as a finished sentence and is not one. This is the failure
// that would actually reach a client.
const b = mergeContract('The retainer is [Retainer Amount] and the balance is [Balance Amount].', {
  'Retainer Amount': '£300.00',
});
check('the placeholder is still visible', b.text.includes('[Balance Amount]'), b.text);
check('it is reported missing', b.missing.includes('Balance Amount'));
check('sending is blocked', !canSend(b).ok);
check('the reason names the field', (canSend(b).reason || '').includes('[Balance Amount]'),
  canSend(b).reason);

console.log('\n=== a field that does not exist is a template bug, not a blank ===');
const c = mergeContract('Delivery within [Turnaround Weeks] weeks.', VALUES);
check('the placeholder survives', c.text.includes('[Turnaround Weeks]'));
check('it is reported as unknown', c.unknown.includes('Turnaround Weeks'));
check('it is NOT reported as merely missing', !c.missing.includes('Turnaround Weeks'));
check('sending is blocked', !canSend(c).ok);
check('the reason says the field does not exist',
  (canSend(c).reason || '').includes('does not exist'), canSend(c).reason);

console.log('\n=== a value cannot inject another field ===');
// A single pass matters: if output were re-scanned, a client named "[Total Fee]" would
// have the fee substituted into the name.
const d = mergeContract('Client: [Client Name]. Fee: [Total Fee].', {
  'Client Name': '[Total Fee]',
  'Total Fee': '£9,999.00',
});
check('the injected token is not expanded',
  d.text.includes('[Total Fee]. Fee: £9,999.00') || d.text.includes('&#91;') || d.text.includes('[Total Fee]'),
  d.text);
check('the fee appears exactly once', (d.text.match(/£9,999\.00/g) || []).length === 1, d.text);

console.log('\n=== values are escaped, because templates are rich text ===');
const e = mergeContract('Client: [Client Name].', { 'Client Name': '<script>alert(1)</script>' });
check('a tag in a value cannot become markup', !e.text.includes('<script>'), e.text);
check('it is escaped rather than dropped', e.text.includes('&lt;script&gt;'));

const f = mergeContract('Subject: [Client Name]', { 'Client Name': 'Smith & Jones' }, { escape: false });
check('escaping can be turned off for plain text', f.text === 'Subject: Smith & Jones', f.text);

console.log('\n=== the editor can list what a template uses ===');
const used = fieldsUsed('Hello [Client Name], from [Studio Name]. Again: [Client Name].');
check('each field is listed once', used.length === 2, used.join(', '));
check('in order of appearance', used[0] === 'Client Name' && used[1] === 'Studio Name');

console.log('\n=== edge cases that would otherwise reach a client ===');
check('an empty template is fine', mergeContract('', VALUES).text === '');
check('a template with no fields is untouched',
  mergeContract('No placeholders here.', VALUES).text === 'No placeholders here.');
// Whitespace inside brackets is the commonest hand-typing slip.
check('a field with stray spaces still resolves',
  mergeContract('[ Client Name ]', VALUES).text === 'Jane Doe',
  mergeContract('[ Client Name ]', VALUES).text);
// An empty string is a missing value, not a valid one — "the fee is " must never ship.
check('an empty-string value counts as missing',
  mergeContract('[Total Fee]', { 'Total Fee': '' }).missing.includes('Total Fee'));
check('a whitespace-only value counts as missing',
  mergeContract('[Total Fee]', { 'Total Fee': '   ' }).missing.includes('Total Fee'));
// Brackets are used in ordinary prose too; a multi-line one is not a field.
check('a bracket spanning lines is not treated as a field',
  mergeContract('[not\na field]', VALUES).unknown.length === 0);

console.log('\n=== the field catalogue is coherent ===');
const keys = MERGE_FIELDS.map((f2) => f2.key);
check('no duplicate keys', new Set(keys).size === keys.length);
check('every field has a label', MERGE_FIELDS.every((f2) => f2.label.trim().length > 0));
check('the money fields exist', ['Total Fee', 'Retainer Amount', 'Balance Amount'].every((k) => keys.includes(k)));

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED\n`
  : '\n  ALL CHECKS PASSED — a contract cannot go out with a placeholder still in it\n');
process.exit(bad ? 1 : 0);
