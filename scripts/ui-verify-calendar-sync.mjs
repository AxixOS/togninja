// Does Calendar Sync work, and is it reachable?
//
// It was in the product but not in the sidebar, so the only way to find it was Settings ->
// Google API or a dashboard banner that renders solely when an ALREADY-CONNECTED calendar
// has gone unhealthy. A studio that never opened Settings never found the page.
//
// Surfacing it first would have been the wrong order, because the page did not work:
//
//   "Sync now" POSTed /api/calendar/import-google-events. That path was defined once, in
//   server/routes/calendar.ts — a router nothing ever mounted. No app.use('/api/calendar')
//   existed anywhere in the server tree, so every click 404'd, and the page's catch turned
//   the 404 into a bare "Sync failed" with no hint that the endpoint was simply absent.
//
// A URL is only a string: nothing in the build, the type checker or the tests can see that
// one end of it is missing. So the check that matters here is the first one — no LIVE UI
// may call a route the server does not mount. Live is the load-bearing word: this repo
// carries unreachable UI that nothing imports, and failing on that keeps the guard red for
// ever, which teaches everyone to ignore it. Unreachable callers are listed as cleanup and
// do not fail.
//
// The rest guards the two things that make the sidebar entry safe to ship: the i18n key
// exists in BOTH dictionaries (one and not the other renders the raw key string in the
// sidebar), and the page tells the truth when Google is not configured — which is the
// state every studio sees on day one, now that the row is in front of them.
//
// Run: node scripts/ui-verify-calendar-sync.mjs
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { importedModuleNames, isReachable, reportUnreachable } from './lib/reachable.mjs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

// A comment explaining a defect necessarily quotes the defect — the fix for this very bug
// left the dead URL in a comment three lines above the live fetch. Whole-line comments are
// dropped before anything is matched, or the guard fails on its own explanation.
const isComment = (line) => {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
};
const stripComments = (src) => src.split('\n').map((l) => (isComment(l) ? '' : l)).join('\n');

const read = (f) => fs.readFileSync(f, 'utf8');
const norm = (p) => p.replace(/\/+$/, '') || '/';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, (c) => '\\' + c);

// ── What the server actually mounts ──────────────────────────────────────────
// Direct app.VERB() registrations, plus routers followed through app.use() to the file
// they live in. Mount prefixes are NOT trusted on their own: server/routes.ts contains an
// app.use('/api', …), so "anything under a mounted prefix exists" would make every URL in
// the product valid and this guard would pass for ever while checking nothing.
const resolveModule = (fromFile, spec) => {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const c of [base + '.ts', base + '.tsx', path.join(base, 'index.ts')]) {
    if (fs.existsSync(c)) return c;
  }
  return null;
};

const routes = new Set();          // "POST /api/calendar/google/sync"
const mountedPrefixes = new Map(); // "/api/calendar" -> [files mounting there]
const serverFiles = walk('server').filter((f) => /\.ts$/.test(f) && !/\.d\.ts$/.test(f));

