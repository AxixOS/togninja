// The first screen a buyer ever sees.
//
// It carried a generic sparkle in a gradient box instead of the product's own mark, so the
// wizard read as different software from the one they had just paid for. It rendered
// "change it â€” nothing is lost" because UTF-8 had been written as Latin-1. And it showed a
// spinner and one stage word for a minute or more while a real crawl ran, real subjects were
// pulled out of the studio's own page titles and a real homepage was written — which reads as
// a hang, and is where the studio in the screenshot stopped.
import { readFileSync, existsSync } from 'fs';

const read = (p) => readFileSync(p, 'utf8');
const wizard = read('client/src/pages/setup/UnifiedSetupWizard.tsx');
const scanning = read('client/src/pages/setup/phases/ScanningPhase.tsx');
const narrator = read('client/src/components/setup/SetupNarrator.tsx');
const basics = read('client/src/pages/setup/phases/BasicsPhase.tsx');
const pipeline = read('server/lib/homepage-pipeline.ts');
const routes = read('server/setup-routes.ts');
const css = read('client/src/index.css');

let failed = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!ok) failed++;
};

console.log('\nSetup identity & progress\n');

// ── It looks like the product ───────────────────────────────────────────────
check('the wizard shows the TogNinja mark', wizard.includes('/togninja-logo.png'));
check('the mark exists to be shown', existsSync('client/public/togninja-logo.png'));
check('the placeholder gradient box is gone',
  !wizard.includes('bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center'));

// Mojibake: UTF-8 read as Latin-1. Assert on the byte pattern, not on any one phrase.
for (const [name, src] of [['wizard', wizard], ['scanning', scanning], ['basics', basics]]) {
  check(`${name} has no mis-encoded characters`, !src.includes('\u00e2\u0080'));
}

// ── Progress that says something ────────────────────────────────────────────
check('progress is per-step, not one flat bar', wizard.includes('VISIBLE.map((_, i) =>'));
check('the live step is marked', wizard.includes('setup-card-active'));
check('the travelling border is defined', css.includes('setup-border-travel'));
check('motion is optional', css.includes('prefers-reduced-motion'));

// ── The narrator tells the truth ────────────────────────────────────────────
check('the pipeline records findings', /async function note\(/.test(pipeline));
check('findings reach the client', routes.includes('findings: Array.isArray(st.findings)'));
check('the scan screen renders them', scanning.includes('<SetupNarrator'));

// Every finding must come from a note() call on a real event. Assert there is no hardcoded
// list of fake steps in the component — the thing that would turn an honest feed into a
// progress theatre.
check('the narrator invents nothing',
  !/const (STEPS|FAKE|STAGES)\s*=\s*\[/.test(narrator)
  && narrator.includes('findings.slice(0, shown)'));

check('a failure is still narrated', /kind: 'problem'/.test(pipeline));

// The subject line must not lead with the site name.
check('the homepage title is excluded from subjects',
  pipeline.includes("if (p === '/'"));

// ── Currency is guessed, not assumed ────────────────────────────────────────
check('currency is detected like the timezone', basics.includes('detectedCurrency'));
check('the fallback is no longer the origin studio',
  !basics.includes("|| 'Europe/Vienna'"));

console.log(`\n  ${failed === 0 ? 'all checks passed' : failed + ' FAILED'}\n`);
process.exit(failed === 0 ? 0 : 1);
