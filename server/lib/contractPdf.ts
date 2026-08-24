// The executed contract, as a document both sides can keep.
//
// A signature that lives only in a database row is evidence nobody can hold. When the last
// signer signs, both sides need one artefact that carries the agreed text AND the proof of
// who agreed to it — and it has to be readable in five years, by a person who has no login
// to this CRM and possibly no relationship with the studio any more.
//
// WHAT MAKES THIS A RECORD RATHER THAN A FORMATTED DOCUMENT
//
// contract_signers already stores four things per signer: signed_at, signature, signed_ip
// and signed_user_agent. All four are printed. A PDF that shows only the prose and a
// pretty scrawl is the same document the studio could have typed themselves; the audit
// trail is the part that answers "how do you know it was them", and it is the part that is
// always omitted because it is ugly. It is printed here in full, including the raw user
// agent string, because an abbreviated one proves nothing.
//
// The body is also fingerprinted (SHA-256, printed in full). contracts.body is a SNAPSHOT
// taken at send time and never re-rendered, so the hash is stable for the life of the
// contract: re-generating this PDF next year must produce the same fingerprint, and a
// different one means the stored text changed after signing.
//
// WHY THE SIGNATURE IS DRAWN FROM GEOMETRY, NOT AN IMAGE
//
// shared/contractSignature.ts stores a drawn signature as an SVG path in a fixed 600x200
// box, because server/routes/contracts.ts truncates the stored value at 4000 characters
// and a PNG data URL does not survive that. parseSignature() hands back a `d` string whose
// grammar is already validated, so this file re-draws it with moveTo/lineTo rather than
// handing the string to PDFKit's SVG parser — the grammar is ours, three characters wide,
// and parsing it here means an unexpected token cannot become an unexpected shape on a
// legal document.
//
// WHY TEXT IS PUT THROUGH pdfSafe()
//
// PDFKit's standard fonts are WinAnsi. AFMFont.encodeText pushes any code point it has no
// mapping for straight through as a raw byte, so a name like "Lukasz" spelled with a
// crossed L renders as garbage with no error anywhere. On a contract that is a silently
// wrong party name. pdfSafe() keeps everything WinAnsi can carry, transliterates what
// decomposes, and only then falls back to '?' — visible, so a studio can see something was
// lost rather than shipping a mangled one.
import PDFDocument from 'pdfkit';
import { createHash } from 'crypto';
import { parseSignature } from '../../shared/contractSignature';

export interface ExecutedSigner {
  name: string;
  email: string;
  role: string;
  signedAt: Date | string | null;
  signature: string | null;
  signedIp: string | null;
  signedUserAgent: string | null;
}

