// Does every /api/… the client calls actually exist on the server, with that verb?
//
// This class of bug has shipped four times here and is invisible to every build, because
// a URL is only a string:
//   /api/auth/google              the wizard's Google button — the route is
//                                 /api/auth/google/connect, so the popup showed
//                                 {"error":"API endpoint not found"} and spun for ever
//   /api/crm/clients/:id DELETE   the Clients page's delete — no handler, so the row
//                                 stays and the owner sees "An error occurred"
//   /api/admin/notifications/clear    "Clear all", on EVERY admin page
//   /api/settings/payment-methods     PaymentTracker's custom methods
//
// THREE THINGS THIS GOT WRONG BEFORE IT GOT RIGHT — worth knowing before extending it:
//
//  1. Trusting mount prefixes. "Anything under app.use('/api/x') exists" seems safe until
//     server/routes.ts turns out to contain app.use('/api', i18nRoutes) — a mount at /api
//     itself. Then every URL in the product "exists", and the checker passes for ever
//     while checking nothing. Routers are followed to their files instead.
//
//  2. Regexing app.use(). Inline middleware defeats it:
//         app.use('/api/setup', async (req, res, next) => { … }, setupRoutes)
//     Those arrows span many lines and carry their own parens and quotes, so a pattern
//     expecting "prefix, identifier" simply fails — and every route under that mount gets
//     reported missing. Forty-seven false alarms, on routes called minutes earlier.
//     Parentheses are matched properly now.
//
//  3. Ignoring the HTTP verb. /api/setup/basics is POST-only, so probing it with GET
//     returns 404 and looks like a missing endpoint. About forty findings were that
//     mistake. Both sides carry the method now.
//
// It errs toward silence: an unresolvable mount contributes nothing rather than
// guessing, so this under-reports rather than crying wolf. A checker that cries wolf
// gets switched off, and then it protects nothing at all.
import fs from 'fs';
import path from 'path';

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

const resolveModule = (fromFile, spec) => {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const c of [base + '.ts', base + '.tsx', path.join(base, 'index.ts')]) {
    if (fs.existsSync(c)) return c;
  }
  return null;
};

/** Entries look like "GET /api/thing". */
const routes = new Set();

for (const f of walk('server').filter((x) => /\.ts$/.test(x))) {
  const src = fs.readFileSync(f, 'utf8');

  for (const m of src.matchAll(/app\.(get|post|put|patch|delete)\(\s*["'`](\/[^"'`]*)["'`]/g)) {
    routes.add(m[1].toUpperCase() + ' ' + (m[2].replace(/\/+$/, '') || '/'));
  }

  const origin = new Map();
  for (const m of src.matchAll(/import\s+(\w+)\s+from\s+["'](\.[^"']+)["']/g)) origin.set(m[1], m[2]);
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*\(await import\(["'](\.[^"']+)["']\)\)\.default/g)) origin.set(m[1], m[2]);
  for (const m of src.matchAll(/const\s+\{\s*default:\s*(\w+)\s*\}\s*=\s*await import\(["'](\.[^"']+)["']\)/g)) origin.set(m[1], m[2]);

  for (const m of src.matchAll(/app\.use\(/g)) {
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
    const prefix = pm ? pm[1].replace(/\/+$/, '') : '';
    const tail = args.slice(pm ? pm[0].length : 0);
    const idm = tail.match(/([A-Za-z_$][\w$]*)\s*,?\s*$/);
    if (!idm) continue;

    const file = origin.has(idm[1]) ? resolveModule(f, origin.get(idm[1])) : null;
    if (!file) continue;
    const rs = fs.readFileSync(file, 'utf8');
    for (const r of rs.matchAll(/router\.(get|post|put|patch|delete)\(\s*["'`](\/[^"'`]*)["'`]/g)) {
      routes.add(r[1].toUpperCase() + ' ' + ((prefix + r[2]).replace(/\/+$/, '') || '/'));
    }
  }
}

const verbOf = (e) => e.slice(0, e.indexOf(' '));
const pathOf = (e) => e.slice(e.indexOf(' ') + 1);
const apiRoutes = [...routes].filter((r) => pathOf(r).startsWith('/api'));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, (c) => '\\' + c);

const matches = (method, url) => {
  if (routes.has(method + ' ' + url)) return true;
  for (const r of apiRoutes) {
    if (verbOf(r) !== method) continue;
    const rp = pathOf(r);
    if (rp.includes(':')) {
      const rx = new RegExp('^' + rp.split('/').map((s) => (s.startsWith(':') ? '[^/]+' : esc(s))).join('/') + '$');
      if (rx.test(url)) return true;
    }
    // The client builds /api/x/${id}; the captured literal stops at the ${, so a route
    // one segment deeper counts as covering it.
    if (rp.startsWith(url + '/')) return true;
  }
  return false;
};

const calls = [];
for (const f of walk('client/src').filter((x) => /\.(ts|tsx)$/.test(x))) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/["'`](\/api\/[A-Za-z0-9_\-/.]*)/g)) {
      const url = m[1].replace(/\/+$/, '');
      if (url === '/api') return;
      const near = lines.slice(i, i + 6).join(' ');
      const v = near.match(/method:\s*["'`](GET|POST|PUT|PATCH|DELETE)["'`]/i);
      calls.push({ file: f, line: i + 1, url, method: v ? v[1].toUpperCase() : 'GET' });
    }
  });
}

const seen = new Map();
for (const c of calls) {
  if (matches(c.method, c.url)) continue;
  const key = c.method + ' ' + c.url;
  if (!seen.has(key)) seen.set(key, []);
  seen.get(key).push(c.file.split(path.sep).join('/').replace('client/src/', '') + ':' + c.line);
}

console.log(`\n  server: ${apiRoutes.length} /api routes (method + path, direct and router-mounted)`);
console.log(`  client: ${calls.length} references, ${new Set(calls.map((c) => c.method + c.url)).size} distinct\n`);

if (!seen.size) {
  console.log('  every /api call the client makes resolves to a registered route\n');
  process.exit(0);
}
console.log(`  ${seen.size} CALL(S) WITH NO MATCHING ROUTE:\n`);
for (const [key, where] of [...seen].sort()) {
  console.log(`    ${key}`);
  for (const w of where.slice(0, 3)) console.log(`        ${w}`);
  if (where.length > 3) console.log(`        …and ${where.length - 3} more`);
}
console.log('');
process.exit(1);
