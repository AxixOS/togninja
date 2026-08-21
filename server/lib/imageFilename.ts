// A filename that says what the photograph is.
//
// Uploads kept whatever the camera called the file:
//   galleries/<id>/1755000000000-DSC_4837.jpg
// and that same string is what the client sees on their own disk, because it becomes the
// entry name inside the ZIP download (server/routes.ts:5838). It is also what Google
// reads: a filename is a real, if minor, image-search signal, and "DSC_4837" is a wasted
// one on every photograph a studio has ever delivered.
//
// ONLY EVER APPLIED TO NEW UPLOADS. Renaming an existing object is the single most
// damaging thing available here: the old key is already embedded in gallery links sent to
// clients, in voucher PDFs, in blog post bodies as literal <img src>, in og:image tags and
// in the sitemap. Changing it 404s all of them at once. There is no backfill and there
// should never be one.

/** Latin-1 and common photographic diacritics to ASCII, so a key is never percent-escaped. */
const TRANSLITERATE: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', å: 'a', æ: 'ae', ø: 'o',
  á: 'a', à: 'a', â: 'a', ã: 'a', é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i', ó: 'o', ò: 'o', ô: 'o', õ: 'o',
  ú: 'u', ù: 'u', û: 'u', ñ: 'n', ç: 'c', ý: 'y',
};

/** Words that describe the filing system rather than the picture. */
const NOISE = new Set([
  'img', 'dsc', 'dscf', 'dscn', 'p', 'pic', 'photo', 'image', 'untitled', 'final',
  'edit', 'edited', 'export', 'exported', 'copy', 'jpg', 'jpeg', 'png', 'webp',
  'raw', 'cr2', 'nef', 'arw', 'small', 'large', 'web', 'hires', 'lowres', 'v1', 'v2',
]);

export function slugify(input: string, maxLen = 60): string {
  const lowered = String(input || '').toLowerCase();
  let out = '';
  for (const ch of lowered) out += TRANSLITERATE[ch] ?? ch;
  return out
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')  // strip any remaining accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/, '');
}

/**
 * Is this name the camera's, or did a human choose it?
 * 'DSC_4837' and 'IMG-20260821-WA0003' are the camera's. 'finish-line' is not.
 */
export function isCameraName(name: string): boolean {
  // Strip the extension first. It was being slugified into the word list, so
  // "DSC_4837.jpg" tested as ["dsc","jpg"] (both noise, correct by luck) while
  // "DSCF0042.jpg" tested as ["dscf0042","jpg"] and read as a human name.
  const stem = String(name || "").replace(/.[a-zA-Z0-9]{1,5}$/, "");
  const base = slugify(stem, 80);
  if (!base) return true;

  // The whole stem as one camera counter, in any of the shapes the makers use:
  // DSC_4837 (Nikon/Sony), P1010101 (Panasonic), DSCF0042 (Fuji), _MG_1234 (Canon),
  // IMG-20260821 (phones). Testing the joined stem catches the ones that split into
  // separate letter and digit tokens, which a word-by-word check never can.
  if (/^[a-z]{1,4}-?[0-9]{3,}$/.test(base)) return true;

  const words = base.split("-").filter((w) => w && !/^[0-9]+$/.test(w));
  if (!words.length) return true;                   // nothing but digits
  return words.every((w) => NOISE.has(w) || /^[a-z]{1,4}[0-9]{3,}$/.test(w));
}

export interface FilenameParts {
  /** What the picture shows — vision alt text, a caption, or a section label. */
  subject?: string;
  /** The service or pillar it belongs to, e.g. 'Cycling Sportives Photography'. */
  service?: string;
  /** Where it was taken. Only pass a real locality. */
  place?: string;
  /** Capture date; year only is enough and dates a photograph usefully. */
  date?: Date | string | null;
  /** The uploaded name, kept only when a human clearly chose it. */
  originalName?: string;
  /** Extension WITHOUT the dot. Sniffed from magic bytes by the caller, not trusted. */
  ext: string;
}

/**
 * Build a descriptive, collision-safe basename.
 *
 *   { subject: 'Runners crossing the finish line', service: 'Marathons Photography',
 *     place: 'Hove', date: 2026, ext: 'jpg' }
 *     -> 'marathons-runners-crossing-the-finish-line-hove-2026-k3f9x2.jpg'
 *
 * The random suffix is not decoration: two files can be uploaded in the same millisecond,
 * and two photographs of the same subject at the same event are the normal case, not the
 * exception. Without it the second silently overwrites the first in object storage.
 */
export function buildImageFilename(parts: FilenameParts): string {
  const bits: string[] = [];

  const service = slugify(parts.service || '', 34).replace(/-?photography$/, '');
  if (service) bits.push(service);

  // Prefer what the picture shows. Fall back to a human-chosen original name; never to
  // the camera's own, which is the thing being replaced.
  const subject = slugify(parts.subject || '', 60);
  if (subject) bits.push(subject);
  else if (parts.originalName && !isCameraName(parts.originalName)) {
    const human = slugify(parts.originalName.replace(/\.[a-z0-9]+$/i, ''), 50);
    if (human) bits.push(human);
  }

  const place = slugify(parts.place || '', 24);
  if (place && !bits.some((b) => b.includes(place))) bits.push(place);

  const d = parts.date ? new Date(parts.date as any) : null;
  if (d && !Number.isNaN(d.getTime())) {
    const year = String(d.getUTCFullYear());
    if (!bits.some((b) => b.includes(year))) bits.push(year);
  }

  // A studio that supplied nothing still gets something better than DSC_4837.
  let stem = bits.join('-').replace(/-{2,}/g, '-').slice(0, 120).replace(/-+$/, '');
  if (!stem) stem = 'photo';

  const suffix = Math.random().toString(36).slice(2, 8);
  const ext = slugify(parts.ext || 'jpg', 5) || 'jpg';
  return `${stem}-${suffix}.${ext}`;
}
