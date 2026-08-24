// Does an image survive this product intact, from upload to the client's hard drive?
//
// Three defects, one pipeline.
//
// 1. METADATA. /api/proxy-image did .rotate().resize().jpeg() and sharp drops EXIF, XMP,
//    IPTC and ICC by default. That route is not only a display path — a client saving a
//    picture out of a gallery saves what it returns. On a real file from this studio the
//    photographer's EXIF (164B), their XMP carrying the ShootCleaner rating and colour
//    label (4761B), their IPTC copyright/byline/caption (488B) and the ICC profile (496B)
//    were all erased at the moment of delivery. Stripping saved 6KB on a 121KB file, of
//    which 5.9KB WAS the metadata — there was never a payload win to trade against.
//
// 2. PROVIDER DRIFT. getS3Config() refreshes in the background: past its 60s TTL it fires
//    refreshStorageConfig() without awaiting and returns the OLD object, and the refresh
//    REPLACES the module config on a later tick. The upload handler resolved it six times
//    across two awaited round-trips, so the PUT and the URL builder could land on
//    different providers. This studio's voucher originals went to their old Supabase
//    bucket while Backblaze URLs were written to the database. Both 404'd from birth.
//
// 3. KEY vs BYTES. The key took its extension from the source filename while the bytes
//    were re-encoded to WebP, so the bucket filled with `.jpg` keys holding image/webp.
//    Browsers sniff and cope; every read path that rebuilds a key by convention does not.
//
// The metadata section is a REAL test — it runs sharp and parses the output — because a
// grep for ".keepMetadata()" would pass against code that called it on the wrong builder.
//
// Run: node scripts/gal-verify-image-pipeline.mjs
import fs from 'fs';
import sharp from 'sharp';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const read = (p) => fs.readFileSync(p, 'utf8');
// A fixed character window swept in neighbouring handlers and produced three false
// failures on correct code. Bound the block at the handler's own closing brace.
const handler = (src, marker) => {
  const a = src.indexOf(marker);
  if (a < 0) return '';
  const b = src.indexOf(eolOf(src) + '  });', a);
  return b < 0 ? src.slice(a) : src.slice(a, b);
};
const eolOf = (s) => (s.includes('\r\n') ? '\r\n' : '\n');
// Comments here necessarily quote the code they replaced; matching those is the false
// positive this repo's guards keep producing.
const code = (s) => s.split('\n').filter((l) => {
  const t = l.trim();
  return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
}).join('\n');

const routes = read('server/routes.ts');
const files = read('server/routes/files.ts');
const snapshot = read('server/lib/storage-snapshot.ts');

// ── 1. Metadata, measured ────────────────────────────────────────────────────
console.log('\n=== a re-encode keeps what the photographer put in the file ===');

/** The metadata segments actually present in a JPEG. */
function jpegMeta(buf) {
  const out = {};
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return out;
  let p = 2;
  while (p < buf.length - 1) {
    if (buf[p] !== 0xff) { p++; continue; }
    const m = buf[p + 1];
    if (m === 0xff) { p++; continue; }
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { p += 2; continue; }
    if (m === 0xd9 || m === 0xda) break;
    const len = buf.readUInt16BE(p + 2);
    const body = buf.slice(p + 4, p + 2 + len);
    const head = body.slice(0, 32).toString('latin1');
    if (head.startsWith('Exif\0')) out.EXIF = len;
    else if (head.startsWith('http://ns.adobe.com/xap/1.0/')) { out.XMP = len; out._xmp = body.toString('utf8'); }
    else if (head.startsWith('Photoshop 3.0\0')) out.IPTC = len;
    else if (head.startsWith('ICC_PROFILE')) out.ICC = len;
    p += 2 + len;
  }
  return out;
}

// A synthetic file carrying all four blocks. Built here rather than committed so the test
// needs no fixture — and built via sharp so it is a genuinely valid JPEG.
const XMP =
  '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>' +
  '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
  '<rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/" ' +
  'xmp:Rating="4" xmp:Label="Yellow" xmp:CreatorTool="ShootCleaner"/>' +
  '</rdf:RDF></x:xmpmeta><?xpacket end="w"?>';

const seed = await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 90, g: 110, b: 130 } } })
  .withMetadata({ exif: { IFD0: { Copyright: '© 2026 A Photographer', Artist: 'A Photographer' } }, icc: 'srgb' })
  .withXmp(XMP)
  .jpeg()
  .toBuffer()
  .catch(async () => sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 90, g: 110, b: 130 } } })
    .withMetadata({ exif: { IFD0: { Copyright: '© 2026 A Photographer' } }, icc: 'srgb' }).jpeg().toBuffer());

