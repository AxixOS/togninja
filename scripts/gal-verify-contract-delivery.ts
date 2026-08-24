// Does the signed contract actually leave the building, and does it carry its evidence?
//
// Two failures this is written against, both of which have shipped in this repo before:
//
//  1. THE DOCUMENT THAT ISN'T A RECORD. contract_signers stores signed_at, signature,
//     signed_ip and signed_user_agent, and the obvious PDF prints the prose and the
//     scrawl and none of the other three. That document proves nothing: "signed" with no
//     when, no where and no how is a claim. So this guard does not check that a PDF was
//     produced — it INFLATES the produced PDF's content streams and asserts the IP
//     addresses, the user agents, the UTC instants and the body hash are really on the
//     page. A layout change that quietly drops the audit section fails here.
//
//  2. THE SEND THAT DIDN'T HAPPEN. EnhancedEmailService returns success:true WITH
//     demo:true when nothing was sent, and the gallery route awaited it and returned
//     ok:true regardless. So the delivery module is read for the three ways it must
//     refuse to claim a send: the demo flag, an explicit success:false, and DEMO_MODE
//     itself — which the mail service does NOT check, and which is true on the live demo.
//
// It also holds the line on the thing the whole signature design turns on: a drawn
// signature is stored as an SVG path (shared/contractSignature.ts) precisely because the
// route truncates at 4000 characters and a PNG data URL does not survive that. A path is
// only worth storing if something can draw it, so the render is checked for real vector
// strokes rather than an empty signature box.
//
// Run: npx tsx scripts/gal-verify-contract-delivery.ts
import fs from 'fs';
import zlib from 'zlib';
import { encodeDrawnSignature } from '../shared/contractSignature';
import {
  renderExecutedContractPdf,
  executedContractFilename,
  htmlToBlocks,
  pdfSafe,
  bodyFingerprint,
} from '../server/lib/contractPdf';

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const read = (p: string) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');

/**
 * The file with its comment LINES removed.
 *
 * Every module here documents the defect it prevents, and those comments necessarily quote
 * the broken code. A guard that greps a file and finds its own documentation has verified
 * nothing at all.
 */
const code = (src: string) => {
  let inBlock = false;
  return src.split(/\r?\n/).filter((raw) => {
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
  }).join('\n');
};

// ── Reading a PDFKit document back ──────────────────────────────────────────

/** Every FlateDecode stream, inflated. PDFKit compresses by default. */
function inflateStreams(pdf: Buffer): string {
  let out = '';
  let at = 0;
  while (true) {
    const start = pdf.indexOf('stream', at);
    if (start < 0) break;
    // Skip the EOL that must follow the `stream` keyword.
    let from = start + 6;
    if (pdf[from] === 0x0d) from++;
    if (pdf[from] === 0x0a) from++;
    const end = pdf.indexOf('endstream', from);
    if (end < 0) break;
    const body = pdf.subarray(from, end);
    try {
      out += zlib.inflateSync(body).toString('latin1');
    } catch {
      // Not every stream is text or flate (fonts, metadata). Ignoring one is correct;
      // ignoring ALL of them would make every assertion below vacuously false, which is
      // why the extraction is checked for content before anything is asserted on it.
      out += body.toString('latin1');
    }
    at = end + 9;
  }
  return out;
}

/**
 * The text-showing operands, decoded.
 *
 * PDFKit does NOT write `(Hello) Tj`. Its _fragment() encodes every run through the font
 * and emits `[<48656c6c6f> -12 <21>] TJ` — hex, one byte per glyph, with kern offsets
 * interleaved. An extractor that looks for parenthesised literals finds nothing at all and
 * every "is it on the page" assertion then passes by finding nothing to contradict, which
 * is why the caller checks the extraction is non-empty before asserting anything on it.
 *
 * Dictionaries open with '<<' and are skipped; everything else that is an even number of
 * hex digits is a string.
 */
function pdfText(pdf: Buffer): string {
  const streams = inflateStreams(pdf);
  let out = '';
  let i = 0;
  while (i < streams.length) {
    const open = streams.indexOf('<', i);
    if (open < 0) break;
    if (streams[open + 1] === '<') { i = open + 2; continue; }
    const close = streams.indexOf('>', open + 1);
    if (close < 0) break;
    const hex = streams.slice(open + 1, close);
    if (hex.length > 0 && hex.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hex)) {
      for (let k = 0; k < hex.length; k += 2) {
        out += String.fromCharCode(parseInt(hex.slice(k, k + 2), 16));
      }
    }
    i = close + 1;
  }
  return out;
}

