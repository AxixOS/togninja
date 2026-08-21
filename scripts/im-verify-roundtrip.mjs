// Prove the metadata is IN THE FILE by reading it back, never by trusting the write.
//
// This exists because exiftool.write() returned "1 image files updated" while silently
// discarding every GPS tag — the -n flag rejects the alphabetic refs — and the code threw
// the result away, so the product claimed location metadata it had never written for as
// long as the feature has shipped.
import sharp from 'sharp';
import { exiftool } from 'exiftool-vendored';
// tsx will not serve a NAMED esm import from a .ts module; a dynamic import works.
const { writeIptc } = await import('../server/services/blogImageAnalysis.ts');
import { mkdtemp, writeFile, unlink, rmdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const FULL = {
  caption: 'Runners crossing the finish line at a city marathon',
  keywords: ['marathon', 'running', 'finish line', 'crowd'],
  creator: 'Sports Action Photo',
  copyright: '© 2026 Sports Action Photo',
  credit: 'Sports Action Photo',
  location: 'Hove',
  sublocation: 'Hove Lawns',
  country: 'United Kingdom',
  aiGenerated: true,
  gps: { lat: 50.8281228, lng: -0.1674798 },
};

const read = async (buf, ext) => {
  const dir = await mkdtemp(join(tmpdir(), 'rt-'));
  const f = join(dir, `x.${ext}`);
  await writeFile(f, buf);
  try { return await exiftool.read(f); }
  finally { await unlink(f).catch(()=>{}); await rmdir(dir).catch(()=>{}); }
};

let fails = 0;
const check = (label, ok, detail) => {
  if (!ok) fails++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
};

// A 1200x800 (3:2) JPEG, the shape a real photo arrives in.
const jpeg = await sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 90, g: 120, b: 160 } } }).jpeg().toBuffer();

console.log('\n=== JPEG: full identity ===');
const outJ = await writeIptc(jpeg, FULL);
const tJ = await read(outJ, 'jpg');

check('IPTC:Caption-Abstract', tJ['Caption-Abstract'] === FULL.caption, String(tJ['Caption-Abstract']).slice(0,44));
check('IPTC:By-line',          tJ['By-line'] === FULL.creator, String(tJ['By-line']));
check('IPTC:CopyrightNotice',  tJ.CopyrightNotice === FULL.copyright, String(tJ.CopyrightNotice));
check('  (c) survived as ©',   String(tJ.CopyrightNotice || '').includes('©'), 'sharp mangles this to (C) on the EXIF path');
check('IPTC:Credit',           tJ.Credit === FULL.credit, String(tJ.Credit));
check('IPTC:City',             tJ.City === FULL.location, String(tJ.City));
check('IPTC:Sub-location',     tJ['Sub-location'] === FULL.sublocation, String(tJ['Sub-location']));
check('IPTC:Country',          tJ['Country-PrimaryLocationName'] === FULL.country, String(tJ['Country-PrimaryLocationName']));
const kw = [].concat(tJ.Keywords || []);
check('IPTC:Keywords (4)',     FULL.keywords.every(k => kw.includes(k)), kw.join('|'));
check('XMP-dc:Creator',        tJ.Creator === FULL.creator || [].concat(tJ.Creator||[]).includes(FULL.creator), String(tJ.Creator));
check('XMP-dc:Rights',         String(tJ.Rights || '').includes('Sports Action Photo'), String(tJ.Rights));
check('XMP DigitalSourceType', String(tJ.DigitalSourceType || '').includes('trainedAlgorithmicMedia'), String(tJ.DigitalSourceType));

// THE BUG THIS SCRIPT EXISTS FOR.
const lat = Number(tJ.GPSLatitude), lng = Number(tJ.GPSLongitude);
check('GPSLatitude present',   Number.isFinite(lat), String(tJ.GPSLatitude));
check('GPSLatitude ~= 50.828', Math.abs(Math.abs(lat) - 50.8281228) < 0.001, String(lat));
check('GPSLongitude ~= -0.167',Math.abs(Math.abs(lng) - 0.1674798) < 0.001, String(lng));
check('GPS ref W (negative)',  String(tJ.GPSLongitudeRef || '').toUpperCase().startsWith('W'), String(tJ.GPSLongitudeRef));

console.log('\n=== JPEG: EMPTY identity — the negative case ===');
// A studio that supplied nothing must get NO tags, not another studio's.
const outE = await writeIptc(jpeg, { caption: '', keywords: [] });
const tE = await read(outE, 'jpg');
check('no By-line invented',   !tE['By-line'], String(tE['By-line'] ?? '(absent)'));
check('no CopyrightNotice',    !tE.CopyrightNotice, String(tE.CopyrightNotice ?? '(absent)'));
check('no City claimed',       !tE.City, String(tE.City ?? '(absent)'));
check('no Credit invented',    !tE.Credit, String(tE.Credit ?? '(absent)'));

console.log('\n=== WebP: XMP only (IPTC IIM is JPEG/TIFF) ===');
const webp = await sharp(jpeg).webp().toBuffer();
const outW = await writeIptc(webp, FULL);
const tW = await read(outW, 'webp');
check('XMP-dc:Description',    String(tW.Description || '').includes('marathon'), String(tW.Description).slice(0,44));
check('XMP-dc:Rights',         String(tW.Rights || '').includes('Sports Action Photo'), String(tW.Rights));

await exiftool.end();
console.log(`\n  ${fails === 0 ? 'ALL CHECKS PASSED' : fails + ' CHECK(S) FAILED'}\n`);
process.exit(fails ? 1 : 0);