const before = jpegMeta(seed);
check('the fixture carries EXIF', !!before.EXIF, `${before.EXIF || 0}B`);
check('the fixture carries an ICC profile', !!before.ICC, `${before.ICC || 0}B`);
const hasXmpSupport = !!before.XMP;
if (hasXmpSupport) check('the fixture carries XMP with a rating', /xmp:Rating="4"/.test(before._xmp || ''));

// The exact chain /api/proxy-image runs, with the fix.
const fixed = await sharp(seed).rotate().keepMetadata().resize({ width: 200, withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();
const after = jpegMeta(fixed);
check('EXIF survives the proxy re-encode', !!after.EXIF, `${before.EXIF || 0}B -> ${after.EXIF || 0}B`);
check('the ICC profile survives', !!after.ICC, `${before.ICC || 0}B -> ${after.ICC || 0}B`);
if (hasXmpSupport) {
  check('XMP survives', !!after.XMP, `${before.XMP || 0}B -> ${after.XMP || 0}B`);
  check('the rating inside it survives', /xmp:Rating="4"/.test(after._xmp || ''));
  check('the colour label survives', /xmp:Label="Yellow"/.test(after._xmp || ''));
}

// And prove the OLD chain really did lose it, so this test would have caught the bug.
const oldWay = await sharp(seed).rotate().resize({ width: 200, withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();
const lost = jpegMeta(oldWay);
check('the old chain demonstrably lost it (so this test can fail)',
  !lost.EXIF && !lost.ICC && !lost.XMP,
  `old kept EXIF:${lost.EXIF ? 'Y' : '-'} ICC:${lost.ICC ? 'Y' : '-'} XMP:${lost.XMP ? 'Y' : '-'}`);

console.log('\n=== and the route that serves it asks for that ===');
// Scoped to the proxy handler, not the whole file: several other handlers legitimately
// strip (a 200px thumbnail, a customer-uploaded photo where dropping GPS is the point).
const proxyBlock = code(handler(routes, 'app.get("/api/proxy-image"'));
check('the proxy handler exists', proxyBlock.length > 0);
check('it keeps metadata', /\.keepMetadata\(\)/.test(proxyBlock));
// A derivative of an already-stamped image. Stamping again would overwrite a
// Copyright the photographer set in their own editor. The handler's comment says so,
// which is exactly why this must run on comment-stripped code.
check('it does not re-stamp copyright over the photographer\'s own',
  !/withMetadata\(studioImageMetadata\(\)\)/.test(proxyBlock));

console.log('\n=== a thumbnail keeps its colour profile, not its whole payload ===');
// 6KB of XMP on a 5KB thumbnail is all cost; a colour shift between the grid and the
// full image is not.
check('the file-upload thumbnail keeps ICC', /\.keepIccProfile\(\)/.test(files));

// ── 2. One provider per request ──────────────────────────────────────────────
console.log('\n=== an upload talks to ONE storage provider from start to finish ===');
check('a snapshot helper exists', /export function getStorageSnapshot/.test(snapshot));
const snapCode = code(snapshot);
check('it reads the config exactly once',
  (snapCode.match(/getS3Config\(\)/g) || []).length === 1,
  `${(snapCode.match(/getS3Config\(\)/g) || []).length} call(s) in code, ${(snapshot.match(/getS3Config\(\)/g) || []).length - (snapCode.match(/getS3Config\(\)/g) || []).length} mention(s) in comments`);
check('the client is built from that same read', /client: new S3Client\(\{/.test(snapshot));

const upStart = files.indexOf("router.post('/upload'");
const upBlock = upStart < 0 ? files : files.slice(upStart, files.indexOf('router.', upStart + 10) > 0 ? files.indexOf("router.get('/:id/download'", upStart) : files.length);
const upCode = code(upBlock);
check('the upload handler takes a snapshot', /const snap = getStorageSnapshot\(\)/.test(upCode));
// The whole point: no per-operation re-resolution anywhere after the snapshot.
const drift = (upCode.match(/getS3Config\(\)/g) || []).length + (upCode.match(/getS3Client\(\)/g) || []).length;
check('it never re-resolves the config mid-request', drift === 0, `${drift} stray resolution(s)`);
check('the URL comes from the write, not from a second lookup',
  /const fileUrl = stored\.url/.test(upCode) && !/const fileUrl = buildB2Url/.test(upCode));
const verifiedPuts = (upCode.match(/putObjectVerified\(snap, \{/g) || []).length;
check('both the original and its thumbnail go through that one snapshot',
  verifiedPuts === 2, `${verifiedPuts} verified put(s)`);
check('the thumbnail key is the _thumb derivative', /_thumb\.webp`/.test(upCode));
check('no raw PutObjectCommand bypasses the verification', !/new PutObjectCommand\(/.test(upCode));

console.log('\n=== a PUT that did not land is not reported as success ===');
check('writes are verified', /export async function putObjectVerified/.test(snapshot));
check('it heads the object back', /HeadObjectCommand/.test(snapshot));
check('a genuine 404 throws rather than returning a URL', /Refusing to record a URL that would 404/.test(snapshot));
check('a truncated write throws', /refusing to record its URL/.test(snapshot));
// A HeadObject that fails for an unrelated reason proves nothing — failing the upload
// then would break studios whose key can write but not head.
check('an unrelated head failure does NOT fail the upload', /Trusting the PUT/.test(snapshot));

// ── 3. The key describes the bytes ───────────────────────────────────────────
console.log('\n=== the object key describes the bytes, not the file the studio picked ===');
check('a mime-to-extension helper exists', /export function extensionForImageMime/.test(snapshot));
check('webp maps to .webp', /case 'image\/webp': return '\.webp'/.test(snapshot));
check('the upload names the key from the output mime',
  /extensionForImageMime\(processedMime\)/.test(upCode));
check('the key is built AFTER the conversion',
  upCode.indexOf('processedMime = ') < upCode.indexOf('extensionForImageMime(processedMime)'));
const voucherUp = routes.indexOf('"/api/admin/vouchers/products/upload-image"');
const voucherBlock = voucherUp < 0 ? '' : routes.slice(voucherUp, voucherUp + 4000);
check('the voucher upload endpoint exists', voucherBlock.length > 0);
check('it snapshots before any await', /^  app\.post\("\/api\/admin\/vouchers\/products\/upload-image"[\s\S]{0,200}const snap = getStorageSnapshot\(\)/m.test(routes));
check('it names its key from the output mime too', /extensionForImageMime\(mime\)/.test(voucherBlock));
check('it verifies both writes', (voucherBlock.match(/putObjectVerified\(snap/g) || []).length >= 2);
check('it does NOT alias a failed thumbnail to the full-size original',
  /thumbnailUrl: string \| null = null/.test(voucherBlock));

console.log('\n=== the admin the studio clicks actually posts there ===');
const v3 = read('client/src/pages/admin/AdminVoucherSalesPageV3.tsx');
check('the live voucher admin uploads to the voucher endpoint',
  /fetch\('\/api\/admin\/vouchers\/products\/upload-image'/.test(v3));
check('it no longer uses the drifting generic uploader for product images',
  !/folderName', 'Voucher Products'/.test(code(v3)));

// ── 4. A broken URL looks like a missing picture, not a broken layout ────────
console.log('\n=== a URL that 404s degrades to a placeholder ===');
check('the admin has a fallback component', /const ImageWithFallback/.test(v3));
check('it walks every candidate before giving up', /setFailed\(\(n\) => n \+ 1\)/.test(v3));
check('it resets when the product changes', /React\.useEffect\(\(\) => \{ setFailed\(0\); \}, \[key\]\)/.test(v3));
check('the old display:none hack is gone',
  !/style\.display = 'none'/.test(code(v3)));
check('the list tries the thumbnail before the full original',
  /const imageSources = \[overrideImage, thumb, imgUrl\]/.test(v3));

console.log('\n=== the repair for rows already written ===');
const repair = 'scripts/gal-repair-voucher-images.ts';
check('a repair script exists', fs.existsSync(repair));
if (fs.existsSync(repair)) {
  const r = read(repair);
  check('it is report-only by default', /const APPLY = process\.argv\.includes\('--apply'\)/.test(r));
  check('it never deletes anything', !/DeleteObjectCommand|DELETE FROM/.test(code(r)));
  // studio_integrations holds only the CURRENT provider; a migration overwrites it. The
  // provider an orphaned object went to may survive only in other rows' URLs.
  check('it learns old providers from URLs already in the database', /learned from/.test(r));
  check('it tries both URL styles rather than guessing', /generate BOTH readings/.test(r));
}

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED\n`
  : '\n  ALL CHECKS PASSED — the bytes land where the URL says, and arrive with the metadata they left with\n');
process.exit(bad ? 1 : 0);