/** Wrapping inserts line breaks mid-sentence, so both sides are compared without spaces. */
const squeeze = (s: string) => s.replace(/\s+/g, '');

// ── A contract, executed ────────────────────────────────────────────────────

/** Cursive-ish strokes, the shape a real drawn signature has. */
function scrawl(strokes: number, perStroke: number, seed = 5) {
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const out: Array<Array<{ x: number; y: number }>> = [];
  for (let k = 0; k < strokes; k++) {
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < perStroke; i++) {
      const t = i / Math.max(perStroke - 1, 1);
      pts.push({ x: 20 + k * 40 + t * 520, y: 100 + Math.sin(t * 11 + k) * 55 + (rnd() - 0.5) * 3 });
    }
    out.push(pts);
  }
  return out;
}

const DRAWN = encodeDrawnSignature(scrawl(3, 240));

// Deliberately NOT the origin studio, and deliberately not a European timezone: this
// product is sold to photographers anywhere, and a Louisiana studio shown Vienna time on a
// signature would misdate every one of them.
const STUDIO = {
  name: 'Kristina Banks Photography',
  email: 'hello@example.invalid',
  phone: '+1 318 555 0147',
  address: '412 Texas Street',
  city: 'Shreveport',
  country: 'United States',
};
const TZ = 'America/Chicago';
const LOCALE = 'en-US';

const BODY = [
  '<h2>Portrait session agreement</h2>',
  '<p>The total fee is 1,200.00 and a 50% retainer of $$600 is due on booking.</p>',
  '<p>Ben &amp; Jerry attend as guests &mdash; no additional charge.</p>',
  '<ul><li>Two hours of coverage</li><li>Thirty edited images</li></ul>',
  '<script>alert("not prose")</script>',
  '<p>Signed by the parties below.</p>',
].join('');

const SIGNED_AT = new Date('2026-08-24T19:32:05.000Z');
const CONTRACT = {
  id: '7c1f3a9e-2b40-4d55-9f21-6a0b8c4d1e77',
  title: 'Portrait Session Agreement',
  body: BODY,
  status: 'signed',
  createdAt: new Date('2026-08-20T09:00:00.000Z'),
  sentAt: new Date('2026-08-21T14:10:00.000Z'),
  viewedAt: new Date('2026-08-22T08:05:00.000Z'),
  signedAt: SIGNED_AT,
};

const UA_CLIENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15';
const UA_STUDIO = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/141.0.0.0 Safari/537.36';

const SIGNERS = [
  {
    name: 'Kristina Banks',
    email: 'kristina@example.invalid',
    role: 'studio',
    signedAt: new Date('2026-08-23T16:04:11.000Z'),
    signature: 'Kristina Banks',
    signedIp: '198.51.100.24',
    signedUserAgent: UA_STUDIO,
  },
  {
    // A name with a character WinAnsi cannot hold, on purpose: PDFKit's standard fonts
    // push an unmapped code point through as a raw byte and render garbage silently, and
    // a silently wrong party name on a contract is the worst kind of typo.
    name: 'Łukasz Nowak',
    email: 'lukasz@example.invalid',
    role: 'client',
    signedAt: SIGNED_AT,
    signature: DRAWN,
    signedIp: '203.0.113.77',
    signedUserAgent: UA_CLIENT,
  },
];

