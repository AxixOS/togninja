// Fill a contract template's merge fields from real studio and client data.
//
// A contract template is prose with placeholders — the Pixieset reference shows
// [Final Due Date], [City Name], [State/Country], [$XXXX] — and the whole feature turns on
// substituting them correctly. Get this wrong and a studio sends a client a legal document
// with [XXXXX] where the fee should be, or worse, the previous client's name.
//
// Shared between client and server on purpose: the editor previews with exactly the same
// function the server uses when the contract is sent, so what a photographer approves is
// what their client receives. Two implementations would drift, and this is the one place
// in the product where drift is a legal problem rather than a cosmetic one.
//
// DESIGN NOTES, all of them learned from things that went wrong elsewhere in this codebase:
//
//  - An unknown placeholder is NEVER silently blanked. It is returned in `missing` so the
//    UI can refuse to send. Blanking would turn "the retainer is [Retainer Amount]" into
//    "the retainer is ", which reads as a completed sentence and is not one.
//  - Substitution is single-pass. A value that itself contains something looking like a
//    placeholder must not be re-expanded — otherwise a client called "[Client Name]" (or a
//    malicious one) could inject fields.
//  - Values are escaped for HTML by default, because templates are rich text.
//  - And escaped for the OTHER grammar the merged body is read with. The send gate re-scans
//    an already-merged contract for tokens that survived, so a value carrying brackets —
//    "Meet at the north gate [not the main car park]" — would be read back as a field the
//    template never contained and the contract refused for ever. See escapeHtml().

export interface MergeField {
  /** The token as it appears in the template, without brackets. */
  key: string;
  label: string;
  /** Where the value comes from, for the UI to explain itself. */
  source: 'studio' | 'client' | 'session' | 'money' | 'date' | 'manual';
}

/** The fields a template may reference. Anything else is an error, not a blank. */
export const MERGE_FIELDS: MergeField[] = [
  { key: 'Studio Name', label: 'Your studio name', source: 'studio' },
  { key: 'Studio Email', label: 'Your email', source: 'studio' },
  { key: 'Studio Phone', label: 'Your phone', source: 'studio' },
  { key: 'Studio Address', label: 'Your address', source: 'studio' },
  { key: 'City Name', label: 'Your city', source: 'studio' },
  { key: 'State/Country', label: 'Your country', source: 'studio' },
  { key: 'Client Name', label: "Client's full name", source: 'client' },
  { key: 'Client Email', label: "Client's email", source: 'client' },
  { key: 'Client Phone', label: "Client's phone", source: 'client' },
  { key: 'Session Date', label: 'Date of the shoot', source: 'session' },
  { key: 'Session Type', label: 'Kind of session', source: 'session' },
  { key: 'Session Location', label: 'Where the shoot happens', source: 'session' },
  { key: 'Total Fee', label: 'Total fee', source: 'money' },
  { key: 'Retainer Amount', label: 'Deposit / retainer', source: 'money' },
  { key: 'Balance Amount', label: 'Remaining balance', source: 'money' },
  { key: 'Final Due Date', label: 'When the balance is due', source: 'date' },
  { key: 'Today', label: "Today's date", source: 'date' },
];

const KEYS = new Set(MERGE_FIELDS.map((f) => f.key));

/** Matches [Anything In Brackets] — the token shape the reference templates use. */
const TOKEN = /\[([^\][\n]{1,60})\]/g;

/**
 * Render a merged VALUE so it is inert in the document it lands in.
 *
 * & < > " are escaped because a contract body is HTML. [ and ] are escaped for a second
 * reason that is easy to miss: the stored body is read by TWO grammars, not one. HTML is
 * the obvious one. The other is TOKEN above — POST /:id/send and the draft screen run
 * mergeContract() over the ALREADY MERGED body to ask "did any placeholder survive?", and
 * that question is only answerable if every bracket in the body came from the template.
 *
 * A value carrying brackets breaks that premise, and the damage is permanent rather than
 * cosmetic: contracts.body is a snapshot that is never re-rendered, so a draft merged from
 * a location like "Meet at the north gate [not the main car park]" is refused with "this
 * template uses a field that does not exist" and cannot be repaired from any screen. The
 * studio has to delete it and start again. Free text reaches every non-studio field here —
 * a client named "Studio 7 [Vienna] GmbH" is enough.
 *
 * Numeric character references, so both renderers still show a literal bracket: the
 * browser decodes them in sanitizeContractHtml's DOMParser pass, and the PDF decodes them
 * in contractPdf's entityChar(). & is replaced FIRST, so a value that literally contains
 * the text "&#91;" becomes "&amp;#91;" and reads back as itself rather than as a bracket.
 *
 * NOT applied on the escape:false path. That output is plain text for a subject line,
 * nothing re-scans it, and entities there would be shown to a person verbatim.
 */
