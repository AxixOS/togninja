// One assistant, reachable, and able to be answered.
//
// Every check here exists because the product shipped the opposite.
//
//   /admin/agent-v2 rendered TWO chat windows, both titled "Agent V2 Assistant", holding two
//   unrelated conversations against the same endpoint — because the page mounts AdminLayout
//   (which always renders the widget) and then rendered a second chat of its own.
//
//   The Approve button could never approve anything. The confirm branch was added to
//   /api/agent/v2/chat with a comment saying every risky tool had been "permanently stuck";
//   the request validator above it rejected the approval for carrying no message, so it
//   stayed stuck and the branch never ran once.
//
//   The widget's conversation was destroyed by any click on the sidebar, because all 69 admin
//   pages mount their own AdminLayout — while the page beside it advertised "Every message is
//   kept, so you can pick up where you left off".
//
//   And /my-archive, a public storefront route with no guard, rendered the full admin shell.
import { readFileSync, readdirSync } from 'fs';

const read = (p) => readFileSync(p, 'utf8');
const widget = read('client/src/components/admin/AgentChatWidget.tsx');
const page = read('client/src/pages/admin/AgentV2Page.tsx');
const layout = read('client/src/components/admin/AdminLayout.tsx');
const app = read('client/src/App.tsx');
const route = read('server/routes/agent-v2.ts');
const bus = read('client/src/lib/assistantBus.ts');

let failed = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!ok) failed++;
};

console.log('\nAssistant\n');

// ── One chat, not two ───────────────────────────────────────────────────────
check('AdminLayout mounts exactly one assistant',
  (layout.split('<AgentChatWidget').length - 1) === 1);

check('the assistant page renders no chat of its own',
  !/<div className="fixed bottom-6 right-6 w-96/.test(page)
  && !page.includes('placeholder="Type your command..."'));

check('the assistant page holds no chat state',
  !/setMessages|setSessionId|handleSendMessage/.test(page));

check('the page opens the one assistant instead',
  /openAssistant\(/.test(page) && /from '\.\.\/\.\.\/lib\/assistantBus'/.test(page));

check('the widget listens for it',
  /onOpenAssistant\(/.test(widget));

check('the Create hub handoff still works',
  /\?ask=/.test(read('client/src/pages/admin/CreateHubPage.tsx'))
  && /get\('ask'\)/.test(page) && /openAssistant\(ask\)/.test(page));

// ── Naming ──────────────────────────────────────────────────────────────────
for (const [name, src] of [['widget', widget], ['page', page]]) {
  check(`${name} shows no internal version name`, !/Agent V2 Assistant/.test(src));
}

// ── The approval must be answerable ─────────────────────────────────────────
//
// Assert the property, not the wording: a request carrying a confirm envelope must not be
// rejected for lacking a message.
const validator = route.match(/if \(![\s\S]{0,120}?Message is required/);
check('a confirm-only request is not rejected for having no message',
  /const isApproval = confirm/.test(route)
  && /if \(!isApproval && \(!message/.test(route),
  validator ? 'validator found and gated' : 'validator not found');

check('the confirm branch is reached through that same flag',
  /if \(isApproval\) \{/.test(route));

check('the widget sends what the server accepts',
  /confirm: \{ tool: toRun\.tool, args: toRun\.args \}/.test(widget));

check('an approved action is written to the transcript',
  /role: "assistant"[\s\S]{0,200}approvedTool/.test(route));

check('approving bumps the conversation so history sorts by activity',
  /update\(agentSession\)[\s\S]{0,80}updatedAt/.test(route));

// ── Memory the page is allowed to claim ─────────────────────────────────────
check('the conversation survives navigation',
  /sessionStorage\.getItem\(STORE_KEY\)/.test(widget)
  && /sessionStorage\.setItem\(STORE_KEY/.test(widget));

check('starting a new conversation actually clears it',
  /removeItem\(STORE_KEY\)/.test(widget));

check('the page may claim memory only because the widget has it',
  !/remembers the conversation/i.test(page) || /sessionStorage/.test(widget));

// ── Nobody gets the admin shell without a login ─────────────────────────────
const archiveGuarded = /path="\/my-archive"[\s\S]{0,200}<NeonProtectedRoute>/.test(app);
check('/my-archive is behind the auth guard', archiveGuarded);

// The real assertion, not a restatement of the one above: find EVERY page outside the admin
// tree that pulls in the admin shell, and require each one to be guarded. This catches the
// next MyArchivePage rather than the one already fixed.
const outside = readdirSync('client/src/pages')
  .filter((f) => f.endsWith('.tsx'))
  .filter((f) => read('client/src/pages/' + f).includes('components/admin/AdminLayout'));

const unguarded = outside.filter((f) => {
  const component = f.slice(0, -4);   // strip .tsx
  const at = app.indexOf(`<${component} />`);
  if (at < 0) return false;               // imported but not routed — nothing to guard
  // Walk back to the <Route that renders it and look for the guard in between.
  const routeAt = app.lastIndexOf('<Route', at);
  return routeAt < 0 || !app.slice(routeAt, at).includes('<NeonProtectedRoute>');
});

check('every page outside /admin that uses the admin shell is guarded',
  unguarded.length === 0,
  outside.length + ' such page(s): ' + (outside.join(', ') || 'none') +
    (unguarded.length ? ' — UNGUARDED: ' + unguarded.join(', ') : ''));

// ── The session read is scoped ──────────────────────────────────────────────
check('reading a conversation is scoped to the studio',
  /eq\(agentSession\.studioId/.test(route));

// ── The bus does not become a second implementation ─────────────────────────
check('the bus stays a connector, not a chat',
  bus.length < 2000 && !/fetch\(/.test(bus));

console.log(`\n  ${failed === 0 ? 'all checks passed' : failed + ' FAILED'}\n`);
process.exit(failed === 0 ? 0 : 1);
