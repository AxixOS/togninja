// How a signature is turned into something a text column can hold without losing any of it.
//
// THE CONSTRAINT THIS FILE EXISTS FOR
//
// server/routes/contracts.ts writes the signature as
//
//     String(signature).slice(0, 4000)
//
// contract_signers.signature is an unbounded Postgres `text` column, so that one
// expression is the ONLY narrowing anywhere between the client's fetch() and the stored
// row. It truncates silently: nothing errors, nothing warns, and the row simply holds a
// prefix of what was sent.
//
// A drawn signature exported the obvious way, canvas.toDataURL('image/png'), is 5-30KB.
// Every one of them would be cut at character 4000, and 4000 characters of a base64 PNG is
// not a damaged image, it is not an image at all: the browser renders a broken-image icon
// where the client's signature should be. On a legal document that is worse than having no
// drawing, because the studio then has a row that says "signed" and a rendering that says
// nothing, and neither party finds out until it matters.
//
// THE DECISION
//
// Store the drawing as an SVG PATH rather than a raster, and make the encoder structurally
// incapable of exceeding the cap.
//
// A signature is a handful of strokes, and a stroke is a polyline. Written as integer
// coordinates in a fixed 600x200 box, a real signature is 400-1500 characters, one to two
// orders of magnitude smaller than the same mark as a PNG, and it stays sharp at any size
// because it is still geometry. The encoder simplifies (Ramer-Douglas-Peucker, escalating
// tolerance) until the result fits MAX_DRAWN_SIGNATURE_CHARS, and returns null rather than
// an over-budget string if it cannot. The caller's only two outcomes are therefore "a value
// that provably survives storage" and "no value, ask the person to sign again" - never a
// value that is about to be cut in half.
//
// Typed signatures are stored as the plain text that was typed, capped far below the same
// limit. That keeps the rows written by scripts/gal-verify-contracts.ts ('Studio',
// 'Jane Doe') valid, and it is what parseSignature() falls back to.
//
// The budget is set BELOW the server cap on purpose. The invariant this module promises is
// that encoded === encoded.slice(0, SERVER_SIGNATURE_CAP), and an invariant balanced on the
// exact boundary flips the first time anyone adds a few characters to the prefix. Verified
// by scripts/ui-verify-contract-sign.mjs, which reads the real slice() literal out of the
// route rather than trusting the number written here.

/** One sampled point of a stroke, in the SIGNATURE_BOX coordinate space. */
export interface SignaturePoint {
  x: number;
  y: number;
}

/** One continuous pen-down..pen-up gesture. */
export type SignatureStroke = SignaturePoint[];

/**
 * The coordinate space a drawn signature is encoded in. Fixed, and independent of the
 * canvas the person actually signed on, so the same mark encodes identically on a phone
 * and on a desktop and re-renders at any size.
 *
 * Three digits per axis is what keeps one point down to "123,45 " - seven characters.
 */
export const SIGNATURE_BOX = { width: 600, height: 200 };

/**
 * What server/routes/contracts.ts truncates to. Duplicated here because the encoder has to
 * know it; kept honest by the guard, which reads the route's own literal and fails if the
 * two ever disagree.
 */
export const SERVER_SIGNATURE_CAP = 4000;

/** The most an encoded drawing may be. Deliberately clear of the cap - see the header. */
export const MAX_DRAWN_SIGNATURE_CHARS = 3000;

/** A typed name. Long enough for any real name, nowhere near the cap. */
export const MAX_TYPED_SIGNATURE_CHARS = 120;

/** Marks a stored value as geometry rather than a typed name. */
export const DRAWN_SIGNATURE_PREFIX = 'svgpath:';

/**
 * The exact shape encodeDrawnSignature emits, and the only shape that may reach an SVG
 * `d` attribute.
 *
 * Digits, commas, spaces and 'M'. Nothing else can get through, so a stored value cannot
 * carry markup, a URL or an entity into the renderer no matter how it got into the row.
 * Each repetition is anchored on a character the others cannot start with ('M' for the
 * outer group, a space for the inner one), so this cannot backtrack.
 */
const DRAWN_RE = /^svgpath:(\d{1,4})x(\d{1,4}):((?:M\d{1,4},\d{1,4}(?: \d{1,4},\d{1,4})*)+)$/;

/**
 * Tolerances tried in order, in box units. The first that fits wins, so an ordinary
 * signature is encoded at full fidelity and only a pathologically detailed one is degraded
 * - and degradation drops POINTS, which costs smoothness, rather than dropping a TAIL,
 * which costs half the name.
 */
const TOLERANCES = [1, 1.6, 2.4, 3.4, 4.8, 6.5, 9, 13, 18, 25, 34];

/**
 * Above this many raw points the input is thinned uniformly before simplifying. RDP is
 * O(n^2) in the worst case and this runs on a phone at the end of every stroke; 1500 points
 * is already far more than a hand can produce inside a 600x200 box at the capture spacing.
 */
const PRE_THIN_LIMIT = 1500;

const clampRound = (v: number, max: number): number => {
  if (!Number.isFinite(v)) return 0;
  const r = Math.round(v);
  return r < 0 ? 0 : r > max ? max : r;
};

