// Which client modules does anything actually import?
//
// This repo carries a lot of unreachable UI — older copies of a form, a component wired
// only to a test page, a modal nothing renders. Those files still contain real defects, and
// a guard that fails on them stays red for ever. A guard that stays red is wallpaper: the
// one genuine hit gets skimmed past with the noise, which is precisely what nine false
// positives were already doing to ui-verify-imports.
//
// So guards report unreachable files separately, as cleanup, and exit 0 on them.
//
// Deliberately basename-based rather than a real module resolver. It answers "does anything
// import a module by this name", which is the question that matters, without reimplementing
// Node resolution, tsconfig paths and index files. It errs toward calling a file REACHABLE
// — a false "reachable" only means a guard failure gets taken seriously, while a false
// "unreachable" would hide a real one.
import fs from 'fs';
import path from 'path';

export const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

/** Module basenames (no extension) that at least one file imports. */
export function importedModuleNames(root = 'client/src') {
  const names = new Set();
  for (const f of walk(root)) {
    if (!/\.(tsx?|jsx?)$/.test(f)) continue;
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/from\s+['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
      const spec = m[1] || m[2];
      names.add(path.basename(spec).replace(/\.(tsx?|jsx?)$/, ''));
    }
  }
  return names;
}

/** Is this file imported by anything? */
export function isReachable(file, imported) {
  return imported.has(path.basename(file).replace(/\.(tsx?|jsx?)$/, ''));
}

/** Print an "unreachable, delete rather than fix" section. Returns nothing. */
export function reportUnreachable(entries) {
  if (!entries.length) return;
  console.log('\n  Broken, but nothing imports them — delete rather than fix:');
  for (const e of entries) console.log('    ' + e);
}
