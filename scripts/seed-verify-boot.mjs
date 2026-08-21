// What does a boot inject into a tenant that did not ask for it?
//
// Three de-branding passes were quietly undone by this: seedCaseStudies re-inserted the
// origin studio's three German Vienna case studies into blog_posts on EVERY boot, so a
// tenant who deleted them got them back at the next restart. Nothing in the delete flow
// was wrong; the seeder simply outlived it.
//
// This asserts each boot seeder is gated, and that the gate is on something a NEW TENANT
// would fail — not merely on "is the table empty", which a tenant who cleared it passes.
import fs from 'fs';

const boot = fs.readFileSync('server/index.ts', 'utf8');
let bad = 0;
const check = (label, ok, detail) => { if (!ok) bad++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); };

console.log('\n=== boot seeders must be gated ===');

// Each entry: the call, and a predicate proving a gate stands between boot and the call.
const SEEDERS = [
  {
    name: 'seedCaseStudies',
    why: "the origin studio's own German Vienna portfolio",
    gate: /SEED_ORIGIN_CASE_STUDIES\s*===\s*['"]true['"][\s\S]{0,400}?seedCaseStudies/,
  },
  {
    name: 'seedKnowledgeBase',
    why: 'German starter articles about newborn and pregnancy shoots',
    gate: /getSiteLanguage\(\)[\s\S]{0,400}?===\s*['"]de['"][\s\S]{0,400}?seedKnowledgeBase/,
  },
];

for (const s of SEEDERS) {
  const called = boot.includes(s.name);
  if (!called) { console.log(`  ok    ${s.name} is not called at boot at all`); continue; }
  check(`${s.name} gated`, s.gate.test(boot), s.gate.test(boot) ? '' : '<- runs unconditionally: ' + s.why);
}

console.log('\n=== no fabricated people in financial documents ===');
const inv = fs.readFileSync('client/src/components/admin/AdvancedInvoiceForm.tsx', 'utf8');
check('invoice form has no sample-client factory', !/const getSampleClients\s*=/.test(inv));
check('invoice form never sets invented clients', !/setClients\(sampleClients\)/.test(inv));
check('the empty-state message is truthful', !/Using sample clients for demo/.test(inv));

console.log('\n=== origin-studio content is opt-in, not default ===');
const env = /SEED_ORIGIN_CASE_STUDIES/.test(boot);
check('the origin flag defaults OFF', env && !/SEED_ORIGIN_CASE_STUDIES\s*!==\s*['"]false['"]/.test(boot),
  env ? 'opt-in via SEED_ORIGIN_CASE_STUDIES=true' : 'flag absent');

console.log(bad ? `\n  ${bad} CHECK(S) FAILED\n` : '\n  ALL CHECKS PASSED\n');
process.exit(bad ? 1 : 0);