for (const f of serverFiles) {
  const src = stripComments(read(f));

  for (const m of src.matchAll(/\bapp\.(get|post|put|patch|delete)\(\s*["'`](\/[^"'`]*)["'`]/g)) {
    routes.add(m[1].toUpperCase() + ' ' + norm(m[2]));
  }

  // How a router identifier got its file. Static import, and the three dynamic forms this
  // server uses — /api/schedulers is mounted from a require().default, and a guard that
  // cannot follow that reports every scheduler route missing.
  const origin = new Map();
  for (const m of src.matchAll(/import\s+(\w+)\s+from\s+["'](\.[^"']+)["']/g)) origin.set(m[1], m[2]);
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*require\(["'](\.[^"']+)["']\)\.default/g)) origin.set(m[1], m[2]);
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*\(await import\(["'](\.[^"']+)["']\)\)\.default/g)) origin.set(m[1], m[2]);
  for (const m of src.matchAll(/const\s+\{\s*default:\s*(\w+)\s*\}\s*=\s*await import\(["'](\.[^"']+)["']\)/g)) origin.set(m[1], m[2]);

  for (const m of src.matchAll(/\bapp\.use\(/g)) {
    // Inline middleware between the prefix and the router spans many lines and carries its
    // own parens and quotes, so the argument list is bounded by counting parentheses rather
    // than by a regex expecting "prefix, identifier".
    const open = m.index + m[0].length - 1;
    let depth = 0, i = open, inStr = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (inStr) { if (c === inStr && src[i - 1] !== '\\') inStr = null; continue; }
      if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
      if (c === '(') depth++;
      else if (c === ')') { depth--; if (!depth) break; }
    }
    if (depth !== 0) continue;

    const args = src.slice(open + 1, i);
    const pm = args.match(/^\s*["'`](\/[^"'`]*)["'`]/);
    if (!pm) continue;
    const prefix = norm(pm[1]);
    const idm = args.slice(pm[0].length).match(/([A-Za-z_$][\w$]*)\s*,?\s*$/);
    if (!idm) continue;

    if (!mountedPrefixes.has(prefix)) mountedPrefixes.set(prefix, []);
    mountedPrefixes.get(prefix).push(f.split(path.sep).join('/'));

    const file = origin.has(idm[1]) ? resolveModule(f, origin.get(idm[1])) : null;
    if (!file) continue; // unresolvable: contribute nothing rather than guess
    for (const r of stripComments(read(file)).matchAll(/\brouter\.(get|post|put|patch|delete)\(\s*["'`](\/[^"'`]*)["'`]/g)) {
      routes.add(r[1].toUpperCase() + ' ' + norm(prefix + r[2]));
    }
  }
}

const verbOf = (e) => e.slice(0, e.indexOf(' '));
const pathOf = (e) => e.slice(e.indexOf(' ') + 1);
const isMounted = (method, url) => {
  if (routes.has(method + ' ' + url)) return true;
  for (const r of routes) {
    if (verbOf(r) !== method) continue;
    const rp = pathOf(r);
    // :id segments, and the client's /api/x/${id} whose captured literal stops at the ${.
    if (rp.includes(':')) {
      const rx = new RegExp('^' + rp.split('/').map((s) => (s.startsWith(':') ? '[^/]+' : esc(s))).join('/') + '$');
      if (rx.test(url)) return true;
    }
    if (rp.startsWith(url + '/')) return true;
  }
  return false;
};

// ── What the client calls ────────────────────────────────────────────────────
const PAGE = 'client/src/pages/admin/CalendarSyncPage.tsx';
const LAYOUT = 'client/src/components/admin/AdminLayout.tsx';
const CONTEXT = 'client/src/context/LanguageContext.tsx';
const APP = 'client/src/App.tsx';
const SURFACE = [PAGE, 'client/src/components/admin/GCalStatusBanner.tsx'];

const calls = [];
for (const f of walk('client/src').filter((x) => /\.(ts|tsx)$/.test(x))) {
  const lines = read(f).split(/\r?\n/);
  lines.forEach((line, i) => {
    if (isComment(line)) return;
    for (const m of line.matchAll(/["'`](\/api\/[A-Za-z0-9_\-/.]*)/g)) {
      const url = norm(m[1]);
      if (url === '/api') continue;
      const rel = f.split(path.sep).join('/');
      // Everything the calendar-sync surface calls, plus every /api/calendar call anywhere.
      if (!url.startsWith('/api/calendar') && !SURFACE.includes(rel)) continue;
      const near = lines.slice(i, i + 6).join(' ');
      const v = near.match(/method:\s*["'`](GET|POST|PUT|PATCH|DELETE)["'`]/i);
      calls.push({ file: rel, line: i + 1, url, method: v ? v[1].toUpperCase() : 'GET' });
    }
  });
}

const imported = importedModuleNames('client/src');
const dead = calls.filter((c) => !isMounted(c.method, c.url));
const deadLive = dead.filter((c) => isReachable(c.file, imported));
const deadUnreachable = dead.filter((c) => !isReachable(c.file, imported));

console.log(`\n=== no live UI calls a route the server does not mount (${calls.length} call(s), ${routes.size} routes mounted) ===`);
check('the calendar surface makes calls at all', calls.length > 0, `${calls.length}`);
check('every one of them resolves to a mounted route', deadLive.length === 0,
  deadLive.length ? deadLive.map((c) => `${c.method} ${c.url} at ${c.file}:${c.line}`).join('; ') : 'all resolve');
// The specific one that was broken, named so a regression reads plainly.
check('"Sync now" does not post to the unmounted import-google-events route',
  !read(PAGE).split(/\r?\n/).some((l) => !isComment(l) && l.includes('/api/calendar/import-google-events')));
check('it posts to /api/calendar/google/sync instead', isMounted('POST', '/api/calendar/google/sync'));

console.log('\n=== that endpoint is the real one, not another string that happens to exist ===');
const server = read('server/routes.ts');
const syncAt = server.indexOf('app.post("/api/calendar/google/sync"');
check('it is registered in server/routes.ts', syncAt >= 0);
// Bound the handler at the next registration rather than at a fixed character window: a
// window either clips the handler or reads the next one's body as if it were this one's.
let syncBody = '';
if (syncAt >= 0) {
  const next = server.indexOf('\n  app.', syncAt + 1);
  syncBody = server.slice(syncAt, next < 0 ? server.length : next);
}
check('behind authenticateUser — the page sends only the session cookie',
  /app\.post\("\/api\/calendar\/google\/sync",\s*authenticateUser/.test(syncBody));
// The page destructures these off the response; a handler returning other names would show
// "imported 0, updated 0" for a sync that actually moved hundreds of events.
for (const key of ['success', 'imported', 'updated', 'deleted', 'errors']) {
  check(`it returns ${key}, which the page reads`, new RegExp('\\b' + esc(key) + ':').test(syncBody));
}

console.log('\n=== the orphaned router is gone, not left lying around ===');
check('server/routes/calendar.ts no longer exists', !fs.existsSync('server/routes/calendar.ts'));
// Mounting it was the alternative fix. It would have registered an UNAUTHENTICATED
// GET/POST/PUT/DELETE /sessions ahead of the authenticated ones in server/routes.ts —
// Express serves the first match — and route-dupes.mjs cannot see that shadow, because the
// two spell the same path differently ('/sessions' vs '/api/calendar/sessions').
check('nothing mounts a router at /api/calendar', !mountedPrefixes.has('/api/calendar'),
  (mountedPrefixes.get('/api/calendar') || []).join(', '));
check('the authenticated /api/calendar/sessions handlers still stand alone',
  isMounted('GET', '/api/calendar/sessions'));

console.log('\n=== the page is in the sidebar ===');
const layout = read(LAYOUT);
// Bound the search to the sidebarItems literal, so a link elsewhere in the file cannot
// stand in for a nav row.
const itemsAt = layout.indexOf('const sidebarItems = [');
const itemsEnd = itemsAt < 0 ? -1 : layout.indexOf('\n  ];', itemsAt);
const items = itemsAt < 0 || itemsEnd < 0 ? '' : layout.slice(itemsAt, itemsEnd);
check('sidebarItems was found', !!items);
const row = items.split('\n').find((l) => !isComment(l) && l.includes("path: '/admin/calendar-sync'"));
check('it carries a row for /admin/calendar-sync', !!row);
check('the label goes through i18n, not a hardcoded English string',
  !!row && row.includes("t('nav.calendarSync')"), row ? row.trim() : '');
// lucide-react 0.323 has no CalendarSync export, so the obvious icon name for this feature
// is precisely the one that renders undefined and takes the admin shell down with it.
const icon = row ? (row.match(/icon:\s*(\w+)/) || [])[1] : undefined;
check('the row names an icon', !!icon, icon || '');
const lucideBlock = layout.slice(layout.indexOf('import {'), layout.indexOf("} from 'lucide-react'"));
check('that icon is imported in this file', !!icon && new RegExp('\\b' + esc(icon) + '\\b').test(lucideBlock), icon || '');
try {
  const lucide = createRequire(import.meta.url)('lucide-react');
  check('and it really exists in the installed lucide-react',
    !!icon && typeof lucide[icon] !== 'undefined', icon ? `${icon} is ${typeof lucide[icon]}` : '');
} catch {
  console.log('  ....  lucide-react could not be loaded here; icon existence unchecked');
}
// A sidebar row pointing at an unregistered path is a 404 with a menu entry.
const app = read(APP);
check('/admin/calendar-sync is a registered route', app.includes('path="/admin/calendar-sync"'));

console.log('\n=== the label exists in BOTH dictionaries ===');
// A key present in one and missing from the other renders the raw key string — the studio
// sees "nav.calendarSync" sitting in its sidebar.
const ctx = read(CONTEXT);
const enAt = ctx.indexOf('\n  en: {');
const deAt = ctx.indexOf('\n  de: {');
check('both dictionaries were located', enAt >= 0 && deAt > enAt);
check('nav.calendarSync is in en', enAt >= 0 && deAt > enAt && ctx.slice(enAt, deAt).includes("'nav.calendarSync':"));
check('nav.calendarSync is in de', deAt >= 0 && ctx.slice(deAt).includes("'nav.calendarSync':"));
check('neither is an empty string', !/'nav\.calendarSync':\s*['"]\s*['"]/.test(ctx));

console.log('\n=== the page is honest before anything is connected ===');
const pageLive = stripComments(read(PAGE));
// The demo tenant has no Google credentials at all, and now that the row is in the sidebar
// this is the FIRST state every studio meets.
check('it asks whether an OAuth app exists before offering to connect one',
  pageLive.includes("'/api/setup/technical/current'") && /googleOAuthManaged/.test(pageLive));
check('that probe resolves to a mounted route', isMounted('GET', '/api/setup/technical/current'));
check('an unconfigured instance is told what is missing, not shown a dead button',
  /needsSetup\s*\?/.test(pageLive) && /settings\/google/.test(pageLive));
check('and it points at a route that exists', app.includes('path="/admin/settings/google"'));
// The server already explains itself ("Google is not configured on this instance…"); the
// page used to throw a generic "make sure you are signed in" over the top of it, sending
// studios to check their login when the credentials were what was missing.
const connectAt = pageLive.indexOf('const handleConnect');
const connectBody = connectAt < 0 ? '' : pageLive.slice(connectAt, pageLive.indexOf('\n  };', connectAt));
check("a failed connect surfaces the server's own reason",
  /res\.json\(\)\.catch/.test(connectBody) && /data\.error/.test(connectBody));
// A status that could not be read is not a connected one. `!!status && !status.connected`
// treated null as "not not-connected" and painted a green Connected dot with a Sync-now
// button over a session that had already expired.
check('an unreadable status is not rendered as Connected',
  !/!!status\s*&&\s*!status\.connected/.test(pageLive) && /!status\?\.connected/.test(pageLive));
check('and it says why the status is unknown', /statusError/.test(pageLive));

if (deadUnreachable.length) {
  reportUnreachable(deadUnreachable.map((c) => `${c.file}:${c.line}  ${c.method} ${c.url}`));
  console.log('    (nothing imports these, so no studio can reach the call — delete with the file)');
}

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED\n`
  : '\n  ALL CHECKS PASSED — Calendar Sync works, is reachable, and admits when it is not configured\n');
process.exit(bad ? 1 : 0);
