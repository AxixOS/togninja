// Run every ui-verify-* check and report which ones hold.
//
// There are twenty-seven of these scripts and, until now, nothing that ran them. Each was
// invoked by hand, by whoever remembered it existed and knew its filename — which meant a check
// written to catch a regression was only consulted by the person who had just written it, at
// the moment they were least likely to have caused one.
//
// That is not a hypothetical. Over the AI-billing work these scripts caught a payer defaulted
// to the wrong side, a purpose missing from an endpoint, a terminal state that rendered nothing
// and a platform key read from a slot the tenant could write. Every one of those was found by
// running them deliberately. Any of them could have shipped on a day nobody thought to.
//
//   npm run verify
//
// Exit code is non-zero if any check fails, so this can gate a build or a hook when someone
// decides it should.
import { readdirSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const DIR = 'scripts';

// Known-failing for a reason unrelated to what it asserts: it reports a hook-order finding in
// HeroDealsAuto.tsx that predates this work and that nobody has chosen to change. Listed rather
// than skipped, and still run, so the day it starts passing is visible too.
const KNOWN_RED = new Set(['ui-verify-hooks.mjs']);

const scripts = readdirSync(DIR)
  .filter((f) => f.startsWith('ui-verify-') && f.endsWith('.mjs'))
  .sort();

let failed = 0;
let expected = 0;
const results = [];

for (const s of scripts) {
  const r = spawnSync(process.execPath, [join(DIR, s)], { encoding: 'utf8' });
  const ok = r.status === 0;
  const known = KNOWN_RED.has(s);
  if (!ok && known) expected++;
  else if (!ok) failed++;
  results.push({ s, ok, known, out: r.stdout || '' });
}

console.log(`\nverify — ${scripts.length} checks\n`);
for (const { s, ok, known } of results) {
  const label = ok ? 'pass' : known ? 'RED (known)' : 'FAIL';
  console.log(`  ${label.padEnd(12)} ${s.replace('ui-verify-', '').replace('.mjs', '')}`);
}

// The detail of anything that failed unexpectedly, so the run is actionable on its own.
for (const { s, ok, known, out } of results) {
  if (ok || known) continue;
  console.log(`\n──── ${s} ────`);
  for (const line of out.split('\n')) {
    if (/FAIL|✗|not /i.test(line)) console.log(`  ${line.trim()}`);
  }
}

console.log(
  failed
    ? `\n  ${failed} check(s) FAILED${expected ? `, ${expected} known-red` : ''}\n`
    : `\n  all checks passed${expected ? `, ${expected} known-red` : ''}\n`,
);
process.exit(failed ? 1 : 0);
