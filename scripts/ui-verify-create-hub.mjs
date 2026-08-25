// Every link on the Create hub must go somewhere that exists.
//
// A tile whose "or set it up manually" dead-ends is worse than no tile: the studio clicks
// it, gets a blank router miss, and stops trusting the page. So the paths in the hub are
// checked against the routes App.tsx actually registers.
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const hub = fs.readFileSync('client/src/pages/admin/CreateHubPage.tsx', 'utf8');
const app = fs.readFileSync('client/src/App.tsx', 'utf8');

const registered = new Set(
  [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]),
);

console.log('\n=== the hub itself is reachable ===');
check('a /admin/create route is registered', registered.has('/admin/create'));
check('the page is lazy-loaded like its siblings',
  /CreateHubPage = lazyWithRetry/.test(app));
check('it has a sidebar entry',
  /path: '\/admin\/create'/.test(fs.readFileSync('client/src/components/admin/AdminLayout.tsx', 'utf8')));

console.log('\n=== every manual link goes somewhere real ===');
const manualPaths = [...hub.matchAll(/manualPath: '([^']+)'/g)].map((m) => m[1]);
check('the tiles declare manual paths', manualPaths.length === 6, manualPaths.length + ' found');
for (const p of manualPaths) {
  check(`  ${p}`, registered.has(p), registered.has(p) ? '' : 'NOT a registered route');
}

console.log('\n=== the agent link carries the intent ===');
check('tiles link to the agent with ?ask=', /agent-v2\?ask=\$\{encodeURIComponent/.test(hub));
check('the intent is URL-encoded', /encodeURIComponent\(tile\.ask\)/.test(hub));
const agentPage = fs.readFileSync('client/src/pages/admin/AgentV2Page.tsx', 'utf8');
// Matched on the actual call. The first version of this check looked for a lowercase
// 'searchParams', which only ever appears inside the constructor name URLSearchParams —
// so it failed on entirely correct code. A guard that goes red on working code is a guard
// people learn to skip.
check('the agent page reads ?ask=', /URLSearchParams\([^)]*\)\.get\('ask'\)/.test(agentPage));
// The safety property: a misclick must not start the agent doing something.
check('it PRE-FILLS rather than auto-sending',
  /setMessage\(ask\)/.test(agentPage) && !/handleSendMessage\(ask\)/.test(agentPage));
check('and clears the param so a refresh does not re-fill',
  /searchParams\.delete\('ask'\)/.test(agentPage));

console.log('\n=== a tile that cannot finish says so ===');
check('contracts check for templates before inviting you in',
  /templateCount/.test(hub) && /api\/contracts\/templates/.test(hub));
check('and point at where to make one',
  /admin\/contracts\/templates/.test(hub));
check('an unknown count says nothing rather than guessing',
  /setTemplateCount\(null\)/.test(hub));

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED — a tile leads somewhere that is not there\n`
  : '\n  ALL CHECKS PASSED — six tiles, two real routes each, and no dead ends\n');
process.exit(bad ? 1 : 0);
