// The filename generator: camera-name detection, transliteration, collision safety.
const { buildImageFilename, isCameraName } = await import('../server/lib/imageFilename.ts');
let bad = 0;
const check = (label, ok, detail) => { if (!ok) bad++; console.log(`  ${ok?'PASS':'FAIL'}  ${label}${detail?'  '+detail:''}`); };

console.log('\n=== camera counters are replaced, human names are kept ===');
for (const [n, expected] of Object.entries({
  'DSC_4837.JPG': true, 'IMG_0001.jpg': true, 'P1010101.jpg': true, '_MG_1234.jpg': true,
  'DSCF0042.jpg': true, 'untitled-final-copy.jpg': true, '20260812.jpg': true,
  'finish-line-sprint.jpg': false, 'bride-and-groom.jpg': false,
  'hove-marathon-2026.jpg': false, 'a7r5-portrait-session.jpg': false,
})) check(`${expected?'camera':'human '}  ${n}`, isCameraName(n) === expected);

console.log('\n=== generated names ===');
const built = [
  buildImageFilename({ subject:'Runners crossing the finish line', service:'Marathons Photography', place:'Hove', date:'2026-04-12', ext:'jpg' }),
  buildImageFilename({ service:'Cycling Sportives Photography', place:'Hove', date:'2026-06-01', originalName:'DSC_4837.JPG', ext:'jpg' }),
  buildImageFilename({ originalName:'finish-line-sprint.jpg', ext:'jpg' }),
  buildImageFilename({ subject:'Braut und Bräutigam auf der Treppe', service:'Hochzeitsfotografie', place:'Zürich', ext:'jpg' }),
  buildImageFilename({ ext:'webp' }),
];
for (const b of built) console.log('    ' + b);
check('the camera name is gone', !built[1].includes('dsc'), built[1]);
check('a human name is kept',    built[2].includes('finish-line-sprint'), built[2]);
check('nothing is left nameless', built[4].startsWith('photo-'), built[4]);

console.log('\n=== safety ===');
check('all pure ASCII, no percent-escaping', built.every((b) => /^[a-z0-9.-]+$/.test(b)), built[3]);
check('all within 200 chars',                built.every((b) => b.length <= 200));
const many = new Set(Array.from({ length: 2000 }, () => buildImageFilename({ subject:'same subject', ext:'jpg' })));
check('2000 identical inputs, 2000 keys',    many.size === 2000, `${many.size}/2000`);
const long = buildImageFilename({ subject:'x'.repeat(400), service:'y'.repeat(200), place:'z'.repeat(100), ext:'jpg' });
check('a pathological input stays bounded',  long.length <= 200, String(long.length));

console.log(bad ? `\n  ${bad} CHECK(S) FAILED\n` : '\n  ALL CHECKS PASSED\n');
process.exit(bad ? 1 : 0);
