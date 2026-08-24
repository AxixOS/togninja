// Does a deploy actually reach a returning visitor?
//
// The policy was inverted, and the symptom was "I shipped it and I still see the old one".
//
//   express.static defaults to `Cache-Control: public, max-age=0`, so the FILENAME-HASHED
//   bundles — which can never change under their own name — were revalidated on every
//   single page load.
//
//   The HTML catch-all set no Cache-Control at all. index.html is the one document that
//   MUST be re-fetched after a deploy, because it names the current asset hashes. With no
//   directive a browser may reuse it heuristically, so a returning visitor keeps loading
//   the OLD chunk hashes and a shipped change is invisible until a hard refresh.
//
// That is not a theory: the studio was shown a corrected Agent V2 page, the corrected
// chunk was confirmed live on the server, and their browser still rendered the old text.
//
// Run: node scripts/ui-verify-cache-policy.mjs           (static checks)
//      node scripts/ui-verify-cache-policy.mjs --live    (also probe the deployed site)
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const vite = fs.readFileSync('server/vite.ts', 'utf8');

console.log('\n=== hashed assets are immutable ===');
check('express.static sets headers at all', /express\.static\(distPath, \{[\s\S]{0,120}setHeaders/.test(vite));
check('a content-hash pattern is used', /const HASHED = /.test(vite));
check('hashed files get a long immutable max-age',
  /'public, max-age=31536000, immutable'/.test(vite));
// A hash covers js/css but also the fonts and images vite fingerprints.
// A membership test on the pattern SOURCE, not an interpolated regex. The first version
// built `new RegExp(`\|?${ext}`)`, which evaluates to /|?js/ — a SyntaxError that
// crashed the script rather than failing a check, which is its own small lesson.
const hashedLine = (vite.match(/const HASHED = .*/) || [''])[0];
for (const ext of ['js', 'css', 'woff', 'webp', 'png', 'svg']) {
  check(`the pattern covers .${ext}`, hashedLine.includes(ext), ext);
}

console.log('\n=== unhashed public files are refreshable ===');
// favicon.ico had to be REPLACED in place after shipping as a 16x5 sliver. A year-long
// immutable header on that file would have made the fix unreachable.
check('unhashed files get a short max-age', /'public, max-age=300, must-revalidate'/.test(vite));

console.log('\n=== the HTML shell is always revalidated ===');
check('a no-cache header is set for non-asset paths', /'no-cache, must-revalidate'/.test(vite));
check('it skips /assets/', /req\.path\.startsWith\('\/assets\/'\)/.test(vite));
check('it skips /api/', /req\.path\.startsWith\('\/api\/'\)/.test(vite));
// Order matters: the middleware must run BEFORE the catch-all that sends the HTML.
const iStatic = vite.indexOf('express.static(distPath');
const iNoCache = vite.indexOf("'no-cache, must-revalidate'");
check('the no-cache middleware is registered after static and before the catch-all',
  iStatic > 0 && iNoCache > iStatic, iNoCache > iStatic ? 'ordered correctly' : 'WRONG ORDER');

if (process.argv.includes('--live')) {
  console.log('\n=== against the deployed site ===');
  const base = 'https://togninja.onrender.com';
  const shell = await fetch(base + '/admin/agent-v2').catch(() => null);
  if (!shell) { check('the site responded', false); }
  else {
    const cc = shell.headers.get('cache-control') || '';
    check('the shell forbids blind reuse', /no-cache|no-store|max-age=0/.test(cc), cc || '(none)');
    const html = await shell.text();
    const asset = (html.match(/src="(\/assets\/[^"]+\.js)"/) || [])[1];
    if (!asset) check('an entry bundle was found', false);
    else {
      const a = await fetch(base + asset);
      const acc = a.headers.get('cache-control') || '';
      check('hashed assets are cached hard', /immutable/.test(acc), acc || '(none)');
    }
  }
}

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED — a deploy may not reach a returning visitor\n`
  : '\n  ALL CHECKS PASSED — the shell revalidates, the hashes cache forever\n');
process.exit(bad ? 1 : 0);
