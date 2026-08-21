/**
 * Gallery watermarking (in-house, sharp-based).
 *
 * The visible watermark is a semi-transparent studio name repeated on a diagonal
 * grid across the WHOLE image. Full-coverage (rather than a single corner logo)
 * is deliberate: it can't be cropped off and is expensive for AI inpainting to
 * cleanly remove without degrading the photo — the practical "AI-resistant" goal.
 *
 * An optional faint forensic tag can be encoded per-recipient later (Phase 2b);
 * this module currently ships the visible layer, which is the real deterrent.
 */
import sharp from 'sharp';
import { mkdtemp, writeFile, readFile, unlink, rmdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { embedInvisible } from './invisibleWatermark';

/**
 * Copy every writable tag from one image buffer onto another.
 *
 * Only needed for the forensic branch below, which round-trips through RAW PIXELS —
 * raw has no container, so there is nothing for sharp to preserve and keepMetadata()
 * cannot help. ExifTool's -tagsFromFile is the one thing that can put IPTC and XMP back.
 * Never throws: a gallery that cannot copy its tags must still serve the picture.
 */
async function copyTags(src: Buffer, dst: Buffer): Promise<Buffer> {
  let dir: string | null = null;
  try {
    const { exiftool } = await import('exiftool-vendored');
    dir = await mkdtemp(join(tmpdir(), 'wm-'));
    const srcFile = join(dir, 'src.jpg');
    const dstFile = join(dir, 'dst.jpg');
    await writeFile(srcFile, src);
    await writeFile(dstFile, dst);
    await exiftool.write(dstFile, {} as any, {
      writeArgs: ['-tagsFromFile', srcFile, '-all:all', '-overwrite_original'],
    });
    return await readFile(dstFile);
  } catch (e: any) {
    console.warn('[gallery-watermark] tag copy failed, serving without metadata:', e?.message || e);
    return dst;
  } finally {
    if (dir) {
      await unlink(join(dir, 'src.jpg')).catch(() => {});
      await unlink(join(dir, 'dst.jpg')).catch(() => {});
      await rmdir(dir).catch(() => {});
    }
  }
}

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function tiledWatermarkSvg(width: number, height: number, text: string): string {
  const label = escapeXml(text.toUpperCase());
  const fontSize = Math.max(16, Math.round(width / 30));
  const stepX = Math.max(120, Math.round(fontSize * label.length * 0.62));
  const stepY = Math.max(90, fontSize * 5);
  let els = '';
  // Over-scan the grid so the −30° rotation still covers the corners.
  for (let y = -height; y < height * 2; y += stepY) {
    for (let x = -width; x < width * 2; x += stepX) {
      els +=
        `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" ` +
        `font-weight="600" letter-spacing="2" fill="#ffffff" fill-opacity="0.20" ` +
        `stroke="#000000" stroke-opacity="0.06" stroke-width="1" ` +
        `transform="rotate(-30 ${x} ${y})">${label}</text>`;
    }
  }
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${els}</svg>`;
}

export interface WatermarkOptions {
  text: string;
  width?: number;             // optional downscale (display/thumb variants)
  watermark: boolean;         // visible tiled mark
  invisiblePayload?: number;  // 24-bit forensic id to embed (invisibleWatermark)
  invisibleKey?: number;      // extraction key
  quality?: number;
}

/**
 * Return a JPEG buffer: EXIF-rotated, optionally downscaled, optionally visibly
 * watermarked, and optionally carrying an invisible forensic id. Never throws for
 * the marking steps — on any error it falls back to the clean image so a gallery
 * never shows broken pictures.
 */
export async function processGalleryImage(input: Buffer, opts: WatermarkOptions): Promise<Buffer> {
  const quality = opts.quality ?? 82;
  // keepMetadata() carries EXIF, ICC, IPTC and XMP through the re-encode. Without it
  // every sharp step here silently dropped the lot — which meant the watermark proxy and
  // the ZIP download handed the client a metadata-free JPEG, destroying the
  // PHOTOGRAPHER'S OWN Lightroom IPTC on the way out. Their copyright, their byline,
  // their caption, gone at the moment of delivery. That is the opposite of what a
  // watermarking feature is for.
  let base = sharp(input).rotate().keepMetadata();
  if (opts.width) base = base.resize({ width: opts.width, withoutEnlargement: true });
  let buf = await base.jpeg({ quality }).toBuffer();

  // 1. Visible tiled watermark.
  if (opts.watermark) {
    try {
      const meta = await sharp(buf).metadata();
      const W = meta.width || opts.width || 1600;
      const H = meta.height || Math.round(W * 0.66);
      const svg = tiledWatermarkSvg(W, H, opts.text || 'PROOF');
      buf = await sharp(buf).keepMetadata().composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).jpeg({ quality }).toBuffer();
    } catch (e: any) {
      console.warn('[gallery-watermark] visible mark failed, serving clean:', e?.message || e);
    }
  }

  // 2. Invisible forensic id — embed LAST so it survives the visible overlay and
  //    the final JPEG. Done on raw pixels then re-encoded.
  if (opts.invisiblePayload != null) {
    try {
      // Raw pixels have no container, so keepMetadata() has nothing to keep here and the
      // tags must be copied back explicitly afterwards.
      const carrier = buf;
      const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
      embedInvisible(data, info.width, info.height, info.channels, opts.invisiblePayload >>> 0, opts.invisibleKey || 1);
      const marked = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).jpeg({ quality }).toBuffer();
      buf = await copyTags(carrier, marked);
    } catch (e: any) {
      console.warn('[gallery-watermark] invisible mark failed, serving without it:', e?.message || e);
    }
  }

  return buf;
}

export function watermarkText(): string {
  // The final fallback was the literal 'NEW AGE FOTOGRAFIE', so any studio whose name
  // had not been hydrated into env delivered its clients' proofs stamped, diagonally,
  // across every photograph, with another studio's name. 'PROOF' says the true thing:
  // this is a proof copy. It never claims authorship.
  return process.env.GALLERY_WATERMARK_TEXT || process.env.STUDIO_NAME || process.env.BUSINESS_NAME || 'PROOF';
}

// Secret key that seeds the invisible watermark's block pairing. Keep it stable
// (and private) so embedded ids remain extractable. Override via env in prod.
export function invisibleKey(): number {
  return parseInt(process.env.GALLERY_INVISIBLE_KEY || '', 10) || 1926437;
}
