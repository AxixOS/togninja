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
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises';
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
  location?: string;         // City (e.g. Wien)
  sublocation?: string;      // Sub-location (e.g. Margareten)
  country?: string;          // Country (e.g. Österreich)
  creator?: string;
  copyright?: string;
  credit?: string;
  aiGenerated?: boolean;     // mark AI-assisted metadata for transparency
  gps?: { lat: number; lng: number } | null; // EXIF GPS — JPEG only (WebP drops it)
}

const STUDIO = {
  creator: 'New Age Fotografie',
  copyright: '© New Age Fotografie, Wien',
  credit: 'New Age Fotografie',
};

// New Age Fotografie studio — Wehrgasse, 1050 Wien-Margareten.
export const STUDIO_GPS = { lat: 48.1939, lng: 16.3577 };
export const STUDIO_CITY = 'Wien';
export const STUDIO_SUBLOCATION = 'Margareten';

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
export async function analyzeVision(imageUrl: string, hint?: string): Promise<VisionResult> {
  const sys = [
    'Du bist ein Bildredakteur für ein Wiener Portraitfotostudio.',
    'Beschreibe NUR, was sichtbar ist. Erfinde KEINE Namen, Anlässe oder Orte.',
    'Antworte als JSON mit: description (1–2 Sätze, Deutsch), altText (kurz, Deutsch),',
    'sceneKeywords (Array, visuelle Begriffe), mood (z.B. "warm, ruhig"), peopleCount (Zahl).',
  ].join(' ');
  const userText = `Beschreibe dieses Foto für ein Wiener Fotostudio.${hint ? ` Themen-Kontext nur zur Wortwahl (keine Fakten daraus ableiten): ${hint}.` : ''}`;

  const res = await openai().chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
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
    const tags: Record<string, unknown> = {
      'XMP-dc:Description': input.caption,
      'XMP-dc:Subject': input.keywords,
      'XMP-dc:Creator': input.creator ?? STUDIO.creator,
      'XMP-dc:Rights': input.copyright ?? STUDIO.copyright,
      'XMP-photoshop:Credit': input.credit ?? STUDIO.credit,
    };
    // Geo as TEXT (persists across JPEG/WebP/PNG; the SEO-relevant location signal).
    if (input.location) tags['XMP-photoshop:City'] = input.location;
    if (input.sublocation) tags['XMP-iptcCore:Location'] = input.sublocation;
    if (input.country) tags['XMP-photoshop:Country'] = input.country;
    if (input.aiGenerated) tags['XMP-iptcExt:DigitalSourceType'] = 'trainedAlgorithmicMedia';

    // IPTC IIM — JPEG/TIFF only.
    if (ext === 'jpg') {
      tags['IPTC:Caption-Abstract'] = input.caption;
      tags['IPTC:Keywords'] = input.keywords;
      tags['IPTC:By-line'] = input.creator ?? STUDIO.creator;
      tags['IPTC:CopyrightNotice'] = input.copyright ?? STUDIO.copyright;
      tags['IPTC:Credit'] = input.credit ?? STUDIO.credit;
      if (input.location) tags['IPTC:City'] = input.location;
      if (input.sublocation) tags['IPTC:Sub-location'] = input.sublocation;
      if (input.country) tags['IPTC:Country-PrimaryLocationName'] = input.country;
    }
    if (input.gps) {
      // EXIF GPS — persists in JPEG (dropped by WebP).
      tags['GPSLatitude'] = Math.abs(input.gps.lat);
      tags['GPSLatitudeRef'] = input.gps.lat >= 0 ? 'N' : 'S';
      tags['GPSLongitude'] = Math.abs(input.gps.lng);
      tags['GPSLongitudeRef'] = input.gps.lng >= 0 ? 'E' : 'W';
      // XMP GPS — persists in WebP/PNG too (signed decimal with -n).
      tags['XMP-exif:GPSLatitude'] = input.gps.lat;
      tags['XMP-exif:GPSLongitude'] = input.gps.lng;
    }
    await exiftool.write(file, tags as any, { writeArgs: ['-overwrite_original', '-codedcharacterset=utf8', '-n'] });
    return await readFile(file);
  } finally {
    await unlink(file).catch(() => {});
  }
}

/** Build an alt-text fallback from context + vision when the user hasn't set one. */
export function deriveAltText(vision: VisionResult, ctx: BlogContext): string {
  if (vision.altText) return vision.altText;
  const bits = [ctx.people, ctx.celebration, ctx.location].filter(Boolean);
  return bits.length ? bits.join(', ') : (vision.description || 'Foto von New Age Fotografie');
}

/** Tidy shutdown for the ExifTool child process (call on server shutdown). */
export async function endExifTool(): Promise<void> {
  try { await exiftool.end(); } catch { /* noop */ }
}
