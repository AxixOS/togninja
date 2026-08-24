// Does an edit in Manual Website Update actually reach the live website?
//
// Two separate reports, one root cause each:
//
//   "I replace the hero image and it doesn't show." The upload worked, the API returned the
//   new image first, and the homepage still showed the old one. HomePage handed React Query
//   24-hour-old localStorage as initialData with no initialDataUpdatedAt — so it was treated
//   as fresh as of this moment — with staleTime 5min and refetchOnMount:false. Nothing ever
//   went back to the server. Every returning visitor saw the old picture for up to a day.
//
//   "I clicked Improve SEO — did it take effect?" It did not, and the editor could not have
//   told them: the "Modified" badge tested `editedContent[key] !== undefined`, and
//   editedContent is seeded with EVERY field on load. So every field read Modified from the
//   moment the page opened. One AI rewrite looked exactly like rewriting the whole page.
//
// Plus the quiet one underneath both: "Replace Image" INSERTed and then fired a separate
// DELETE whose response nobody checked, so a failed delete left two rows on one section.
// The live database had exactly that for "hero".
//
// Run: node scripts/ui-verify-website-edits.mjs
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const home = fs.readFileSync('client/src/pages/HomePage.tsx', 'utf8');
const cache = fs.readFileSync('client/src/lib/persistentCache.ts', 'utf8');
const admin = fs.readFileSync('client/src/pages/admin/ManualWebsiteUpdatePage.tsx', 'utf8');
const routes = fs.readFileSync('server/routes.ts', 'utf8');
const mp = fs.readFileSync('server/routes/manual-pages.ts', 'utf8');
const lang = fs.readFileSync('client/src/context/LanguageContext.tsx', 'utf8');

// Comments here necessarily quote the old broken code; matching them is the false positive
// this repo's guards keep producing.
const code = (s) => s.split('\n').filter((l) => {
  const t = l.trim();
  return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
}).join('\n');

console.log('\n=== a replaced image is seen, not cached over ===');
check('the cache exposes when it was written', /export function getCachedEntry/.test(cache));
check('a stale entry is dropped, not returned', /localStorage\.removeItem\(key\)/.test(cache));
check('the homepage passes the real write time',
  /initialDataUpdatedAt: \(\) => getCachedEntry/.test(home));
check('it always revalidates on mount', /refetchOnMount: 'always'/.test(home));
const st = home.match(/staleTime: 1000 \* (\d+)/);
check('staleTime is seconds, not minutes', st && Number(st[1]) <= 60, st ? st[1] + 's' : 'not found');
check('the old never-revalidate combination is gone',
  !/refetchOnMount: false/.test(code(home)));
// v5 renamed cacheTime -> gcTime. The old name is not an error, it is IGNORED — so the
// interval each comment claims was never the one in force.
check('no v4 cacheTime survives anywhere in the client',
  !/cacheTime:/.test(code(home) + code(fs.readFileSync('client/src/pages/VouchersPage.tsx', 'utf8'))
    + code(fs.readFileSync('client/src/pages/support/PreisePage.tsx', 'utf8'))));

console.log('\n=== one section holds one image ===');
check('the upload clears the section first',
  /DELETE FROM homepage_images WHERE section = \$1 RETURNING id/.test(routes));
check('the replacement is logged', /Replaced \$\{superseded\.length\} existing image/.test(routes));
// Scoped to the replace mutation only. A first version tested the whole file and failed on
// the URL branch's PUT and on the standalone Delete Image button — both legitimate. A guard
// that cries wolf about correct code is how the real hit gets skimmed past.
const replaceBlock = (() => {
  const a = admin.indexOf('const replaceImageMutation');
  if (a < 0) return '';
  return code(admin.slice(a, admin.indexOf('const handleReplace', a)));
})();
check('the replace mutation is where we think it is', replaceBlock.length > 0);
check('it issues no DELETE of its own', !/method: .DELETE./.test(replaceBlock));
// Upload, and nothing else. The old flow was upload-then-delete-and-hope.
const uploadBranch = replaceBlock.slice(0, replaceBlock.indexOf('} else if (data.url)'));
const fetches = (uploadBranch.match(/await fetch\(/g) || []).length;
check('replacing a file is a single request', fetches === 1, fetches + ' fetch(es)');
check('and its response is checked', /if \(!uploadRes[.]ok\)/.test(uploadBranch));

console.log('\n=== "Modified" means the studio modified it ===');
check('the loaded state is remembered', /const \[loadedContent, setLoadedContent\]/.test(admin));
check('the badge compares against it',
  /isModified = \(editedContent\[field\.translationKey\] \?\? ''\) !== \(loadedContent\[field\.translationKey\] \?\? ''\)/.test(admin));
check('the always-true test is gone',
  !/isModified = editedContent\[field\.translationKey\] !== undefined/.test(code(admin)));
check('the baseline is set when a page loads', /setLoadedContent\(mergedContent\)/.test(admin));
// Without this every field stays flagged after a save, which is the same lie one step later.
const resets = (admin.match(/setLoadedContent\(editedContent\)/g) || []).length;
check('saving and publishing both reset the baseline', resets === 2, resets + ' of 2');

console.log('\n=== the AI does not claim to have changed the live site ===');
// It rewrites the draft only. "SEO tips applied" read as "done, it is live".
check('the enhance call only edits the draft', /handleFieldChange\(key, data\.result\)/.test(admin));
check('the panel says it is still a draft', /click <strong>Publish<\/strong> to put it on the website/.test(admin));
check('the misleading "applied" wording is gone', !/SEO tips applied:/.test(code(admin)));

console.log('\n=== Publish reaches the public site ===');
check('publish writes published_content', /updates\.publishedContent = draftContent/.test(mp));
check('publish stamps the time', /updates\.publishedAt = new Date\(\)/.test(mp));
check('a public endpoint serves it', /router\.get\('\/published\/all'/.test(mp));
check('only non-empty strings are overlaid', /typeof v === 'string' && v\.trim\(\)/.test(mp));
check('the public site fetches the overlay',
  /\/api\/manual-pages\/published\/all\?language=\$\{language\}/.test(lang));
// The endpoint defaults to 'de'. If the site asked with no language, an English studio's
// published copy would silently never appear.
check('the site always sends its language, never relying on the default',
  !/published\/all['"`]\)/.test(code(lang)));
check('Save Draft does NOT publish', /action: 'save_draft'/.test(admin));
check('the draft banner says it is not live yet',
  /It is not live yet — click Publish/.test(admin));

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED\n`
  : '\n  ALL CHECKS PASSED — edits reach the site, and the editor tells the truth about what is live\n');
process.exit(bad ? 1 : 0);
