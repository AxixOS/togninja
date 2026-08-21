// readExistingIptc decides whether we overwrite a photographer's own work.
// If it fails to SEE an existing caption, the gallery path replaces hand-written text
// with a gallery title. That is the single most damaging thing this feature can do, so
// it gets its own suite.
import sharp from 'sharp';
const { writeIptc, readExistingIptc } = await import('../server/services/blogImageAnalysis.ts');

let bad = 0;
const check = (label, ok, detail) => { if (!ok) bad++; console.log(`  ${ok?'PASS':'FAIL'}  ${label}${detail!==undefined?'  '+detail:''}`); };

const plain = await sharp({ create:{ width:900, height:600, channels:3, background:{r:60,g:90,b:130} } }).jpeg().toBuffer();

console.log('\n=== a file the photographer already captioned ===');
const theirs = await writeIptc(plain, {
  caption: 'Emma and Tom, first dance, Hove Town Hall',
  keywords: ['emma', 'tom', 'first dance'],
  creator: 'Klickermann Photography',
  copyright: '© 2026 Klickermann Photography',
});
const found = await readExistingIptc(theirs);
check('their caption is seen',  found.caption === 'Emma and Tom, first dance, Hove Town Hall', String(found.caption));
check('their byline is seen',   found.byline === 'Klickermann Photography', String(found.byline));
check('their copyright is seen', String(found.copyright||'').includes('Klickermann'), String(found.copyright));
check('their keywords are seen', (found.keywords||[]).includes('first dance'), String(found.keywords));

console.log('\n=== the gap-filling decision ===');
// This mirrors the rule in the gallery route: their value wins, ours only fills a gap.
const decide = (existing, ours) => ({
  caption: existing.caption || ours.caption,
  writeCaption: existing.caption ? '' : ours.caption,
});
const d1 = decide(found, { caption: 'Wedding gallery' });
check('their caption survives the decision', d1.caption.startsWith('Emma and Tom'), d1.caption);
check('nothing is written over it',          d1.writeCaption === '', JSON.stringify(d1.writeCaption));

console.log('\n=== a file with nothing in it ===');
const bare = await readExistingIptc(plain);
check('no caption found',  !bare.caption, String(bare.caption ?? '(none)'));
check('no byline found',   !bare.byline, String(bare.byline ?? '(none)'));
const d2 = decide(bare, { caption: 'Brighton Marathon 2026' });
check('ours fills the gap', d2.writeCaption === 'Brighton Marathon 2026', d2.writeCaption);

console.log('\n=== a non-image buffer must not throw ===');
const junk = await readExistingIptc(Buffer.from('not an image at all'));
check('returns an empty object', typeof junk === 'object' && !junk.caption, JSON.stringify(junk));

const { exiftool } = await import('exiftool-vendored');
await exiftool.end();
console.log(bad ? `\n  ${bad} CHECK(S) FAILED\n` : '\n  ALL CHECKS PASSED\n');
process.exit(bad ? 1 : 0);
