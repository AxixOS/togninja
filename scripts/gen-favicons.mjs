// Regenerate the TogNinja icon set from client/public/favicon.svg.
//
// WHY THIS SCRIPT EXISTS AT ALL, rather than four checked-in binaries:
// every raster icon in client/public/ shipped as a horizontal SLIVER —
// favicon.ico declared 16x5, favicon-16x16.png was really 16x5,
// favicon-32x32.png was 32x10 and apple-touch-icon.png was 180x55. All four are
// ~3.2:1, the aspect of togninja-logo.svg (200x60): somebody resized the WIDE
// wordmark to the target WIDTH and let the height fall where it may. Every icon
// a browser could pick rendered as a blank smear, and nobody could tell, because
// a binary asset with no generator is a file you can only replace, never audit.
// Keep this script. If the mark changes, re-run it; do not hand-edit the PNGs.
//
// Two things here are load-bearing and easy to get wrong again:
//
//   1. SQUARE PADDING. The artwork inside favicon.svg is 25x17 units in a 32x32
//      viewBox — wider than tall AND sitting low in the box. Resizing to a target
//      WIDTH reproduces the exact sliver bug being fixed. Everything goes through
//      squareIcon(), which trims to the real ink bounds and then contains it in a
//      square canvas, so aspect can never leak into the output dimensions.
//
//   2. DENSITY. sharp rasterises an SVG at its intrinsic size (32x32) unless you
//      raise `density`. Without it, icon-512.png would be a 32px bitmap scaled up
//      16x — technically 512x512, visibly mush. We rasterise once at 1024 and
//      downsample from that.
//
// sharp cannot write .ico, so the container is assembled by hand below. It is a
// trivial format and every browser since IE11 reads PNG-compressed entries.
//
// Run: node scripts/gen-favicons.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'client', 'public');
const SOURCE = path.join(PUBLIC, 'favicon.svg');

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
// apple-touch-icon only: iOS DISCARDS the alpha channel and composites whatever
// is left onto black, so a transparent one renders as a black tile with a dark
// smudge. Every other output keeps its transparency.
const IOS_BACKDROP = { r: 255, g: 255, b: 255, alpha: 1 };

/** One high-resolution rasterisation of the mark, reused for every output size. */
async function rasterise() {
  const svg = fs.readFileSync(SOURCE);
  // 2304 dpi = 72 * (1024 / 32): the 32-unit viewBox lands on a 1024px bitmap.
  const full = await sharp(svg, { density: 2304 })
    .resize(1024, 1024, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer();

  // Crop to the ink. The mark occupies the lower ~55% of its own viewBox, so
  // without this every icon wastes half its pixels on empty space above the
  // camera — which at 16px is the difference between a readable glyph and a dot.
  let art = full;
  try {
    const trimmed = await sharp(full).trim({ threshold: 1 }).toBuffer();
    const meta = await sharp(trimmed).metadata();
    // A source that rendered blank would trim to nothing; keep the uncropped
    // bitmap rather than emitting a 1x1 icon and calling it a success.
    if ((meta.width || 0) >= 16 && (meta.height || 0) >= 16) art = trimmed;
  } catch {
    /* trim unavailable for this input — the untrimmed raster is still square-safe */
  }
  return art;
}

/**
 * Contain `art` in a size x size canvas with a proportional margin.
 * fit:'contain' is what guarantees the output is square whatever the input
 * aspect is — the defect this whole file exists to prevent.
 */
async function squareIcon(art, size, background = TRANSPARENT) {
  const pad = Math.round(size * 0.04);
  const inner = Math.max(1, size - pad * 2);
  const contained = await sharp(art)
    .resize(inner, inner, { fit: 'contain', background: TRANSPARENT })
    .toBuffer();
  return sharp(contained)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background })
    .flatten(background.alpha === 1 ? { background } : false)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Width/height as the PNG itself declares them, read straight out of the IHDR. */
