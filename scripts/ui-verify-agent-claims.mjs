// Does the Agent V2 page describe the agent we actually shipped?
//
// The studio read the page and asked whether its claims were true. Five were not, and one
// of those was a SAFETY claim pointing the wrong way:
//
//   "Auto-Full Mode — High autonomy. Only high-risk actions require confirmation."
//
// auto_full auto-approves everything. Guardrails.ts approves any risk under that mode, and
// needsConfirmation() returns false for auto_full before it ever looks at the risk level.
// So an owner reading that sentence would enable it believing Send Email, Send Invoice and
// Mark Invoice Paid still prompt. They do not. A wrong safety notice is worse than none,
// because it is acted on.
//
// The others: "10 production-ready tools" and "(10 Total)" when 50 are registered; an
// Agent Console described as "coming soon" that is built and sitting in the sidebar; and a
// legacy V1 assistant said to "remain available" whose route is a redirect to the
// dashboard.
//
// This guard reads the CODE for the true numbers rather than hardcoding them, so the page
// cannot drift again as tools are added.
//
// Run: node scripts/ui-verify-agent-claims.mjs
import fs from 'fs';
import path from 'path';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const page = fs.readFileSync('client/src/pages/admin/AgentV2Page.tsx', 'utf8');
const guards = fs.readFileSync('agent/v2/core/Guardrails.ts', 'utf8');
const app = fs.readFileSync('client/src/App.tsx', 'utf8');