async function main() {
  console.log('\n=== the drawn signature encodes at all (premise) ===');
  check('encodeDrawnSignature produced a path', typeof DRAWN === 'string' && DRAWN.startsWith('svgpath:'),
    DRAWN ? `${DRAWN.length} chars` : 'null');

  const pdf = await renderExecutedContractPdf({
    contract: CONTRACT,
    signers: SIGNERS as any,
    studio: STUDIO,
    timezone: TZ,
    locale: LOCALE,
    amounts: [{ label: 'Total Fee', value: '$1,200.00' }],
  });

  console.log('\n=== a PDF was produced ===');
  check('it is a PDF', pdf.length > 1000 && pdf.subarray(0, 5).toString() === '%PDF-',
    `${pdf.length} bytes`);
  const text = pdfText(pdf);
  const flat = squeeze(text);
  // Guarded before anything is asserted on it: an extractor that silently returns nothing
  // would make every "is on the page" check below pass by finding nothing to contradict.
  check('text could be extracted from it', flat.length > 400, `${flat.length} chars`);
  const has = (needle: string) => flat.includes(squeeze(needle));

  console.log('\n=== the agreement itself is on the page ===');
  check('the title', has('Portrait Session Agreement'));
  check('a clause', has('The total fee is 1,200.00'));
  // String.replace treats $$ in the REPLACEMENT as an escaped dollar, so a clause with a
  // literal $$ is exactly what a replace-based tag stripper would corrupt.
  check('a clause containing $$ survives verbatim', has('retainer of $$600 is due'));
  check('an HTML entity is decoded, not printed', has('Ben & Jerry') && !has('&amp;'));
  check('an em-dash entity is decoded', has('guests'));
  check('a list item', has('Thirty edited images'));
  check('script contents are NOT printed', !has('alert('), 'script body');
  check('no raw tags leaked through', !has('<p>') && !has('</ul>'));

  console.log('\n=== the evidence, which is what makes it a record ===');
  for (const s of SIGNERS) {
    check(`${s.role} name`, has(pdfSafe(s.name)), pdfSafe(s.name));
    check(`${s.role} email`, has(s.email));
    check(`${s.role} IP address`, has(s.signedIp), s.signedIp);
    check(`${s.role} user agent`, has(s.signedUserAgent), s.signedUserAgent.slice(0, 34) + '...');
    check(`${s.role} signing instant in UTC`, has(s.signedAt.toISOString()), s.signedAt.toISOString());
  }
  check('the body is fingerprinted', has(bodyFingerprint(BODY)), bodyFingerprint(BODY).slice(0, 16) + '...');
  check('the contract reference', has(CONTRACT.id));
  check('the studio timezone is named', has(TZ), TZ);

  console.log('\n=== the studio\'s own locale, never the origin studio\'s ===');
  check('signing times are rendered in the studio zone, not UTC-as-local',
    has('August 24, 2026') && has('2:32:05'), 'America/Chicago is UTC-5 in August');
  check('nothing in the document mentions Vienna', !has('Vienna'));
  check('nor Austria', !has('Austria'));
  check('the studio name is the one passed in', has(STUDIO.name));
  check('and its city', has(STUDIO.city));
  check('the amount is shown as the caller formatted it', has('$1,200.00'));

  console.log('\n=== a name WinAnsi cannot hold is transliterated, not garbled ===');
  check('pdfSafe keeps what WinAnsi has', pdfSafe('Zoë Müller') === 'Zoë Müller');
  check('and transliterates what it does not', pdfSafe('Łukasz') === 'Lukasz', pdfSafe('Łukasz'));
  check('and never silently deletes a character',
    pdfSafe('a\u{1F600}b').length === 3 && pdfSafe('a\u{1F600}b').includes('?'), pdfSafe('a\u{1F600}b'));

  console.log('\n=== the drawn signature is drawn, not an empty box ===');
  const streams = inflateStreams(pdf);
  // PDFKit writes a stroked polyline as `x y m`, `x y l` … `S`. A signature box that
  // rendered nothing would still have its rectangle, so the count is what matters: an
  // encoded scrawl is hundreds of segments.
  const lineOps = (streams.match(/\n[\d.]+ [\d.]+ l\n/g) || []).length;
  check('the SVG path became real vector segments', lineOps > 50, `${lineOps} lineto ops`);
  check('the typed signature is rendered as text', has('Kristina Banks'));

  console.log('\n=== the filename is one a client can find again ===');
  const name = executedContractFilename(CONTRACT.title, CONTRACT.id);
  check('it names the contract', name.startsWith('portrait-session-agreement'), name);
  check('it says it is the signed copy', name.includes('-signed-'));
  // It goes straight into a quoted Content-Disposition header.
  check('it cannot break out of a header', /^[a-z0-9.-]+$/.test(name), name);

  console.log('\n=== htmlToBlocks keeps structure the layout depends on ===');
  const blocks = htmlToBlocks('<h2>Terms</h2><p>One</p><ul><li>A</li><li>B</li></ul>');
  check('a heading stays a heading', blocks[0]?.style === 'h2' && blocks[0]?.text === 'Terms');
  check('list items are separate blocks',
    blocks.filter((b) => b.style === 'li').length === 2,
    blocks.map((b) => b.style).join(','));
  check('an unterminated tag does not print tag soup',
    !htmlToBlocks('<p>Fine</p><p>broken').map((b) => b.text).join(' ').includes('<'));

  // ── The delivery module, read as source ───────────────────────────────────
  const delivery = code(read('server/lib/contractDelivery.ts'));
  const route = code(read('server/routes/contracts.ts'));

  console.log('\n=== the mailer is never told it succeeded when it did not ===');
  check('the delivery module exists', delivery.length > 0, 'server/lib/contractDelivery.ts');
  check('it reads the demo flag, not just success', /\.demo\b/.test(delivery));
  check('it reads an explicit failure too', /success === false/.test(delivery));
  check('DEMO_MODE is checked BEFORE the mail service, which does not check it',
    /isDemoMode\(\)/.test(delivery) && delivery.indexOf('isDemoMode()') < delivery.indexOf('EnhancedEmailService.sendEmail'));
  check('a recipient starts NOT emailed and is only flipped on a confirmed send',
    /emailed: false/.test(delivery) && /t\.emailed = true/.test(delivery));
  check('a slow mail server cannot hang the signer forever', /SEND_TIMEOUT_MS/.test(delivery));
  check('and a timeout counts as not sent', /timedOut/.test(delivery));
  check('every problem is reported, not swallowed', /problem:/.test(delivery));

  console.log('\n=== the copy goes to both sides ===');
  check('every signer is addressed', /for \(const s of signers\) add\(/.test(delivery));
  check('the studio gets one too', /add\(studio\.email/.test(delivery));
  check('and the same address is not mailed twice', /seen\.has\(/.test(delivery));
  check('the PDF is attached', /attachments: \[\{ filename, content: pdf/.test(delivery));

  console.log('\n=== money and time come from the shared helpers ===');
  check('amounts go through server/lib/money.ts', /formatMoney\(/.test(delivery));
  check('the money fields are read from MERGE_FIELDS, not hardcoded',
    /MERGE_FIELDS\.filter\(\(f\) => f\.source === 'money'\)/.test(delivery));
  check('the timezone comes from the studio, then DEFAULT_CAL_TZ',
    /s\.timezone \|\| process\.env\.DEFAULT_CAL_TZ/.test(delivery));
  check('and never falls back to the origin studio\'s zone', !/Europe\/Vienna/.test(delivery));
  check('nor does the renderer', !/Europe\/Vienna/.test(code(read('server/lib/contractPdf.ts'))));

  console.log('\n=== the route hangs it on the completion transition ===');
  check("the 'every signer has signed' transition still exists (premise)",
    /const complete = remaining\.rows\[0\]\.n === 0/.test(route));
  check('delivery is attempted only when it is complete',
    /if \(complete\) \{[\s\S]{0,200}deliverExecutedContract/.test(route));
  // After the COMMIT, or a mail server being down could roll back a signature.
  const commitAt = route.indexOf("await client.query('COMMIT')");
  const deliverAt = route.indexOf('await deliverExecutedContract(');
  check('and only AFTER the signature is committed', commitAt > 0 && deliverAt > commitAt,
    `commit@${commitAt} deliver@${deliverAt}`);
  check('the outcome is reported rather than assumed', /copySent: complete \? !!delivery/.test(route));
  // The privacy half of the same line. This endpoint is public: returning the delivery
  // object would hand one signer the other signers' email addresses.
  check('but the recipient list is NOT returned to a public caller',
    !/remaining: remaining\.rows\[0\]\.n, delivery/.test(route)
    && !/\bdelivery\s*\}\)/.test(route));

  console.log('\n=== a copy is obtainable even when no mail can be sent ===');
  check('the studio can download the executed copy', /router\.get\('\/:id\/pdf'/.test(route));
  check('and it is behind auth', /router\.get\('\/:id\/pdf', requireAuth/.test(route));
  check('the signer can download their own', /router\.get\('\/public\/:token\/pdf'/.test(route));
  check('a half-signed contract is refused rather than dressed up as executed',
    /not_executed/.test(route) && /not_executed/.test(delivery));

  console.log('\n=== POST /:id/send still emails nobody ===');
  // The claim three admin screens make in their own copy. Delivery happens at SIGNING; if
  // a mailer ever appears in this route file those screens start lying.
  for (const mailer of ['sendMail', 'nodemailer', 'sendEmail', 'transporter', 'sendgrid']) {
    check(`the route file has no ${mailer}`, !route.includes(mailer));
  }

  console.log(bad
    ? `\n  ${bad} CHECK(S) FAILED — the executed contract is not something both sides can rely on\n`
    : '\n  ALL CHECKS PASSED — the signed copy carries its evidence, and no send is claimed that was not made\n');
  process.exit(bad ? 1 : 0);
}

main().catch((e) => {
  console.error('\n  FAILED TO RUN:', e?.message || e);
  process.exit(1);
});