function pngSize(buf) {
  if (buf.length < 24 || buf.toString('latin1', 1, 4) !== 'PNG') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/**
 * ICONDIR + one ICONDIRENTRY per image + the PNG payloads verbatim.
 * A dimension of 0 in an ICONDIRENTRY means 256, which is why 256 is the cap.
 */
function buildIco(entries) {
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0);              // reserved
  dir.writeUInt16LE(1, 2);              // type 1 = icon
  dir.writeUInt16LE(entries.length, 4); // count

  const table = Buffer.alloc(16 * entries.length);
  let offset = dir.length + table.length;
  entries.forEach((e, i) => {
    const o = i * 16;
    if (e.size > 256) throw new Error(`ICO entries cannot exceed 256px (got ${e.size})`);
    table[o] = e.size === 256 ? 0 : e.size;     // width  (0 means 256)
    table[o + 1] = e.size === 256 ? 0 : e.size; // height
    table[o + 2] = 0;                           // palette size, 0 for truecolour
    table[o + 3] = 0;                           // reserved
    table.writeUInt16LE(1, o + 4);              // colour planes
    table.writeUInt16LE(32, o + 6);             // bits per pixel
    table.writeUInt32LE(e.png.length, o + 8);   // byte length of the payload
    table.writeUInt32LE(offset, o + 12);        // absolute offset of the payload
    offset += e.png.length;
  });

  return Buffer.concat([dir, table, ...entries.map((e) => e.png)]);
}

/**
 * Parse the .ico back and cross-check every entry's DECLARED size against the
 * PNG header inside it. The file being replaced passed nobody's check, which is
 * the only reason a 16x5 icon survived in the repo for months — so the generator
 * refuses to leave a bad one behind even if the encoder above is wrong.
 */
function assertIco(buf, expectedSizes) {
  if (buf.readUInt16LE(0) !== 0) throw new Error('ICONDIR reserved field is not 0');
  if (buf.readUInt16LE(2) !== 1) throw new Error('ICONDIR type is not 1 (icon)');
  const count = buf.readUInt16LE(4);
  if (count !== expectedSizes.length) {
    throw new Error(`ICONDIR count ${count}, expected ${expectedSizes.length}`);
  }
  expectedSizes.forEach((size, i) => {
    const o = 6 + i * 16;
    const declaredW = buf[o] === 0 ? 256 : buf[o];
    const declaredH = buf[o + 1] === 0 ? 256 : buf[o + 1];
    const length = buf.readUInt32LE(o + 8);
    const start = buf.readUInt32LE(o + 12);
    if (declaredW !== size || declaredH !== size) {
      throw new Error(`entry ${i} declares ${declaredW}x${declaredH}, expected ${size}x${size}`);
    }
    if (start + length > buf.length) throw new Error(`entry ${i} payload runs past EOF`);
    const actual = pngSize(buf.subarray(start, start + length));
    if (!actual) throw new Error(`entry ${i} payload is not a PNG`);
    if (actual.width !== size || actual.height !== size) {
      throw new Error(`entry ${i} PNG is ${actual.width}x${actual.height}, declared ${size}x${size}`);
    }
  });
}

async function main() {
  if (!fs.existsSync(SOURCE)) throw new Error(`missing source artwork: ${SOURCE}`);
  const art = await rasterise();

  // The named PNGs. brand-icon.png is the STATIC fallback for the /brand-icon.png
  // route (server/routes/site-icons.ts): if that route is not mounted the head's
  // link must still resolve to a real icon rather than falling through to the
  // SPA catch-all and handing the browser index.html as an image.
  const files = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'apple-touch-icon.png', size: 180, background: IOS_BACKDROP },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'brand-icon.png', size: 192 },
  ];

  for (const f of files) {
    const png = await squareIcon(art, f.size, f.background || TRANSPARENT);
    const got = pngSize(png);
    if (!got || got.width !== f.size || got.height !== f.size) {
      throw new Error(`${f.name} came out ${got?.width}x${got?.height}, expected ${f.size}x${f.size}`);
    }
    fs.writeFileSync(path.join(PUBLIC, f.name), png);
    console.log(`  wrote client/public/${f.name}  ${f.size}x${f.size}  ${png.length} bytes`);
  }

  // 16/32/48 covers the tab strip, the bookmark bar and Windows' shortcut/jump-list
  // sizes. Anything bigger belongs in the PNG links and the manifest, not the ICO.
  const icoSizes = [16, 32, 48];
  const entries = [];
  for (const size of icoSizes) {
    entries.push({ size, png: await squareIcon(art, size) });
  }
  const ico = buildIco(entries);
  assertIco(ico, icoSizes);
  fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), ico);
  console.log(`  wrote client/public/favicon.ico  ${icoSizes.join('/')}  ${ico.length} bytes  (verified by re-parse)`);
}

main().catch((err) => {
  console.error(`\n  gen-favicons FAILED: ${err.message}\n`);
  process.exit(1);
});