export interface ExecutedStudio {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

export interface ExecutedContract {
  id: string;
  title: string;
  /** The merged text as sent. Never re-rendered from the template — see the header. */
  body: string;
  status: string;
  createdAt?: Date | string | null;
  sentAt?: Date | string | null;
  viewedAt?: Date | string | null;
  signedAt?: Date | string | null;
}

export interface ExecutedContractInput {
  contract: ExecutedContract;
  signers: ExecutedSigner[];
  studio: ExecutedStudio;
  /** The studio's own IANA zone. Resolved by the caller; never assumed here. */
  timezone: string;
  /** BCP-47, for the dates. The studio's, not the server's. */
  locale: string;
  /**
   * Money lines, ALREADY formatted by server/lib/money.ts. Formatting is async and this
   * renderer is not, and more importantly the caller is the only place that knows whether
   * a stored value is a bare number we may format or text the studio typed verbatim.
   */
  amounts: Array<{ label: string; value: string }>;
}

// ── Page geometry ───────────────────────────────────────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;
/** Kept clear at the foot of every page so body text never collides with the footer. */
const FOOTER_RESERVE = 40;

const INK = '#111111';
const MUTED = '#666666';
const RULE = '#d4d4d4';

// ── WinAnsi safety ──────────────────────────────────────────────────────────

/**
 * The 27 code points CP1252 carries in 0x80-0x9F that Latin-1 does not. Everything else
 * WinAnsi can encode is a contiguous range, so this set is the whole of the exception.
 */
const WIN_ANSI_EXTRA = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160,
  0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

function encodable(cp: number): boolean {
  if (cp === 0x0a) return true;
  if (cp >= 0x20 && cp <= 0x7e) return true;
  if (cp >= 0xa0 && cp <= 0xff) return true;
  return WIN_ANSI_EXTRA.has(cp);
}

/**
 * Latin letters that carry their mark INSIDE the glyph, so NFKD leaves them whole.
 *
 * A stroked L is one character to Unicode, not L plus a combining stroke, and decomposition
 * therefore returns it unchanged — which would send a Polish or Croatian client's name to
 * the '?' fallback. These are the ones a European or Turkish name actually hits.
 */
const FOLD: Record<string, string> = {
  'Ł': 'L', 'ł': 'l', 'Đ': 'D', 'đ': 'd', 'Ħ': 'H', 'ħ': 'h',
  'Ŧ': 'T', 'ŧ': 't', 'Ŋ': 'N', 'ŋ': 'n', 'ı': 'i', 'ĸ': 'k',
  'Ə': 'E', 'ə': 'e', 'Ɖ': 'D', 'ẞ': 'SS', 'Ƶ': 'Z', 'ƶ': 'z',
};

/** Text PDFKit's standard fonts can actually draw. See the header for why this exists. */
export function pdfSafe(value: unknown): string {
  const raw = value == null ? '' : String(value);
  let out = '';
  for (const ch of raw) {
    const cp = ch.codePointAt(0) as number;
    if (cp === 0x09) { out += ' '; continue; }
    if (cp === 0x0d) continue;
    if (encodable(cp)) { out += ch; continue; }
    const folded = FOLD[ch];
    if (folded) { out += folded; continue; }
    // Decompose ONLY the characters WinAnsi cannot hold, so an o-umlaut stays an o-umlaut
    // and does not get flattened to a plain 'o' on the way past.
    let replaced = '';
    for (const d of ch.normalize('NFKD')) {
      const dcp = d.codePointAt(0) as number;
      if (dcp >= 0x0300 && dcp <= 0x036f) continue; // combining mark
      if (encodable(dcp)) replaced += d;
    }
    out += replaced || '?';
  }
  return out;
}

// ── HTML to printable blocks ────────────────────────────────────────────────
//
// contracts.body is rich text with merge values already substituted and HTML-escaped by
// shared/contractMerge.ts. PDFKit takes plain text, so the markup has to come off — and it
// has to come off without String.replace, whose replacement string treats $& and $$ as
// backreferences. A contract clause reading "50% deposit, $$500 balance" would rewrite
// itself on the way to the page. Everything below scans with indexOf instead.

export type BlockStyle = 'h1' | 'h2' | 'h3' | 'body' | 'li' | 'quote';

export interface PrintBlock {
  style: BlockStyle;
  text: string;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘',
  rdquo: '”', ldquo: '“', bull: '•', eacute: 'é', egrave: 'è',
  uuml: 'ü', ouml: 'ö', auml: 'ä', szlig: 'ß', copy: '©',
  reg: '®', trade: '™', deg: '°', euro: '€', pound: '£',
  yen: '¥', cent: '¢', middot: '·', laquo: '«', raquo: '»',
};

function entityChar(name: string): string | null {
  if (!name) return null;
  if (name.charAt(0) === '#') {
    const isHex = name.charAt(1) === 'x' || name.charAt(1) === 'X';
    const digits = isHex ? name.slice(2) : name.slice(1);
    if (!digits) return null;
    if (isHex ? !/^[0-9a-fA-F]+$/.test(digits) : !/^[0-9]+$/.test(digits)) return null;
    const cp = parseInt(digits, isHex ? 16 : 10);
    if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff) return null;
    // A lone surrogate is not a character; String.fromCodePoint would emit an unpaired one
    // and every downstream length calculation would be off by one.
    if (cp >= 0xd800 && cp <= 0xdfff) return null;
    try { return String.fromCodePoint(cp); } catch { return null; }
  }
  const hit = NAMED_ENTITIES[name.toLowerCase()];
  return hit === undefined ? null : hit;
}

