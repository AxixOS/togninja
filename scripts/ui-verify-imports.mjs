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
import { importedModuleNames, reportUnreachable } from './lib/reachable.mjs';

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

// Which files does anything actually import?
//
// PhotographyCalendarPage.tsx genuinely renders Button, Card and Dialog without importing
// any of them — a real ReferenceError — but App.tsx routes PhotographyCalendarPageSimple
// instead, so no user can ever reach it. Reporting that as a failure forever is how a
// guard turns into wallpaper. Unreachable files are listed separately, as cleanup.
//
// Shared with ui-verify-currency, which needed exactly the same distinction. One copy,
// because two guards disagreeing about what "reachable" means is its own bug.
const importedSomewhere = importedModuleNames();

let bad = 0;
const unreachable = [];
const admin = all.filter((f) => /\.tsx$/.test(f) && /[\\/](pages|components)[\\/]admin/.test(f));

for (const f of admin) {
  const s = fs.readFileSync(f, 'utf8');
  // The lookbehind is what separates JSX from a generic type argument. Without it,
  // useState<Client | null> matches `Client` (capitalised, followed by a space) and
  // Array<File> matches `File` — and because File IS a real lucide icon name, the
  // icon-name filter below waved it straight through. That produced nine confident
  // failures, every one of them a type annotation. A guard nobody believes is worse than
  // no guard, because the one real hit gets skimmed past along with the noise.
  //
  // Real JSX is never preceded by an identifier character; a generic argument always is.
  const used = [...new Set([...s.matchAll(/(?<![A-Za-z0-9_$.])<([A-Z][A-Za-z0-9_]*)[\s/>]/g)].map((m) => m[1]))];

  const known = new Set();
  for (const m of s.matchAll(/import\s+(?:type\s+)?([\s\S]*?)\s+from\s+['"]/g)) {
    for (const p of m[1].replace(/[{}]/g, ' ').split(/[,\s]+/)) if (p) known.add(p.trim());
  }
  for (const m of s.matchAll(/(?:const|let|function|class)\s+([A-Z][A-Za-z0-9_]*)/g)) known.add(m[1]);

  const missing = used.filter((u) => !known.has(u) && iconNames.has(u));
  if (!missing.length) continue;

  const rel = f.split(path.sep).join('/').replace('client/src/', '');
  const moduleName = path.basename(f).replace(/\.tsx?$/, '');
  if (!importedSomewhere.has(moduleName)) {
    unreachable.push(rel + '  ->  ' + missing.join(', '));
    continue;
  }
  bad++;
  console.log('  FAIL  ' + rel + '  ->  ' + missing.join(', '));
}

reportUnreachable(unreachable);

console.log(
  bad
    ? '\n  ' + bad + ' REACHABLE screen(s) render an icon they never import — ReferenceError, blank screen\n'
    : '\n  every icon rendered on a reachable screen is imported\n',
);
process.exit(bad ? 1 : 0);
