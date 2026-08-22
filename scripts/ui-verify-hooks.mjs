// Is every useStudioCurrency() call legal?
//
// React hooks must run unconditionally, at the top level of a component, in the same
// order on every render. A call inside a condition, a loop, a callback, or after an early
// return throws at runtime — and esbuild compiles it perfectly happily, so the build is
// green and the screen is white. That combination is why this needs its own check after a
// sweep that added the hook to thirty-odd files.
import fs from 'fs';
import path from 'path';

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

const files = walk('client/src').filter((f) => /\.tsx$/.test(f));
let bad = 0;
let sites = 0;

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  if (!src.includes('useStudioCurrency(')) continue;
  const lines = src.split('\n');

  lines.forEach((line, i) => {
    if (!/useStudioCurrency\s*\(/.test(line)) return;
    if (/^\s*import\b/.test(line)) return;          // the import itself
    if (/^\s*(\/\/|\*)/.test(line)) return;         // a comment
    sites++;

    const rel = f.split(path.sep).join('/').replace('client/src/', '');
    const report = (why) => { bad++; console.log(`  FAIL  ${rel}:${i + 1}  ${why}`); };

    // Walk backwards to the enclosing function, tracking brace depth, and note anything
    // between that would make this call conditional.
    let depth = 0;
    let sawReturn = false;
    let enclosing = null;
    for (let j = i - 1; j >= 0 && j > i - 400; j--) {
      const l = lines[j];
      depth += (l.match(/\}/g) || []).length;
      depth -= (l.match(/\{/g) || []).length;

      if (depth < 0) {
        // We have stepped out into the block that contains this call.
        enclosing = l;
        break;
      }
      if (depth === 0) {
        if (/^\s*return\b/.test(l)) sawReturn = true;
        if (/^\s*(if|for|while|switch)\s*\(/.test(l)) return report('inside a conditional or loop');
      }
    }

    if (sawReturn) return report('after an early return — the hook is skipped on that path');
    if (!enclosing) return report('could not find an enclosing function (module scope?)');

    const looksLikeComponent =
      /(function\s+[A-Z]|const\s+[A-Z][A-Za-z0-9_]*\s*[:=]|=>\s*\{?\s*$|export\s+default)/.test(enclosing);
    const looksLikeCallback = /\.(map|filter|forEach|reduce|then|sort|find)\s*\(/.test(enclosing);

    if (looksLikeCallback) return report('inside a callback');
    if (!looksLikeComponent) return report(`enclosing scope does not look like a component: ${enclosing.trim().slice(0, 60)}`);
  });
}

console.log(`\n  ${sites} useStudioCurrency() call site(s) examined`);
console.log(bad ? `  ${bad} ILLEGAL — these throw at runtime with a clean build\n` : '  every call is at the top level of a component\n');
process.exit(bad ? 1 : 0);
