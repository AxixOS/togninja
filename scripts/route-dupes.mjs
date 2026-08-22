// Is any route registered twice?
//
// Express serves the FIRST matching registration and silently ignores the rest, which
// makes a duplicate registration an unusually good hiding place for a bug: the code reads
// correctly, it is obviously reached, and it never executes.
//
// This repo had two `app.post("/api/galleries")` handlers ~1300 lines apart. The second
// one was better in every way — it persisted client_id, is_public and
// is_password_protected properly, and it carried a guard added specifically to stop a
// gallery being saved as protected-with-no-password. None of it ran. Meanwhile the first
// one passed a mixed-case body straight to Drizzle, which silently dropped every
// snake_case key and let the column defaults through, so real client galleries were
// stored unprotected and publicly listed.
//
// Nothing flagged it. Not the build, not the type checker, not a test. Only reading both.
//
// Run: node scripts/route-dupes.mjs
import fs from 'fs';
import path from 'path';

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

const files = walk('server').filter((f) => /\.ts$/.test(f) && !/\.d\.ts$/.test(f));

// app.get("/path"  /  router.post('/path'  — capture the verb and the literal path.
const ROUTE = /\b(?:app|router)\s*\.\s*(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/g;

const seen = new Map(); // "VERB path" -> [{file, line}]

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    // Skip commented-out registrations, including the tombstone this check left behind.
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    ROUTE.lastIndex = 0;
    let m;
    while ((m = ROUTE.exec(line))) {
      const key = `${m[1].toUpperCase()} ${m[2]}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key).push({ file: f.split(path.sep).join('/'), line: i + 1 });
    }
  });
}

// Same verb + same path registered in more than one place. Registrations in DIFFERENT
// files can still be legitimate (a router mounted under a distinct prefix), so those are
// reported separately as worth a look rather than as a failure.
const sameFile = [];
const crossFile = [];
for (const [key, hits] of seen) {
  if (hits.length < 2) continue;
  const files = new Set(hits.map((h) => h.file));
  (files.size === 1 ? sameFile : crossFile).push([key, hits]);
}

console.log('\n=== duplicate route registrations in the same file ===');
if (!sameFile.length) {
  console.log('  none — every route in a file is registered once');
} else {
  for (const [key, hits] of sameFile) {
    console.log(`  FAIL  ${key}`);
    hits.forEach((h, i) => console.log(`          ${i === 0 ? 'SERVES  ' : 'shadowed'} ${h.file}:${h.line}`));
  }
}

if (crossFile.length) {
  console.log('\n=== same path in more than one file (check the mount prefixes) ===');
  for (const [key, hits] of crossFile) {
    console.log(`  note  ${key}`);
    hits.forEach((h) => console.log(`          ${h.file}:${h.line}`));
  }
}

console.log(sameFile.length
  ? `\n  ${sameFile.length} SHADOWED ROUTE(S) — the second registration never runs\n`
  : '\n  no route is shadowed by a duplicate\n');
process.exit(sameFile.length ? 1 : 0);
