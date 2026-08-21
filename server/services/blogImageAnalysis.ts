// Image analysis for the idea-driven blog pipeline.
//
// Three pure-ish building blocks, composed by the idea endpoints:
//   1. extractExif()   — read camera/lens/time/GPS from the upload buffer (exifr, no binary)
//   2. analyzeVision() — OpenAI gpt-4o describes the scene + suggests alt text & keywords
//   3. writeIptc()     — embed IPTC/XMP (caption, keywords, location, credit, copyright,
//                        AI-provenance) back into the JPEG via ExifTool, returning the
//                        re-encoded buffer so the caller can re-upload it.
//
// Design rule (matches the product spec): Vision supplies *description/texture*;
// the user's context supplies *facts* (names, occasion, location). Never let Vision
// invent names or events — those come from BlogContext only.
import exifr from 'exifr';
import { exiftool } from 'exiftool-vendored';
import { writeFile, readFile, unlink, mkdtemp, rmdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import OpenAI from 'openai';

export interface ImageExif {
  make?: string;
  model?: string;
  lensModel?: string;
  dateTimeOriginal?: string;
  fNumber?: number;
  exposureTime?: number;
  iso?: number;
  focalLength?: number;
  gps?: { lat: number; lng: number } | null;
}

export interface VisionResult {
  description: string;       // 1–2 sentence neutral scene description
  altText: string;           // concise, descriptive alt text (German)
  sceneKeywords: string[];   // visual keywords (objects, setting, light, mood)
  mood: string;              // e.g. "warm, ruhig"
  peopleCount: number;       // rough count, 0 if none/unsure
}

export interface BlogContext {
  location?: string;         // user-entered, authoritative
  timing?: string;           // season / time of day / date
  people?: string;           // names / who is in the photo (user-entered)
  celebration?: string;      // occasion (wedding, birthday, …)
  commentary?: string;       // free-text notes from the photographer
}

export interface IptcInput {
  caption: string;
  keywords: string[];
  location?: string;         // Locality where the photo was taken, e.g. Hove
  sublocation?: string;      // Finer place within it, e.g. a venue or park
  country?: string;          // Country (e.g. Österreich)
  creator?: string;
  copyright?: string;
  credit?: string;
  aiGenerated?: boolean;     // mark AI-assisted metadata for transparency
  gps?: { lat: number; lng: number } | null; // EXIF GPS — JPEG only (WebP drops it)
}

// The origin studio's identity used to live here as four constants — creator,
// copyright, GPS (Wehrgasse, 1050 Wien-Margareten), city and sublocation — and every
// tag below fell back to them with ??. So an absent value did not mean "write no tag",
// it meant "write New Age Fotografie". Resolved per tenant now; see
// server/lib/studioImageIdentity.ts. Nothing replaces them here: a missing field must
// produce a missing tag, because a wrong stamp travels with the file for ever.

let _openai: OpenAI | null = null;
function openai(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-not-configured' });
  return _openai;
}

/** Read the camera/EXIF fields we care about from an image buffer. Never throws. */
export async function extractExif(buffer: Buffer): Promise<ImageExif> {
  try {
    const d: any = await exifr.parse(buffer, {
      tiff: true, exif: true, gps: true,
      pick: ['Make', 'Model', 'LensModel', 'DateTimeOriginal', 'FNumber',
             'ExposureTime', 'ISO', 'ISOSpeedRatings', 'FocalLength',
             'latitude', 'longitude'],
    }) || {};
    const lat = typeof d.latitude === 'number' ? d.latitude : undefined;
    const lng = typeof d.longitude === 'number' ? d.longitude : undefined;
    return {
      make: d.Make,
      model: d.Model,
      lensModel: d.LensModel,
      dateTimeOriginal: d.DateTimeOriginal ? new Date(d.DateTimeOriginal).toISOString() : undefined,
      fNumber: typeof d.FNumber === 'number' ? d.FNumber : undefined,
      exposureTime: typeof d.ExposureTime === 'number' ? d.ExposureTime : undefined,
      iso: d.ISO ?? d.ISOSpeedRatings,
      focalLength: typeof d.FocalLength === 'number' ? d.FocalLength : undefined,
      gps: lat != null && lng != null ? { lat, lng } : null,
    };
  } catch {
    return { gps: null };
  }
}

/**
 * Describe an image with gpt-4o. Returns neutral description + alt text + visual
 * keywords. Strictly forbidden from inventing names/occasions/places — those are
 * the user's job. `hint` (the article title/keyword) only steers vocabulary.
 */
/**
 * One prompt per language. The system message was German and opened "Du bist ein
 * Bildredakteur für ein Wiener Portraitfotostudio", so an English-language sports
 * photographer's images came back described in German by a portrait editor. The
 * language follows the studio's own site_language; the NICHE comes from its authority
 * map, so a cycling photograph is described with cycling vocabulary rather than
 * reaching for portrait language.
 */
const VISION_PROMPTS: Record<string, (niche: string) => { sys: string; ask: (hint?: string) => string }> = {
  en: (niche) => ({
    sys: [
      `You are a photo editor for ${niche}.`,
      'Describe ONLY what is visible. Invent NO names, occasions or places.',
      'Reply as JSON with: description (1-2 sentences, English), altText (short, English),',
      'sceneKeywords (array of visual terms), mood (e.g. "warm, calm"), peopleCount (number).',
    ].join(' '),
    ask: (hint) => `Describe this photograph.${hint ? ` Topic context, for word choice only — derive no facts from it: ${hint}.` : ''}`,
  }),
  de: (niche) => ({
    sys: [
      `Du bist ein Bildredakteur für ${niche}.`,
      'Beschreibe NUR, was sichtbar ist. Erfinde KEINE Namen, Anlässe oder Orte.',
      'Antworte als JSON mit: description (1–2 Sätze, Deutsch), altText (kurz, Deutsch),',
      'sceneKeywords (Array, visuelle Begriffe), mood (z.B. "warm, ruhig"), peopleCount (Zahl).',
    ].join(' '),
    ask: (hint) => `Beschreibe dieses Foto.${hint ? ` Themen-Kontext nur zur Wortwahl (keine Fakten daraus ableiten): ${hint}.` : ''}`,
  }),
  fr: (niche) => ({
    sys: [
      `Vous êtes iconographe pour ${niche}.`,
      'Décrivez UNIQUEMENT ce qui est visible. Aucun nom, aucune occasion, aucun lieu inventé.',
      'Répondez en JSON avec : description (1-2 phrases, français), altText (court, français),',
      'sceneKeywords (tableau de termes visuels), mood (ex. "chaleureux, calme"), peopleCount (nombre).',
    ].join(' '),
    ask: (hint) => `Décrivez cette photographie.${hint ? ` Contexte thématique, pour le vocabulaire seulement : ${hint}.` : ''}`,
  }),
  es: (niche) => ({
    sys: [
      `Eres editor de fotografía para ${niche}.`,
      'Describe SOLO lo que es visible. No inventes nombres, ocasiones ni lugares.',
      'Responde en JSON con: description (1-2 frases, español), altText (breve, español),',
      'sceneKeywords (array de términos visuales), mood (p.ej. "cálido, tranquilo"), peopleCount (número).',
    ].join(' '),
    ask: (hint) => `Describe esta fotografía.${hint ? ` Contexto temático, solo para el vocabulario: ${hint}.` : ''}`,
  }),
};

export async function analyzeVision(imageUrl: string, hint?: string): Promise<VisionResult> {
  const { getImageIdentity } = await import('../lib/studioImageIdentity');
  const { getSiteLanguage } = await import('../lib/site-language');
  const identity = await getImageIdentity().catch(() => ({} as any));
  const lang = String(await getSiteLanguage().catch(() => 'en') || 'en').slice(0, 2).toLowerCase();

  // The studio's own pillars, so the model reaches for the right vocabulary. Falls back
  // to a neutral description of the trade rather than to anyone's speciality.
  const niche = identity.services?.length
    ? `a photography studio specialising in ${identity.services.slice(0, 6).join(', ')}`
    : 'a photography studio';

  const build = VISION_PROMPTS[lang] || VISION_PROMPTS.en;
  const { sys, ask } = build(niche);
  const userText = ask(hint);

  const res = await openai().chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    // No cap was set. The API default is the model's full 16,384 output tokens, so one
    // pathological image could bill $0.16 on its own. A description and a keyword list
    // fit comfortably in 400.
    max_tokens: 400,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: [
        { type: 'text', text: userText },
        { type: 'image_url', image_url: { url: imageUrl } },
      ] as any },
    ],
  });

  const raw = res.choices[0]?.message?.content || '{}';
  let parsed: any = {};
  try { parsed = JSON.parse(raw); } catch { /* keep defaults */ }
  return {
    description: String(parsed.description || ''),
    altText: String(parsed.altText || ''),
    sceneKeywords: Array.isArray(parsed.sceneKeywords) ? parsed.sceneKeywords.map(String) : [],
    mood: String(parsed.mood || ''),
    peopleCount: Number.isFinite(parsed.peopleCount) ? Number(parsed.peopleCount) : 0,
  };
}