const escapeHtml = (v: string) =>
  v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\[/g, '&#91;')
    .replace(/\]/g, '&#93;');

export interface MergeResult {
  /** The template with every KNOWN field substituted. */
  text: string;
  /** Fields the template used that are not in MERGE_FIELDS at all — a template bug. */
  unknown: string[];
  /** Known fields with no value for this contract — a data gap, block sending. */
  missing: string[];
  /** Fields that were substituted, for the UI to highlight. */
  filled: string[];
}

/**
 * Substitute merge fields.
 *
 * `values` is keyed by the field key exactly as it appears in MERGE_FIELDS.
 * Pass `escape: false` only for plain-text output such as an email subject.
 */
export function mergeContract(
  template: string,
  values: Record<string, string | null | undefined>,
  opts: { escape?: boolean } = {},
): MergeResult {
  const escape = opts.escape !== false;
  const unknown: string[] = [];
  const missing: string[] = [];
  const filled: string[] = [];

  // One pass with a replacer: a substituted value is never itself re-scanned, so a client
  // whose name contains brackets cannot inject another field.
  const text = String(template || '').replace(TOKEN, (whole, rawKey: string) => {
    const key = rawKey.trim();

    if (!KEYS.has(key)) {
      // Left in place deliberately. A template referencing a field that does not exist is
      // a mistake in the template, and hiding it makes it permanent.
      if (!unknown.includes(key)) unknown.push(key);
      return whole;
    }

    const value = values[key];
    if (value === undefined || value === null || String(value).trim() === '') {
      if (!missing.includes(key)) missing.push(key);
      return whole;
    }

    if (!filled.includes(key)) filled.push(key);
    const out = String(value);
    return escape ? escapeHtml(out) : out;
  });

  return { text, unknown, missing, filled };
}

/** Is this contract safe to send? */
export function canSend(result: MergeResult): { ok: boolean; reason?: string } {
  if (result.unknown.length) {
    return {
      ok: false,
      reason: `This template uses ${result.unknown.length === 1 ? 'a field that does not exist' : 'fields that do not exist'}: ${result.unknown.map((k) => `[${k}]`).join(', ')}.`,
    };
  }
  if (result.missing.length) {
    return {
      ok: false,
      reason: `Fill in ${result.missing.map((k) => `[${k}]`).join(', ')} before sending — the contract still shows the placeholder.`,
    };
  }
  return { ok: true };
}

/**
 * The studio's own email address, resolved the SAME way everywhere.
 *
 * studio_configs holds it in two columns. `email` is nullable and stays empty until
 * somebody saves the Studio Customization form; `owner_email` is NOT NULL and is written
 * by the bootstrap insert. So on a fresh instance the only address the studio has is
 * owner_email, and a rule that reads `email` alone resolves to nothing at all there.
 *
 * That rule existed in three versions. GET /api/studio/branding fell back to ownerEmail,
 * the browser's preview used whatever that endpoint handed back, and studioValues() in
 * server/routes/contracts.ts did not fall back. The preview therefore filled
 * [Studio Email] and told the studio every field was filled, while the sender stored a
 * body with the placeholder still in it and then refused the send — naming a field the
 * studio could see was filled, on a snapshot they could not repair.
 *
 * They are not two addresses; they are one address and one blank. So this is not a
 * reconciliation, it is the single chain, and all three call it.
 *
 * Takes snake_case pg rows and camelCase JSON alike, because the server reads the row and
 * the browser reads the endpoint. Whitespace is not an address: '   ' resolves to '',
 * which is what mergeContract() would call missing anyway — checking it here means the
 * preview and the sender agree about that case too.
 */
export function resolveStudioEmail(
  source:
    | { email?: string | null; ownerEmail?: string | null; owner_email?: string | null }
    | null
    | undefined,
): string {
  // Guarded here rather than trusted from the type: strictNullChecks is off in this repo,
  // so `source` being null is not something the signature prevents.
  const s: any = source || {};
  const trim = (v: unknown) => (v == null ? '' : String(v).trim());
  // DELIBERATELY not falling back to ownerEmail/owner_email. Those columns hold a
  // bootstrap placeholder ('admin@localhost', 'setup@togninja.com') on every instance
  // that has not been through technical setup, and the one writer that sets a real
  // owner_email sets `email` alongside it — so a fallback can only ever substitute a
  // placeholder. Returning blank keeps the send GATE closed, which is what makes the
  // studio go and enter a real address instead of signing a contract that names one
  // nobody can reach.
  return trim(s.email);
}

/** Which merge fields does this template actually use? For the editor's field list. */
export function fieldsUsed(template: string): string[] {
  const out: string[] = [];
  for (const m of String(template || '').matchAll(TOKEN)) {
    const key = m[1].trim();
    if (!out.includes(key)) out.push(key);
  }
  return out;
}
