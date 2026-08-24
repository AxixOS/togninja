import fs from 'fs';
const F = 'scripts/ui-verify-links.mjs';
let s = fs.readFileSync(F, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';

const from = [
  '// Only absolute, in-product links built from window.location.origin or as a bare path in a',
  '// template literal. External URLs and API paths are not routes and are excluded.',
  "const LINK = /(?:window\.location\.origin\s*\}?\s*)?\/([a-z][a-z0-9-]{2,})\/\$\{/g;",
].join('\n');

const to = [
  '// NAVIGATION ONLY — not "any string that looks like a path".',
  '//',
  '// The first version of this matched /segment/${...} anywhere, and reported nineteen',
  '// failures of which one was real. Every other hit was a fragment of an API URL or a',
  '// path being assembled in pieces (/thumb/, /threads/, /variants/). A guard with',
  '// nineteen false positives is worse than no guard: the one real hit gets skimmed past,',
  '// which is precisely how the /schedule/ link survived in the first place.',
  '//',
  '// So match the four ways this codebase actually sends someone somewhere.',
  'const NAV_PATTERNS = [',
  "  /navigate\(\s*[`'\"]\/([a-z][a-z0-9-]{2,})\//g,",
  "  /window\.open\(\s*[`'\"]\/([a-z][a-z0-9-]{2,})\//g,",
  '  /window\.location\.origin\s*\}\/([a-z][a-z0-9-]{2,})\//g,',
  "  /(?:href|to)=\{?[`'\"]\/([a-z][a-z0-9-]{2,})\//g,",
  '];',
].join('\n');

if (s.indexOf(from.split('\n').join(eol)) < 0) { console.log('MISS pattern'); process.exit(1); }
s = s.replace(from.split('\n').join(eol), to.split('\n').join(eol));

const loopFrom = [
  '    LINK.lastIndex = 0;',
  '    let m;',
  '    while ((m = LINK.exec(line))) {',
  "      const prefix = '/' + m[1];",
  '      if (!found.has(prefix)) found.set(prefix, []);',
  "      found.get(prefix).push(f.split(path.sep).join('/').replace('client/src/', '') + ':' + (i + 1));",
  '    }',
].join('\n');

const loopTo = [
  '    for (const re of NAV_PATTERNS) {',
  '      re.lastIndex = 0;',
  '      let m;',
  '      while ((m = re.exec(line))) {',
  "        const prefix = '/' + m[1];",
  '        if (!found.has(prefix)) found.set(prefix, []);',
  "        found.get(prefix).push(f.split(path.sep).join('/').replace('client/src/', '') + ':' + (i + 1));",
  '      }',
  '    }',
].join('\n');

if (s.indexOf(loopFrom.split('\n').join(eol)) < 0) { console.log('MISS loop'); process.exit(1); }
s = s.replace(loopFrom.split('\n').join(eol), loopTo.split('\n').join(eol));

fs.writeFileSync(F, s);
console.log('ok — the guard now looks for navigation, not path-shaped strings');