export interface ExistingIptc {
  caption?: string;
  byline?: string;
  copyright?: string;
  keywords?: string[];
}

/**
 * What the photographer already put in the file.
 *
 * Needed before writing anything into a CLIENT GALLERY image. Those arrive straight from
 * Lightroom with the photographer's own caption, byline and keywords already embedded,
 * and overwriting a caption someone wrote by hand with one derived from a gallery title
 * would be vandalism. Read first, fill only the gaps.
 *
 * Uses exifr, which parses in-process — no ExifTool child, so it is cheap enough to run
 * on every image of a two-thousand-frame wedding gallery. Never throws.
 */
export async function readExistingIptc(buffer: Buffer): Promise<ExistingIptc> {
  // XMP language-alternative fields (dc:description, dc:rights) come back from exifr as
  // an OBJECT — { 'x-default': '…' } or { value, lang } — not a string. Left uncoerced,
  // a real caption reads as "[object Object]", which is truthy, so the gap-filling test
  // "does this file already have a caption?" answers yes for the wrong reason and the
  // right reason alike. Flatten to text before anything decides on it.
  const text = (v: any): string | undefined => {
    if (v == null) return undefined;
    if (typeof v === 'string') return v.trim() || undefined;
    if (Array.isArray(v)) return text(v[0]);
    if (typeof v === 'object') {
      const inner = v['x-default'] ?? v.value ?? v._ ?? Object.values(v)[0];
      return typeof inner === 'string' ? (inner.trim() || undefined) : undefined;
    }
    return String(v).trim() || undefined;
  };

  try {
    const d: any = await exifr.parse(buffer, { iptc: true, xmp: true, tiff: false, exif: false }) || {};
    const kw = d.Keywords ?? d.subject;
    return {
      caption: text(d['Caption-Abstract']) || text(d.ObjectName) || text(d.description) || text(d.Description),
      byline: text(d['By-line']) || text(d.creator) || text(d.Creator),
      copyright: text(d.CopyrightNotice) || text(d.rights) || text(d.Rights),
      keywords: Array.isArray(kw) ? kw.map(String) : (kw ? [String(kw)] : undefined),
    };
  } catch {
    return {};
  }
}