function decodeEntities(text: string): string {
  if (text.indexOf('&') < 0) return text;
  let out = '';
  let i = 0;
  while (i < text.length) {
    const amp = text.indexOf('&', i);
    if (amp < 0) { out += text.slice(i); break; }
    out += text.slice(i, amp);
    const semi = text.indexOf(';', amp + 1);
    // A bare ampersand is ordinary prose ("Ben & Jerry"), so an unterminated or absurdly
    // long entity is kept as the literal character rather than swallowing the sentence.
    if (semi < 0 || semi - amp > 12) { out += '&'; i = amp + 1; continue; }
    const ch = entityChar(text.slice(amp + 1, semi));
    if (ch === null) { out += '&'; i = amp + 1; continue; }
    out += ch;
    i = semi + 1;
  }
  return out;
}

const BLOCK_TAGS = new Set([
  'p', 'div', 'section', 'article', 'header', 'footer', 'ul', 'ol', 'li', 'table', 'tr',
  'td', 'th', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
]);

const TAG_STYLE: Record<string, BlockStyle> = {
  h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h3', h5: 'h3', h6: 'h3',
  li: 'li', blockquote: 'quote',
};

/** Collapse runs of spaces but never newlines — a <br> is a line the studio asked for. */
function tidy(text: string): string {
  const flattened = text.split(' ').join(' ');
  const lines = flattened.split('\n').map((l) => l.split(/[ \t]+/).filter(Boolean).join(' ').trim());
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Turn the stored rich text into blocks the renderer can lay out.
 *
 * Exported so a guard can assert on it directly: this is the one place a contract's words
 * are transformed between the row and the page, and a bug here changes what the document
 * says.
 */
export function htmlToBlocks(html: string): PrintBlock[] {
  const src = String(html || '');
  const blocks: PrintBlock[] = [];
  let style: BlockStyle = 'body';
  let buffer = '';

  const flush = () => {
    const text = tidy(buffer);
    if (text) blocks.push({ style, text });
    buffer = '';
    style = 'body';
  };

  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt < 0) { buffer += decodeEntities(src.slice(i)); break; }
    buffer += decodeEntities(src.slice(i, lt));
    const gt = src.indexOf('>', lt + 1);
    // An unterminated '<' is far more likely a less-than sign than markup — "under 18 <
    // years" — and this used to `break`, discarding every remaining clause of the
    // contract with no error anywhere. Silently losing text from a legal document is
    // worse than printing a stray character, so the '<' is kept as literal text and
    // parsing continues.
    if (gt < 0) {
      buffer += decodeEntities(src.slice(lt));
      break;
    }

    const inner = src.slice(lt + 1, gt).trim();
    i = gt + 1;
    if (!inner || inner.charAt(0) === '!') continue; // comment or doctype

    const closing = inner.charAt(0) === '/';
    const bare = closing ? inner.slice(1) : inner;
    const nameEnd = bare.search(/[\s/>]/);
    const name = (nameEnd < 0 ? bare : bare.slice(0, nameEnd)).toLowerCase();

    // Script and style bodies are code, not prose. Skip to the matching close rather than
    // printing the source into the document.
    if (!closing && (name === 'script' || name === 'style')) {
      const close = src.toLowerCase().indexOf('</' + name, i);
      i = close < 0 ? src.length : close;
      continue;
    }

    if (name === 'br') { buffer += '\n'; continue; }
    if (BLOCK_TAGS.has(name)) {
      flush();
      if (!closing) style = TAG_STYLE[name] || 'body';
    }
  }
  flush();
  return blocks;
}

