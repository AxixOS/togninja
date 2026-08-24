// Can the agent act on your behalf without asking, and can anyone give themselves that?
//
// Two defects, found by auditing what the approval machinery actually does rather than
// reading its comments:
//
//  1. getRecommendedMode() returned "auto_full" for owner and admin. auto_full auto-approves
//     every risky tool. So the studio owner — the one person whose agent can send email,
//     create invoices and write to the CRM — was the one person never asked to confirm any
//     of it. The confirmation machinery was complete and simply never ran for them.
//
//  2. The chat endpoint read `mode` straight out of req.body and used it. A viewer, whose
//     ceiling is read_only, could send { mode: "auto_full" } and auto-approve everything.
//     The mode is a request from the client; it was being treated as an instruction.
//
// The distinction that fixes both is between a CEILING and a DEFAULT: what a role may ask
// for, versus what it gets when it asks for nothing.
//
// Run: npx tsx scripts/ag-verify-mode.ts
import fs from 'fs';
import { getRecommendedMode, getMaxMode, resolveMode } from '../agent/v2/core/Guardrails';

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const ROLES = ['owner', 'admin', 'photographer', 'manager', 'viewer', 'client', 'nonsense'];

console.log('\n=== nobody is auto-approved by default ===');
for (const role of ROLES) {
  const m = getRecommendedMode(role);
  check(`${role.padEnd(12)} defaults to ${m}`, m !== 'auto_full', m);
}

console.log('\n=== but an owner may still opt in, deliberately ===');
check('owner can request auto_full', resolveMode('auto_full', 'owner') === 'auto_full');
check('admin can request auto_full', resolveMode('auto_full', 'admin') === 'auto_full');

console.log('\n=== and nobody else can, however they ask ===');
check('a photographer asking for auto_full gets auto_safe',
  resolveMode('auto_full', 'photographer') === 'auto_safe', resolveMode('auto_full', 'photographer'));
check('a manager asking for auto_full gets auto_safe',
  resolveMode('auto_full', 'manager') === 'auto_safe');
// The escalation that was live: a read-only user self-promoting to fully autonomous.
check('a VIEWER asking for auto_full gets read_only',
  resolveMode('auto_full', 'viewer') === 'read_only', resolveMode('auto_full', 'viewer'));
check('a viewer asking for auto_safe gets read_only',
  resolveMode('auto_safe', 'viewer') === 'read_only');
check('an unknown role asking for auto_full gets read_only',
  resolveMode('auto_full', 'nonsense') === 'read_only');

console.log('\n=== asking for less than your ceiling is always allowed ===');
check('an owner may choose read_only', resolveMode('read_only', 'owner') === 'read_only');
check('an owner may choose auto_safe', resolveMode('auto_safe', 'owner') === 'auto_safe');

console.log('\n=== rubbish input falls back to the safe default, never upward ===');
for (const junk of [undefined, null, '', 'AUTO_FULL', 'god', 42, {}, []]) {
  const m = resolveMode(junk as any, 'owner');
  check(`owner + ${JSON.stringify(junk)} -> ${m}`, m === 'auto_safe', m);
}
check('rubbish never elevates a viewer', resolveMode('sudo', 'viewer') === 'read_only');

console.log('\n=== the ceiling is what it should be ===');
check('owner ceiling is auto_full', getMaxMode('owner') === 'auto_full');
check('photographer ceiling is auto_safe', getMaxMode('photographer') === 'auto_safe');
check('viewer ceiling is read_only', getMaxMode('viewer') === 'read_only');
check('an unknown role gets the lowest ceiling', getMaxMode('whatever') === 'read_only');

console.log('\n=== the endpoint uses the clamp, not the raw body value ===');
const src = fs.readFileSync('server/routes/agent-v2.ts', 'utf8');
check('resolveMode is used', /const executionMode = resolveMode\(mode, userRole\)/.test(src));
check('the raw body value is no longer trusted', !/mode \|\| getRecommendedMode/.test(src));

console.log('\n=== and there is now a way for a person to say yes ===');
// auto_safe without a confirm UI is not safety, it is a permanently broken write path.
// Shipping the server change alone would have turned "silently auto-approved" into
// "silently blocked", which is not an improvement.
check('the endpoint accepts an approved tool', /confirm && typeof confirm === "object"/.test(src));
check('__confirm is injected server-side, not accepted from the model', /__confirm: true/.test(src));
check('the approval runs AFTER identity is established',
  src.indexOf('const scopes = getUserScopes') < src.indexOf('if (confirm && typeof confirm'));

const widget = fs.readFileSync('client/src/components/admin/AgentChatWidget.tsx', 'utf8');
check('the live widget reads confirmRequired', /result\.confirmRequired/.test(widget));
check('it renders an approve control', /approvePending/.test(widget));
check('it renders a decline control', /declinePending/.test(widget));
check('approving posts the confirm payload', /confirm: \{ tool: toRun\.tool/.test(widget));
check('the model still cannot approve itself',
  /delete parameters\.properties\.__confirm/.test(fs.readFileSync('agent/v2/core/ToolBus.ts', 'utf8')));

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED\n`
  : '\n  ALL CHECKS PASSED — the agent asks before it acts, and nobody can grant themselves otherwise\n');
process.exit(bad ? 1 : 0);