/** Sniff image format from magic bytes (files are often mis-named .jpg). */
export function sniffImageExt(b: Buffer): 'jpg' | 'webp' | 'png' {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  return 'jpg';
}

export function contentTypeFor(ext: 'jpg' | 'webp' | 'png'): string {
  return ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg';
}

/**
 * Embed metadata via ExifTool and return the new buffer. Format-aware: IPTC IIM
 * tags only work in JPEG/TIFF, so WebP/PNG get XMP (+ GPS) equivalents — which
 * Google Images reads too. Writes caption, keywords, location, creator/
 * copyright/credit, optional GPS and an AI-provenance hint.
 */
export async function writeIptc(buffer: Buffer, input: IptcInput): Promise<Buffer> {
  const ext = sniffImageExt(buffer);
  const dir = await mkdtemp(join(tmpdir(), 'iptc-'));
  const file = join(dir, `image.${ext}`);
  await writeFile(file, buffer);
  try {
    // XMP — universal across JPEG / WebP / PNG.
    // Every tag is conditional. The previous version wrote
    //   'XMP-dc:Creator': input.creator ?? STUDIO.creator
    // so a tenant supplying no creator got the origin studio's name embedded in their
    // photograph. An absent value must produce an absent tag.
    const tags: Record<string, unknown> = {};
    if (input.caption) tags['XMP-dc:Description'] = input.caption;
    if (input.keywords?.length) tags['XMP-dc:Subject'] = input.keywords;
    if (input.creator) tags['XMP-dc:Creator'] = input.creator;
    if (input.copyright) tags['XMP-dc:Rights'] = input.copyright;
    if (input.credit) tags['XMP-photoshop:Credit'] = input.credit;
    // Geo as TEXT (persists across JPEG/WebP/PNG; the SEO-relevant location signal).
    if (input.location) tags['XMP-photoshop:City'] = input.location;
    if (input.sublocation) tags['XMP-iptcCore:Location'] = input.sublocation;
    if (input.country) tags['XMP-photoshop:Country'] = input.country;
    if (input.aiGenerated) tags['XMP-iptcExt:DigitalSourceType'] = 'trainedAlgorithmicMedia';

    // IPTC IIM — JPEG/TIFF only.
    if (ext === 'jpg') {
      if (input.caption) tags['IPTC:Caption-Abstract'] = input.caption;
      if (input.keywords?.length) tags['IPTC:Keywords'] = input.keywords;
      if (input.creator) tags['IPTC:By-line'] = input.creator;
      if (input.copyright) tags['IPTC:CopyrightNotice'] = input.copyright;
      if (input.credit) tags['IPTC:Credit'] = input.credit;
      if (input.location) tags['IPTC:City'] = input.location;
      if (input.sublocation) tags['IPTC:Sub-location'] = input.sublocation;
      if (input.country) tags['IPTC:Country-PrimaryLocationName'] = input.country;
    }
    if (input.gps) {
      // GROUP PREFIXES ARE LOAD-BEARING. Written unprefixed, 'GPSLongitude' is ambiguous
      // between EXIF and XMP-exif; ExifTool resolved it against both and the signed XMP
      // value fought the abs-plus-ref EXIF pair, so a Hove photograph (-0.167) came back
      // as +0.167 E — the right number in the wrong hemisphere, 23km out in the Channel
      // on the far side of the meridian. Wrong coordinates are worse than none: they are
      // confidently, silently incorrect and they travel with the file.
      // EXIF stores magnitude plus a hemisphere ref; XMP stores a signed decimal.
      tags['EXIF:GPSLatitude'] = Math.abs(input.gps.lat);
      tags['EXIF:GPSLatitudeRef'] = input.gps.lat >= 0 ? 'N' : 'S';
      tags['EXIF:GPSLongitude'] = Math.abs(input.gps.lng);
      tags['EXIF:GPSLongitudeRef'] = input.gps.lng >= 0 ? 'E' : 'W';
      // XMP GPS — persists in WebP/PNG too, where EXIF GPS does not.
      tags['XMP-exif:GPSLatitude'] = input.gps.lat;
      tags['XMP-exif:GPSLongitude'] = input.gps.lng;
    }
    // -n was on this call. In numeric mode ExifTool rejects the alphabetic GPS refs
    // ('N'/'S'/'E'/'W'), so every GPS tag was silently discarded — while write() still
    // reported "1 image files updated" and its result was thrown away, so nothing could
    // notice. The product has been claiming location metadata it never wrote. Dropped
    // -n and pass decimal degrees, which ExifTool accepts in normal mode.
    const result = await exiftool.write(file, tags as any, {
      writeArgs: ['-overwrite_original', '-codedcharacterset=utf8'],
    });
    // Keep the result. Discarding it is how the GPS bug survived.
    if ((result as any)?.warnings?.length) {
      console.warn('[iptc] exiftool warnings:', (result as any).warnings.slice(0, 5).join(' | '));
    }
    return await readFile(file);
  } finally {
    // The file was unlinked but its mkdtemp directory never was — one empty directory
    // per image, for ever. At gallery scale that is tens of thousands of inodes.
    await unlink(file).catch(() => {});
    await rmdir(dir).catch(() => {});
  }
}

/** Build an alt-text fallback from context + vision when the user hasn't set one. */
export function deriveAltText(vision: VisionResult, ctx: BlogContext): string {
  if (vision.altText) return vision.altText;
  const bits = [ctx.people, ctx.celebration, ctx.location].filter(Boolean);
  // Was 'Foto von New Age Fotografie'. Beyond naming the wrong studio, "Photo by X" is
  // worse than nothing as alt text — it describes the credit, not the picture, so a
  // screen-reader user learns nothing. Empty is honest; the caller can prompt for one.
  return bits.length ? bits.join(', ') : (vision.description || '');
}

/** Tidy shutdown for the ExifTool child process (call on server shutdown). */
export async function endExifTool(): Promise<void> {
  try { await exiftool.end(); } catch { /* noop */ }
}
