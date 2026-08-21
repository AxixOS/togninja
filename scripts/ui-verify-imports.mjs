// Does any admin screen render an icon it never imported?
//
// esbuild transpiles without resolving identifiers, so a used-but-unimported component
// builds completely clean and throws a ReferenceError the moment that branch renders —
// blanking the screen from that point on with nothing in the build output to warn you.
// It has already shipped twice in this codebase.
//
// The naive check — "every <Capitalised> used must be imported" — is useless here,
// because `useState<Client | null>` looks exactly like JSX to a regex and produces about
// eighty false positives. The discriminator: only flag names the PROJECT ITSELF imports
// from lucide-react somewhere, which makes them unambiguously rendered components rather
// than TypeScript types.
import fs from 'fs';
import path from 'path';

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

const all = walk('client/src').filter((f) => /\.tsx?$/.test(f));

const iconNames = new Set();
for (const f of all) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*['"]lucide-react['"]/g)) {
    for (const p of m[1].split(/[,\s]+/)) if (p.trim()) iconNames.add(p.trim());
  }
}

let bad = 0;
const admin = all.filter((f) => /\.tsx$/.test(f) && /[\\/](pages|components)[\\/]admin/.test(f));

for (const f of admin) {
  const s = fs.readFileSync(f, 'utf8');
  const used = [...new Set([...s.matchAll(/<([A-Z][A-Za-z0-9_]*)[\s/>]/g)].map((m) => m[1]))];

  const known = new Set();
  for (const m of s.matchAll(/import\s+(?:type\s+)?([\s\S]*?)\s+from\s+['"]/g)) {
    for (const p of m[1].replace(/[{}]/g, ' ').split(/[,\s]+/)) if (p) known.add(p.trim());
  }
  for (const m of s.matchAll(/(?:const|let|function|class)\s+([A-Z][A-Za-z0-9_]*)/g)) known.add(m[1]);

  const missing = used.filter((u) => !known.has(u) && iconNames.has(u));
  if (missing.length) {
    bad++;
    console.log('  ' + f.split(path.sep).join('/').replace('client/src/', '') + '  ->  ' + missing.join(', '));
  }
}

console.log(
  bad
    ? '\n  ' + bad + ' screen(s) render an icon they never import — ReferenceError, blank screen\n'
    : '\n  every icon rendered is imported\n',
);
process.exit(bad ? 1 : 0);
