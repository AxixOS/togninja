/**
 * Invisible forensic watermark (blind, JPEG-robust).
 *
 * Encodes a small payload (e.g. a gallery fingerprint) into an image so a leaked
 * copy can be traced back — even after JPEG re-encoding, resizing or a screenshot.
 * It does NOT claim to survive adversarial AI regeneration (no classic watermark
 * does); it is a forensic trace for ordinary leaks.
 *
 * Method: quantization index modulation (QIM) on block means. The luminance is
 * divided into a grid of blocks; each block's mean is quantized to the nearest
 * multiple of a step Q whose PARITY encodes one payload bit. JPEG preserves block
 * means (the DC term) to within a fraction of Q, so the parity survives. Each bit
 * is embedded redundantly across many blocks (key-shuffled assignment) and read by
 * majority vote. This is blind (no original needed) and, unlike a differential
 * scheme, is immune to smooth image gradients. The payload carries a checksum so a
 * failed/absent watermark reads as "none" rather than a false id.
 */

// Deterministic PRNG (mulberry32) so embed + extract agree without Math.random.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRID = 24;          // 24x24 = 576 blocks (~18/bit). Larger blocks average
                          // over more pixels, so their means survive downscaling.
const STEP = 22;          // QIM quantization step (luminance levels)
const PAYLOAD_BITS = 32;  // 24-bit value + 8-bit checksum

// Key-shuffled block order so each payload bit's redundant copies are scattered
// across the whole image (survives crops / local edits better).
function blockOrder(key: number): number[] {
  const idx = Array.from({ length: GRID * GRID }, (_, i) => i);
  const rnd = mulberry32(key || 1);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

interface Grid { blockMeanLum: Float64Array; bx: number; by: number; bw: number; bh: number; }

function computeBlockMeans(data: Buffer, width: number, height: number, channels: number): Grid {
  const bw = Math.floor(width / GRID), bh = Math.floor(height / GRID);
  const blockMeanLum = new Float64Array(GRID * GRID);
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      let sum = 0, n = 0;
      const x0 = gx * bw, y0 = gy * bh;
      for (let y = y0; y < y0 + bh; y++) {
        let p = (y * width + x0) * channels;
        for (let x = x0; x < x0 + bw; x++) {
          sum += lum(data[p], data[p + 1], data[p + 2]); n++; p += channels;
        }
      }
      blockMeanLum[gy * GRID + gx] = n ? sum / n : 0;
    }
  }
  return { blockMeanLum, bx: GRID, by: GRID, bw, bh };
}

function addToBlock(data: Buffer, width: number, channels: number, gx: number, gy: number, bw: number, bh: number, delta: number) {
  const x0 = gx * bw, y0 = gy * bh;
  for (let y = y0; y < y0 + bh; y++) {
    let p = (y * width + x0) * channels;
    for (let x = x0; x < x0 + bw; x++) {
      data[p] = Math.max(0, Math.min(255, data[p] + delta));
      data[p + 1] = Math.max(0, Math.min(255, data[p + 1] + delta));
      data[p + 2] = Math.max(0, Math.min(255, data[p + 2] + delta));
      p += channels;
    }
  }
}

function payloadToBits(value: number): number[] {
  const v = value >>> 0;
  const bits: number[] = [];
  // 24-bit value
  for (let i = 23; i >= 0; i--) bits.push((v >>> i) & 1);
  // 8-bit checksum (sum of the 3 payload bytes)
  const checksum = (((v >>> 16) & 0xff) + ((v >>> 8) & 0xff) + (v & 0xff)) & 0xff;
  for (let i = 7; i >= 0; i--) bits.push((checksum >>> i) & 1);
  return bits; // length 32
}

/** Embed a 24-bit payload into raw RGB(A) pixels in place (QIM on block means). */
export function embedInvisible(data: Buffer, width: number, height: number, channels: number, value: number, key: number): void {
  if (width < GRID * 4 || height < GRID * 4) return; // too small to be robust
  const bits = payloadToBits(value);
  const grid = computeBlockMeans(data, width, height, channels);
  const order = blockOrder(key);
  for (let n = 0; n < order.length; n++) {
    const blk = order[n];
    const bit = bits[n % PAYLOAD_BITS];
    const m = grid.blockMeanLum[blk];
    // Nearest quantization index whose parity == bit → target mean = q*STEP.
    let q = Math.round(m / STEP);
    if ((q & 1) !== bit) {
      const up = q + 1, down = q - 1;
      q = Math.abs(up * STEP - m) <= Math.abs(down * STEP - m) ? up : down;
    }
    const delta = q * STEP - m;
    if (delta === 0) continue;
    addToBlock(data, width, channels, blk % GRID, Math.floor(blk / GRID), grid.bw, grid.bh, delta);
  }
}

/** Extract a 24-bit payload; returns null if the checksum fails (no watermark). */
export function extractInvisible(data: Buffer, width: number, height: number, channels: number, key: number): number | null {
  if (width < GRID * 4 || height < GRID * 4) return null;
  const grid = computeBlockMeans(data, width, height, channels);
  const order = blockOrder(key);
  const acc = new Float64Array(PAYLOAD_BITS);
  for (let n = 0; n < order.length; n++) {
    const q = Math.round(grid.blockMeanLum[order[n]] / STEP);
    acc[n % PAYLOAD_BITS] += (q & 1) ? 1 : -1;
  }
  const bits = Array.from(acc, (v) => (v > 0 ? 1 : 0));
  let value = 0;
  for (let i = 0; i < 24; i++) value = (value << 1) | bits[i];
  let checksum = 0;
  for (let i = 24; i < 32; i++) checksum = (checksum << 1) | bits[i];
  const expected = (((value >>> 16) & 0xff) + ((value >>> 8) & 0xff) + (value & 0xff)) & 0xff;
  return checksum === expected ? (value >>> 0) : null;
}

export const INVISIBLE_PAYLOAD_MAX = 0xffffff; // 24-bit

/** Derive a stable 24-bit fingerprint from a gallery id (or any string). */
export function fingerprint(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) & INVISIBLE_PAYLOAD_MAX;
}