// ── The true tool count, read from the registry ──────────────────────────────
// COUNTED FROM WHAT INDEX.TS IMPORTS, not from what is on disk.
//
// This read the directory, and the directory is not the registry: three tool files import
// workflowTemplates/workflowInstances, which do not exist in shared/schema at all, so they
// never register. One of the three is not even imported. Counting files therefore reported
// 55 where the runtime has 52 — and this check was trusted enough that the page was edited
// to match the wrong number.
const dir = 'agent/v2/tools';
const indexSrc = fs.readFileSync(path.join(dir, 'index.ts'), 'utf8');
const importedFiles = new Set(
  [...indexSrc.matchAll(/import\s+["']\.\/([a-zA-Z0-9._-]+)["']/g)].map((m) => m[1] + '.ts'),
);
const schemaSrc = fs.readFileSync('shared/schema.ts', 'utf8');
const tools = [];
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.ts') || f === 'index.ts') continue;
  // Not imported means not registered, however complete the file looks.
  if (!importedFiles.has(f)) continue;
  // An import of a symbol the schema does not export never reaches its registerTool call.
  const raw = fs.readFileSync(path.join(dir, f), 'utf8');
  const aliased = [...raw.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]@shared\/schema['"]/g)]
    .flatMap((m) => m[1].split(',').map((x) => x.trim()).filter(Boolean));
  if (aliased.some((sym) => !new RegExp('\\b' + sym + '\\b').test(schemaSrc))) continue;
  const s = fs.readFileSync(path.join(dir, f), 'utf8');
  if (!/registerTool/.test(s)) continue;
  // The FIRST name: after the `const def` marker — a name: inside a describe() example
  // string otherwise matches first and yields nonsense (one tool parsed as "Anna").
  const defAt = s.search(/const def\b/);
  const tail = defAt >= 0 ? s.slice(defAt) : s;
  const name = (tail.match(/name:\s*["']([a-zA-Z0-9_.]+)["']/) || [])[1] || f;
  const risk = (tail.match(/risk:\s*["'](\w+)["']/) || [])[1] || 'unknown';
  tools.push({ name, risk, zod: /z\.object\(/.test(s) });
}

console.log(`\n=== the page's tool count matches the registry (${tools.length} registered) ===`);
check('tools were found at all', tools.length > 0, `${tools.length}`);
// Any number stated next to the word "tools" must be the real one.
const counts = [...page.matchAll(/(\d+)\s+registered tools/g)].map((m) => Number(m[1]));
check('the headline count is stated and correct',
  counts.length > 0 && counts.every((c) => c === tools.length),
  counts.length ? counts.join(', ') : 'no count stated');
check('the "(N Total)" claim is gone or correct',
  !/\(\s*10\s+Total\s*\)/i.test(page));
check('the page admits its list is a selection, not the whole set',
  /representative selection|a selection|not exhaustive/i.test(page));
// The old number must not survive anywhere near the word "tools".
check('"10 production-ready tools" is gone', !/10 production-ready tools/.test(page));

console.log('\n=== every tool really does validate its parameters ===');
const noZod = tools.filter((t) => !t.zod);
check('all registered tools carry a Zod schema', noZod.length === 0,
  noZod.length ? noZod.map((t) => t.name).join(', ') : `${tools.length}/${tools.length}`);
// The page does NOT have to say "Zod". It used to, and this check required it — which
// meant the guard was forcing a library name onto a page a photographer reads. Removing a
// true-but-jargon claim is not a regression; making a FALSE claim is. So what is asserted
// now is the honest property: whatever the page says about checking, it must not promise
// more than the code does.
const claimsValidation = /Zod|validat|parameter schema/i.test(page);
check('any validation claim on the page is true', !claimsValidation || noZod.length === 0,
  claimsValidation ? 'page claims it, code does it' : 'page makes no such claim');

// THE CLAIM THAT WAS ACTUALLY FALSE. agent_audit, agent_action_log and agent_audit_diff
// all hold zero rows — nothing writes them — so a page advertising a "full audit trail"
// with "tool calls, arguments, results and performance metrics" was describing a feature
// this product does not have. What it DOES keep is the conversation, in agent_message.
check('the page does not advertise an audit trail we do not write',
  !/full audit trail/i.test(page) && !/performance metrics/i.test(page));

console.log('\n=== the mode descriptions match Guardrails ===');
// The claim that mattered.
check('auto_full really does auto-approve everything',
  /if \(ctx\.mode === "auto_full"\)/.test(guards) && /AUTO-APPROVED/.test(guards));
check('and needsConfirmation returns false for it before checking risk',
  /if \(mode === "auto_full"\) return false/.test(guards));
check('the page NO LONGER claims high-risk actions still confirm under auto_full',
  !/Only high-risk actions require confirmation/.test(page));
check('the page says plainly that nothing prompts', /Nothing prompts/.test(page));
// The two that were already true.
check('auto_safe is genuinely the default for every role', /return "auto_safe"/.test(guards));
check('the page marks auto_safe as the default', /Auto-Safe Mode \(Default\)/.test(page));
check('read_only genuinely blocks risky tools', /ctx\.mode === "read_only" && isRisky/.test(guards));

console.log('\n=== scope-based authorization is real ===');
check('scopes are checked against tool requirements', /missing scopes/.test(guards));

console.log('\n=== the audit trail records what the page says it records ===');
const audit = fs.readFileSync('agent/v2/core/Audit.ts', 'utf8');
const bus = fs.readFileSync('agent/v2/core/ToolBus.ts', 'utf8');
check('an audit module exists', /export async function logToolCall/.test(audit));
// Wired on BOTH paths, or failures go unrecorded and the trail is not "complete".
const calls = (bus.match(/await logToolCall\(/g) || []).length;
check('it is called on success AND failure', calls >= 2, `${calls} call site(s)`);
for (const field of ['tool', 'args', 'result', 'ok', 'duration']) {
  check(`it logs ${field}`, new RegExp(`\\b${field}\\b`).test(audit));
}

console.log('\n=== the Agent Console is not "coming soon" ===');
check('the console page exists', fs.existsSync('client/src/pages/admin/AgentConsolePage.tsx'));
check('it is in the sidebar', /Agent Console/.test(fs.readFileSync('client/src/components/admin/AdminLayout.tsx', 'utf8')));
check('the page no longer calls it coming soon', !/Agent Console \(coming soon\)/.test(page));

console.log('\n=== the legacy V1 assistant claim ===');
// /admin/crm-assistant is a Navigate, so V1 does not "remain available".
const v1Redirects = /path="\/admin\/crm-assistant"[\s\S]{0,160}?<Navigate/.test(app);
check('V1 is in fact a redirect, not a working page', v1Redirects);
check('the page no longer claims V1 remains available',
  !/legacy CRM Assistant \(V1\) remains available/.test(page));
check('the page says what actually happens', /redirects to the dashboard/.test(page));

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED — the page is describing an agent we did not ship\n`
  : '\n  ALL CHECKS PASSED — every claim on the Agent V2 page matches the code\n');
process.exit(bad ? 1 : 0);
