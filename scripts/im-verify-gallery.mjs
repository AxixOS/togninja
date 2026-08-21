// A client's download must not destroy the photographer's own metadata.
//
// processGalleryImage() re-encodes up to three times and preserved nothing, so the
// watermark proxy and the ZIP download stripped every tag the photographer had set in
// Lightroom — their copyright, byline and caption, deleted at the moment of delivery.
// This proves the tags survive each path, by reading the delivered bytes back.
import sharp from 'sharp';
import { exiftool } from 'exiftool-vendored';
import { mkdtemp, writeFile, unlink, rmdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
const { processGalleryImage } = await import('../server/lib/galleryWatermark.ts');
const { writeIptc } = await import('../server/services/blogImageAnalysis.ts');

const read = async (buf) => {
  const dir = await mkdtemp(join(tmpdir(), 'gv-'));
  const f = join(dir, 'x.jpg');
  await writeFile(f, buf);
  try { return await exiftool.read(f); }
  finally { await unlink(f).catch(()=>{}); await rmdir(dir).catch(()=>{}); }
};

let fails = 0;
const check = (label, ok, detail) => { if (!ok) fails++; console.log(`  ${ok?'PASS':'FAIL'}  ${label}${detail?'  '+detail:''}`); };

// A photograph as it arrives from the photographer: their own IPTC already embedded.
const plain = await sharp({ create:{ width:1400, height:933, channels:3, background:{r:70,g:100,b:140} } }).jpeg().toBuffer();
const original = await writeIptc(plain, {
  caption: 'Bride and groom on the steps',
  keywords: ['wedding', 'ceremony'],
  creator: 'Klickermann Photography',
  copyright: '© 2026 Klickermann Photography',
  credit: 'Klickermann Photography',
  location: 'Wien',
});
const before = await read(original);
check('fixture has the photographer IPTC', before['By-line'] === 'Klickermann Photography', String(before['By-line']));

console.log('\n=== watermark proxy path (visible mark + downscale) ===');
const proxied = await processGalleryImage(original, { text: 'PROOF', watermark: true, width: 1200 });
const p1 = await read(proxied);
check('By-line survives',      p1['By-line'] === 'Klickermann Photography', String(p1['By-line'] ?? '(GONE)'));
check('CopyrightNotice survives', String(p1.CopyrightNotice||'').includes('Klickermann'), String(p1.CopyrightNotice ?? '(GONE)'));
check('Caption survives',      String(p1['Caption-Abstract']||'').includes('Bride'), String(p1['Caption-Abstract'] ?? '(GONE)'));
check('Keywords survive',      [].concat(p1.Keywords||[]).includes('wedding'), String(p1.Keywords ?? '(GONE)'));
check('was actually resized',  Number(p1.ImageWidth) === 1200, String(p1.ImageWidth));

console.log('\n=== ZIP download path (visible + invisible forensic id, via raw pixels) ===');
const zipped = await processGalleryImage(original, { text: 'PROOF', watermark: true, invisiblePayload: 123456, invisibleKey: 7 });
const p2 = await read(zipped);
check('By-line survives raw round-trip', p2['By-line'] === 'Klickermann Photography', String(p2['By-line'] ?? '(GONE)'));
check('CopyrightNotice survives',        String(p2.CopyrightNotice||'').includes('Klickermann'), String(p2.CopyrightNotice ?? '(GONE)'));
check('Caption survives',                String(p2['Caption-Abstract']||'').includes('Bride'), String(p2['Caption-Abstract'] ?? '(GONE)'));

console.log('\n=== the watermark text no longer names another studio ===');
const { watermarkText } = await import('../server/lib/galleryWatermark.ts');
delete process.env.GALLERY_WATERMARK_TEXT; delete process.env.STUDIO_NAME; delete process.env.BUSINESS_NAME;
check('unset env gives PROOF, not a studio name', watermarkText() === 'PROOF', watermarkText());

await exiftool.end();
console.log(`\n  ${fails===0?'ALL CHECKS PASSED':fails+' CHECK(S) FAILED'}\n`);
process.exit(fails?1:0);