/** Distance from p to the infinite line through a and b. */
function lineDistance(p: SignaturePoint, a: SignaturePoint, b: SignaturePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Ramer-Douglas-Peucker, iterative.
 *
 * Iterative rather than recursive: the worst case for the recursive form is a recursion
 * depth equal to the point count, so a long stroke would overflow the stack on exactly the
 * input this most needs to survive.
 */
function simplify(points: SignatureStroke, tolerance: number): SignatureStroke {
  if (points.length < 3) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: number[][] = [[0, points.length - 1]];
  while (stack.length) {
    const range = stack.pop() as number[];
    const first = range[0];
    const last = range[1];
    let worst = -1;
    let at = -1;
    for (let i = first + 1; i < last; i++) {
      const d = lineDistance(points[i], points[first], points[last]);
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (at > 0 && worst > tolerance) {
      keep[at] = 1;
      stack.push([first, at], [at, last]);
    }
  }
  const out: SignatureStroke = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

/** Drop consecutive points that round to the same grid cell: 7-8 characters that draw nothing. */
function dedupe(points: SignatureStroke): SignatureStroke {
  const out: SignatureStroke = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && last.x === p.x && last.y === p.y) continue;
    out.push(p);
  }
  return out;
}

function strokeToPath(points: SignatureStroke): string {
  // A lone point is emitted TWICE, as a zero-length line. A path holding only a moveto
  // draws nothing at all, so without this the dot on an 'i' and any deliberate full stop
  // disappear from the signature.
  const pts = points.length === 1 ? [points[0], points[0]] : points;
  let out = 'M';
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) out += ' ';
    out += pts[i].x + ',' + pts[i].y;
  }
  return out;
}

/**
 * Encode strokes as a storable signature value.
 *
 * Returns null when even the coarsest tolerance will not fit, which the caller must treat
 * as "refuse to submit", never as "send it anyway". Returning a too-long string is the one
 * thing this function is written to make impossible.
 */
export function encodeDrawnSignature(
  strokes: SignatureStroke[],
  budget: number = MAX_DRAWN_SIGNATURE_CHARS,
): string | null {
  const prefix = DRAWN_SIGNATURE_PREFIX + SIGNATURE_BOX.width + 'x' + SIGNATURE_BOX.height + ':';

  // Snap to the integer grid first, so everything downstream works in the units the output
  // is actually written in and a tolerance means the same thing as a character cost.
  let grid: SignatureStroke[] = [];
  let total = 0;
  for (const stroke of strokes || []) {
    if (!Array.isArray(stroke) || !stroke.length) continue;
    const snapped = dedupe(
      stroke.map((p) => ({
        x: clampRound(p ? p.x : 0, SIGNATURE_BOX.width),
        y: clampRound(p ? p.y : 0, SIGNATURE_BOX.height),
      })),
    );
    if (!snapped.length) continue;
    grid.push(snapped);
    total += snapped.length;
  }
  if (!grid.length) return null;

  if (total > PRE_THIN_LIMIT) {
    const step = Math.ceil(total / PRE_THIN_LIMIT);
    grid = grid.map((s) => {
      if (s.length <= 2) return s;
      const kept = s.filter((_, i) => i % step === 0);
      const last = s[s.length - 1];
      if (kept[kept.length - 1] !== last) kept.push(last);
      return kept;
    });
  }

  // Escalate on the ALREADY simplified result rather than re-simplifying the raw input.
  // The first pass does nearly all of the reduction and the later passes then run on a few
  // hundred points instead of a few thousand, which is what keeps this cheap enough to run
  // at the end of every stroke - so a person is told their signature is too detailed while
  // they are still drawing it, not when they press Sign.
  let current = grid;
  for (const tolerance of TOLERANCES) {
    current = current.map((s) => dedupe(simplify(s, tolerance))).filter((s) => s.length > 0);
    const encoded = prefix + current.map(strokeToPath).join('');
    if (encoded.length <= budget) return encoded;
  }
  return null;
}

/** Trim a typed signature to something storable. Never near the cap. */
export function sanitizeTypedSignature(raw: string): string {
  return String(raw == null ? '' : raw)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TYPED_SIGNATURE_CHARS);
}

/**
 * Would this typed value be mistaken for geometry? Typing it is not an attack - the grammar
 * admits no markup - but a name that renders back as a scribble is a support call, so the
 * input refuses it rather than storing it.
 */
export function looksLikeEncodedPath(raw: string): boolean {
  return /^\s*svgpath:/i.test(String(raw == null ? '' : raw));
}

export interface ParsedDrawnSignature {
  kind: 'drawn';
  /** Safe to place in an SVG `d` attribute: validated against DRAWN_RE. */
  d: string;
  width: number;
  height: number;
}

export interface ParsedTypedSignature {
  kind: 'typed';
  text: string;
}

export type ParsedSignature = ParsedDrawnSignature | ParsedTypedSignature | null;

/**
 * Read a stored signature back.
 *
 * Anything that does not match the grammar EXACTLY is treated as typed text, so a value
 * that was somehow truncated or corrupted renders as visible characters rather than as a
 * silently blank signature block.
 */
export function parseSignature(stored: string | null | undefined): ParsedSignature {
  const value = String(stored == null ? '' : stored);
  if (!value.trim()) return null;
  const m = DRAWN_RE.exec(value);
  if (m) {
    return {
      kind: 'drawn',
      d: m[3],
      width: Number(m[1]) || SIGNATURE_BOX.width,
      height: Number(m[2]) || SIGNATURE_BOX.height,
    };
  }
  return { kind: 'typed', text: value };
}