// ── Dates, in the studio's zone ─────────────────────────────────────────────

/**
 * "24 August 2026, 02:32:05 PM CDT" — in the studio's own zone and locale.
 *
 * The zone comes from studio_configs.timezone via the caller. Nothing here falls back to a
 * European default: a Louisiana studio shown Vienna time on a legal document would misdate
 * every signature by seven hours.
 */
export function stampLocal(
  value: Date | string | null | undefined, timezone: string, locale: string,
): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString(locale || 'en-US', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZoneName: 'short',
      timeZone: timezone || 'UTC',
    });
  } catch {
    // An unusable zone or locale must not cost the studio the document. UTC is stated
    // rather than disguised as local time.
    return d.toISOString().slice(0, 19).split('T').join(' ') + ' UTC';
  }
}

/** The same instant, unambiguously, for the audit trail. */
export function stampUtc(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

/** SHA-256 of the signed text. Printed in full — a prefix proves nothing. */
export function bodyFingerprint(body: string): string {
  return createHash('sha256').update(String(body || ''), 'utf8').digest('hex');
}

/** A filename a client can still recognise in their downloads folder a year later. */
export function executedContractFilename(title: string, id: string): string {
  const slug = pdfSafe(title)
    .toLowerCase()
    .split('')
    .map((c) => (/[a-z0-9]/.test(c) ? c : '-'))
    .join('')
    .split('-')
    .filter(Boolean)
    .join('-')
    .slice(0, 60);
  const short = String(id || '').split('-')[0] || 'contract';
  return (slug || 'contract') + '-signed-' + short + '.pdf';
}

// ── Drawing ─────────────────────────────────────────────────────────────────

/**
 * Re-draw an encoded signature.
 *
 * `d` has already been through DRAWN_RE in shared/contractSignature.ts, so it is digits,
 * commas, spaces and 'M' and nothing else. Each 'M' starts a separate pen-down stroke and
 * is stroked separately — one continuous path would draw a line from the end of one stroke
 * to the start of the next, joining up letters the person lifted the pen between.
 */
function drawSignaturePath(
  doc: any, d: string, boxW: number, boxH: number,
  x: number, y: number, maxW: number, maxH: number,
): void {
  const scale = Math.min(maxW / (boxW || 1), maxH / (boxH || 1));
  doc.save();
  doc.strokeColor(INK).lineWidth(Math.max(0.7, 1.8 * scale)).lineJoin('round').lineCap('round');
  for (const raw of d.split('M')) {
    const seg = raw.trim();
    if (!seg) continue;
    const pts: Array<{ x: number; y: number }> = [];
    for (const pair of seg.split(' ')) {
      if (!pair) continue;
      const comma = pair.indexOf(',');
      if (comma < 0) continue;
      const px = Number(pair.slice(0, comma));
      const py = Number(pair.slice(comma + 1));
      if (Number.isFinite(px) && Number.isFinite(py)) pts.push({ x: px, y: py });
    }
    if (!pts.length) continue;
    doc.moveTo(x + pts[0].x * scale, y + pts[0].y * scale);
    // A single point is a deliberate dot — the tittle on an i, or a full stop. Drawn as a
    // zero-length line so it has a round cap to render instead of nothing at all.
    if (pts.length === 1) doc.lineTo(x + pts[0].x * scale, y + pts[0].y * scale);
    for (let k = 1; k < pts.length; k++) {
      doc.lineTo(x + pts[k].x * scale, y + pts[k].y * scale);
    }
    doc.stroke();
  }
  doc.restore();
}

/**
 * Render the executed contract.
 *
 * Resolves with the finished bytes. Rejects only if PDFKit itself fails, which the caller
 * must treat as "there is no copy to send" and never as "the signature did not happen".
 */
export function renderExecutedContractPdf(input: ExecutedContractInput): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const { contract, signers, studio, timezone, locale, amounts } = input;
    let settled = false;

    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      // Needed for the "page n of N" footer: the total is not known until the last page
      // exists, so pages are held until the end.
      bufferPages: true,
      info: {
        Title: pdfSafe(contract.title),
        // The studio's own name. Never a hardcoded studio — this product is sold to many.
        Author: pdfSafe(studio.name),
        Subject: 'Executed contract',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => { if (!settled) { settled = true; resolve(Buffer.concat(chunks)); } });
    doc.on('error', (e: any) => { if (!settled) { settled = true; reject(e); } });

    const bottomLimit = PAGE_H - MARGIN - FOOTER_RESERVE;
    const room = (needed: number) => {
      if (doc.y + needed > bottomLimit) doc.addPage();
    };
    const rule = () => {
      room(12);
      doc.save().strokeColor(RULE).lineWidth(0.7)
        .moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y).stroke().restore();
      doc.y = doc.y + 10;
    };
    const heading = (text: string) => {
      room(26);
      doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8.5)
        .text(pdfSafe(text).toUpperCase(), MARGIN, doc.y, { width: CONTENT_W, characterSpacing: 0.8 });
      doc.moveDown(0.35);
      doc.fillColor(INK);
    };

    try {
      // ── Letterhead ────────────────────────────────────────────────────────
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(15)
        .text(pdfSafe(studio.name || 'Contract'), MARGIN, MARGIN, { width: CONTENT_W });
      const where = [studio.address, studio.city, studio.country]
        .map((v) => pdfSafe(v)).filter(Boolean).join(', ');
      const reach = [studio.email, studio.phone]
        .map((v) => pdfSafe(v)).filter(Boolean).join('  ·  ');
      doc.font('Helvetica').fontSize(9).fillColor(MUTED);
      if (where) doc.text(where, MARGIN, doc.y, { width: CONTENT_W });
      if (reach) doc.text(reach, MARGIN, doc.y, { width: CONTENT_W });
      doc.moveDown(0.8);
      rule();

      // ── Title and execution state ─────────────────────────────────────────
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(19)
        .text(pdfSafe(contract.title), MARGIN, doc.y, { width: CONTENT_W });
      doc.moveDown(0.3);
      const executedAt = stampLocal(contract.signedAt, timezone, locale);
      const parties = signers.length === 1 ? 'party' : 'parties';
      doc.font('Helvetica').fontSize(9.5).fillColor(MUTED).text(
        executedAt
          ? pdfSafe('Fully executed ' + executedAt + ' by all ' + signers.length + ' ' + parties + '.')
          : 'This copy is not fully executed.',
        MARGIN, doc.y, { width: CONTENT_W },
      );
      doc.moveDown(1);

      // ── Amounts ───────────────────────────────────────────────────────────
      //
      // A summary only. The agreement is the body below, and these are the same values the
      // body was merged from, so they can restate it but must never contradict it — which
      // is why the caller passes text through verbatim unless it is a bare number.
      if (amounts.length) {
        heading('Agreed amounts');
        doc.font('Helvetica').fontSize(10).fillColor(INK);
        for (const line of amounts) {
          room(16);
          const at = doc.y;
          doc.font('Helvetica').fillColor(MUTED)
            .text(pdfSafe(line.label), MARGIN, at, { width: 200 });
          doc.font('Helvetica-Bold').fillColor(INK)
            .text(pdfSafe(line.value), MARGIN + 210, at, { width: CONTENT_W - 210 });
        }
        doc.moveDown(0.9);
      }

      // ── The agreement ─────────────────────────────────────────────────────
      heading('Agreement');
      for (const block of htmlToBlocks(contract.body)) {
        const text = pdfSafe(block.text);
        if (!text) continue;
        if (block.style === 'h1' || block.style === 'h2' || block.style === 'h3') {
          const size = block.style === 'h1' ? 13.5 : block.style === 'h2' ? 12 : 11;
          room(size + 16);
          doc.moveDown(0.5);
          doc.font('Helvetica-Bold').fontSize(size).fillColor(INK)
            .text(text, MARGIN, doc.y, { width: CONTENT_W });
          doc.moveDown(0.3);
          continue;
        }
        if (block.style === 'li') {
          doc.font('Helvetica').fontSize(10).fillColor(INK);
          room(Math.min(doc.heightOfString(text, { width: CONTENT_W - 14 }) + 6, 140));
          const at = doc.y;
          doc.text('•', MARGIN, at, { width: 10 });
          doc.text(text, MARGIN + 14, at, { width: CONTENT_W - 14 });
          doc.moveDown(0.25);
          continue;
        }
        const indent = block.style === 'quote' ? 18 : 0;
        doc.font(block.style === 'quote' ? 'Helvetica-Oblique' : 'Helvetica')
          .fontSize(10).fillColor(INK);
        // Capped, because a clause taller than a page would otherwise ask for a new page on
        // every iteration and never fit — PDFKit already flows long text across pages.
        room(Math.min(doc.heightOfString(text, { width: CONTENT_W - indent }) + 6, 140));
        doc.text(text, MARGIN + indent, doc.y, { width: CONTENT_W - indent });
        doc.moveDown(0.6);
      }

      // ── Signatures ────────────────────────────────────────────────────────
      doc.moveDown(0.6);
      rule();
      heading('Signatures');

      for (const s of signers) {
        // Kept whole: a signature block split across a page break reads as two half-signed
        // parties, which is exactly the ambiguity this document exists to remove.
        room(96);
        const top = doc.y;
        doc.save().strokeColor(RULE).lineWidth(0.7)
          .rect(MARGIN, top, CONTENT_W, 88).stroke().restore();

        const parsed = parseSignature(s.signature);
        const markX = MARGIN + 14;
        const markY = top + 12;
        if (parsed && parsed.kind === 'drawn') {
          drawSignaturePath(doc, parsed.d, parsed.width, parsed.height, markX, markY, 200, 44);
        } else if (parsed && parsed.kind === 'typed') {
          doc.font('Helvetica-Oblique').fontSize(17).fillColor(INK)
            .text(pdfSafe(parsed.text), markX, markY + 14, { width: 200, lineBreak: false });
        } else {
          doc.font('Helvetica').fontSize(9).fillColor(MUTED)
            .text('No signature recorded', markX, markY + 18, { width: 200 });
        }
        doc.save().strokeColor(RULE).lineWidth(0.7)
          .moveTo(markX, top + 62).lineTo(markX + 200, top + 62).stroke().restore();

        const infoX = MARGIN + 240;
        const infoW = CONTENT_W - 254;
        doc.font('Helvetica-Bold').fontSize(11).fillColor(INK)
          .text(pdfSafe(s.name), infoX, top + 12, { width: infoW });
        doc.font('Helvetica').fontSize(9).fillColor(MUTED)
          .text(pdfSafe(s.role), infoX, doc.y, { width: infoW })
          .text(pdfSafe(s.email), infoX, doc.y, { width: infoW });
        doc.fillColor(INK).fontSize(9).text(
          s.signedAt ? pdfSafe(stampLocal(s.signedAt, timezone, locale)) : 'Not signed',
          infoX, doc.y + 2, { width: infoW },
        );

        doc.y = top + 88;
        doc.moveDown(0.6);
        doc.fillColor(INK);
      }

      // ── Audit trail ───────────────────────────────────────────────────────
      //
      // The part that is normally left out. Without it this is a formatted document rather
      // than a record: "signed" with no when, no where and no how is a claim, not evidence.
      doc.moveDown(0.4);
      rule();
      heading('Signing audit trail');
      doc.font('Helvetica').fontSize(8.5).fillColor(MUTED);
      room(24);
      doc.text(
        pdfSafe('Times are shown in the studio timezone (' + (timezone || 'UTC')
          + ') with the UTC instant beside them.'),
        MARGIN, doc.y, { width: CONTENT_W },
      );
      doc.moveDown(0.5);

      for (const s of signers) {
        room(64);
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK)
          .text(pdfSafe(s.name + ' (' + s.email + ')'), MARGIN, doc.y, { width: CONTENT_W });
        doc.font('Helvetica').fontSize(8.5).fillColor(MUTED);
        const rows: Array<[string, string]> = [
          ['Signed', s.signedAt
            ? stampLocal(s.signedAt, timezone, locale) + '  ·  ' + stampUtc(s.signedAt)
            : 'Not signed'],
          ['IP address', s.signedIp || 'Not recorded'],
          ['Device / browser', s.signedUserAgent || 'Not recorded'],
        ];
        for (const row of rows) {
          const value = pdfSafe(row[1]);
          room(doc.heightOfString(value, { width: CONTENT_W - 116 }) + 3);
          const at = doc.y;
          doc.fillColor(MUTED).text(pdfSafe(row[0]), MARGIN + 10, at, { width: 100 });
          doc.fillColor(INK).text(value, MARGIN + 116, at, { width: CONTENT_W - 116 });
        }
        doc.moveDown(0.6);
      }

      // ── Integrity ─────────────────────────────────────────────────────────
      doc.moveDown(0.2);
      rule();
      heading('Document integrity');
      doc.font('Helvetica').fontSize(8.5);
      const trail: Array<[string, string]> = [
        ['Contract reference', String(contract.id || '')],
        ['Created', stampLocal(contract.createdAt, timezone, locale) + '  ·  ' + stampUtc(contract.createdAt)],
        ['Sent to sign', stampLocal(contract.sentAt, timezone, locale) + '  ·  ' + stampUtc(contract.sentAt)],
        ['First opened', contract.viewedAt
          ? stampLocal(contract.viewedAt, timezone, locale) + '  ·  ' + stampUtc(contract.viewedAt)
          : 'Not recorded'],
        ['Fully executed', stampLocal(contract.signedAt, timezone, locale) + '  ·  ' + stampUtc(contract.signedAt)],
        ['SHA-256 of the agreed text', bodyFingerprint(contract.body)],
      ];
      for (const row of trail) {
        const value = pdfSafe(row[1]).trim();
        if (!value || value === '·') continue;
        room(doc.heightOfString(value, { width: CONTENT_W - 176 }) + 3);
        const at = doc.y;
        doc.fillColor(MUTED).text(pdfSafe(row[0]), MARGIN, at, { width: 170 });
        doc.fillColor(INK).text(value, MARGIN + 176, at, { width: CONTENT_W - 176 });
      }

      // ── Footers ───────────────────────────────────────────────────────────
      const range = doc.bufferedPageRange();
      for (let p = 0; p < range.count; p++) {
        doc.switchToPage(range.start + p);
        // PDFKit adds a page when text crosses the bottom margin, and writing a footer at
        // the very foot does exactly that — an endless tail of blank pages, each of which
        // then wants its own footer. Dropping the bottom margin for the duration is the
        // documented way round it.
        const keep = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(
          pdfSafe((studio.name || 'Contract') + '  ·  ' + contract.title
            + '  ·  page ' + (p + 1) + ' of ' + range.count),
          MARGIN, PAGE_H - MARGIN + 4, { width: CONTENT_W, align: 'center', lineBreak: false },
        );
        doc.page.margins.bottom = keep;
      }

      doc.end();
    } catch (e) {
      if (!settled) { settled = true; reject(e); }
    }
  });
}
