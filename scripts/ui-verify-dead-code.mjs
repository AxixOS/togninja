// Did the dead-code sweep delete the dead twin, or the live one?
//
// 24 unreachable modules (13,333 lines) were removed from client/src. Three of them shared
// a BASENAME with a file that is still shipping:
//
//   components/admin/InvoiceTemplate.tsx   (deleted)  vs  components/invoice/InvoiceTemplate.tsx  (live, public /invoice/:id)
//   pages/invoices/InvoicesPage.tsx        (deleted)  vs  pages/admin/InvoicesPage.tsx            (live, /admin/invoices)
//   pages/admin/PhotographyCalendarPage.tsx(deleted)  vs  pages/admin/PhotographyCalendarPageSimple.tsx (live, /admin/calendar)
//
// and the third is worse than a collision, it is an ALIAS: App.tsx binds the local name
// `PhotographyCalendarPage` to an import of `PhotographyCalendarPageSimple`. Anyone who
// greps App.tsx for the deleted file's name finds two live <PhotographyCalendarPage />
// renders and concludes the deletion broke /admin/calendar — or reverses the reasoning and
// deletes `…Simple`, which really would break it.
//
// scripts/lib/reachable.mjs cannot arbitrate any of this: it is basename-keyed on purpose,
// so both twins look identical to it and the alias makes the dead name look imported. This
// guard therefore carries its own resolver — tsconfig `@/` and `@shared/` aliases, relative
// paths, implicit extensions, index files — and walks the real graph from the single entry
// (client/index.html:112 -> client/src/main.tsx).
//
// The last section reports, without failing, the category an import graph is structurally
// BLIND to: a page App.tsx imports but no route ever renders. Those ship to every visitor
// and can never appear. Two exist today and are deliberately left for the owner to rule on,
// so this is a report and not a check — a guard that stays red is wallpaper.
//
// Run: node scripts/ui-verify-dead-code.mjs
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'client/src').split(path.sep).join('/');
const ENTRY = `${SRC}/main.tsx`;
const norm = (p) => p.split(path.sep).join('/');
const rel = (p) => p.startsWith(SRC + '/') ? p.slice(SRC.length + 1) : p.slice(ROOT.length + 1);

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

// ── A real module resolver ───────────────────────────────────────────────────
const EXTS = ['', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs',
  '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];

function resolve(spec, fromFile) {
  let base;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('@shared/')) base = path.join(ROOT, 'shared', spec.slice(8));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // bare package specifier — node_modules, not ours
  base = norm(base);
  for (const e of EXTS) {
    const c = base + e;
    try { if (fs.statSync(c).isFile()) return c; } catch { /* next candidate */ }
  }
  return null;
}

// Every specifier form that creates a module edge. Comments are deliberately NOT stripped
// here: counting a commented-out import as a live edge can only make a file look MORE
// reachable, and for a tool that decides what may be deleted that is the safe error.
const SPEC_RE = new RegExp([
  /(?:^|[^\w$])from\s*['"]([^'"]+)['"]/,
  /(?:^|[^\w$])import\s*['"]([^'"]+)['"]/,
  /(?:^|[^\w$])import\s*\(\s*['"]([^'"]+)['"]\s*\)/,
  /(?:^|[^\w$])require\s*\(\s*['"]([^'"]+)['"]\s*\)/,
].map((r) => r.source).join('|'), 'g');

const specifiersOf = (src) =>
  [...src.matchAll(SPEC_RE)].map((m) => m.slice(1).find((x) => x !== undefined)).filter(Boolean);

const CODE = /\.(tsx|ts|jsx|js|mjs|cjs)$/;
const reached = new Set([ENTRY]);
const queue = [ENTRY];
while (queue.length) {
  const f = queue.shift();
  let src;
  try { src = fs.readFileSync(f, 'utf8'); } catch { continue; }
  for (const spec of specifiersOf(src)) {
    const r = resolve(spec, f);
    if (r && !reached.has(r)) { reached.add(r); if (CODE.test(r)) queue.push(r); }
  }
}

// ── 1. The deleted modules stay deleted ──────────────────────────────────────
// Every path here was proved unreachable from the entry with zero inbound specifiers
// repo-wide. This section was RED before the sweep and is the one that asserts it happened.
const DELETED = [
  // voucher admin — AdminVoucherSalesPageV3 is the survivor
  'pages/admin/AdminVoucherSalesPage.tsx',
  'pages/admin/AdminVoucherSalesPageV2.tsx',
  'pages/admin/VoucherManagementPage.tsx',
  // calendar: the NextGen stack, root first
  'pages/calendar/CalendarPage.tsx',
  'components/calendar/NextGenCalendar.tsx',
  'components/calendar/ICalIntegration.tsx',
  'api/calendar.ts',
  // calendar: the AdminCalendarPage pair
  'pages/admin/AdminCalendarPage.tsx',
  'pages/admin/AdminCalendarPageV2.tsx',
  // calendar: the iCal helper pair
  'components/calendar/CalendarIntegration.tsx',
  'lib/calendar.ts',
  // calendar: standalone orphans
  'pages/admin/PhotographyCalendarPage.tsx',
  'components/calendar/PhotographyCalendar.tsx',
  'components/calendar/SessionForm.tsx',
  'pages/CalendarPage.tsx',
  'components/calendar/GoogleCalendarSyncSettings.tsx',
  // invoice
  'pages/invoices/InvoicesPage.tsx',
  'components/invoice/PriceListModal.tsx',
  'components/admin/InvoiceViewer.tsx',
  'components/admin/InvoiceTemplate.tsx',
  'components/admin/InvoiceForm.tsx',
  'lib/invoice-api.ts',
  'pages/admin/AdminInvoicesPage.tsx',
  'pages/admin/InvoicesPageSimple.tsx',
];

console.log(`\n=== the ${DELETED.length} proven-dead modules are gone ===`);
const resurrected = DELETED.filter((p) => fs.existsSync(`${SRC}/${p}`));
check('none of them is back on disk', resurrected.length === 0,
  resurrected.length ? resurrected.join(', ') : `${DELETED.length}/${DELETED.length} absent`);

// ── 2. The live twins survived ───────────────────────────────────────────────
// The mirror image of section 1, and the reason it is safe to act on. Deleting the WRONG
// half of any collision pair turns this red instead of turning a customer-facing page white.
const LIVE_TWINS = {
  'components/invoice/InvoiceTemplate.tsx': 'public /invoice/:invoiceId — NOT the deleted components/admin/ one',
  'pages/admin/InvoicesPage.tsx': 'route /admin/invoices — NOT the deleted pages/invoices/ one',
  'pages/admin/PhotographyCalendarPageSimple.tsx': 'route /admin/calendar — the alias target',
  'pages/admin/AdminVoucherSalesPageV3.tsx': 'route /admin/voucher-sales',
  'pages/PublicInvoicePage.tsx': 'imports the surviving InvoiceTemplate',
  'components/admin/AdvancedInvoiceForm.tsx': 'pulled in by the live admin InvoicesPage',
  'api/invoices.ts': 'NOT the deleted lib/invoice-api.ts',
};

console.log('\n=== the live twin of every deleted file still reaches the entry ===');
for (const [p, why] of Object.entries(LIVE_TWINS)) {
  const abs = `${SRC}/${p}`;
  const ok = fs.existsSync(abs) && reached.has(abs);
  check(p, ok, ok ? why : (fs.existsSync(abs) ? 'EXISTS BUT UNREACHABLE FROM main.tsx' : 'FILE IS GONE'));
}

// ── 3. Nothing App.tsx lazy-loads has been deleted out from under it ─────────
// A route whose chunk cannot resolve is a white screen, not a build error, once the import
// is dynamic. Resolving all 69 catches a deletion-by-name before a user finds it.
const appPath = `${SRC}/App.tsx`;
const appSrc = fs.readFileSync(appPath, 'utf8');
// App.tsx is CRLF; split on whichever ending it actually uses so line numbers stay true.
const appLines = appSrc.split(appSrc.includes('\r\n') ? '\r\n' : '\n');

const lazyBindings = [];
appLines.forEach((line, i) => {
  const t = line.trim();
  if (t.startsWith('//') || t.startsWith('*')) return; // a comment quoting an old import is not an import
  const m = t.match(/const\s+(\w+)\s*=\s*(?:lazyWithRetry|React\.lazy|lazy)\(\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]/);
  if (m) lazyBindings.push({ name: m[1], spec: m[2], line: i + 1 });
});

console.log(`\n=== every route chunk App.tsx lazy-loads still resolves (${lazyBindings.length} binding(s)) ===`);
check('bindings were found at all', lazyBindings.length > 0, `${lazyBindings.length}`);
const unresolved = lazyBindings.filter((b) => !resolve(b.spec, appPath));
check('all of them resolve to a file on disk', unresolved.length === 0,
  unresolved.length ? unresolved.map((b) => `App.tsx:${b.line} ${b.spec}`).join('; ')
                    : `${lazyBindings.length}/${lazyBindings.length}`);

// ── 4. No surviving module imports a module that is not there ────────────────
// General net rather than a claim about this sweep: any future deletion that orphans an
// import shows up here as a named edge instead of a runtime crash.
console.log('\n=== no module reachable from the entry has a broken relative import ===');
const broken = [];
for (const f of reached) {
  if (!CODE.test(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  for (const spec of specifiersOf(src)) {
    if (!/^[.@]/.test(spec) || /^@[a-zA-Z]/.test(spec) && !spec.startsWith('@/') && !spec.startsWith('@shared/')) continue;
    if (!resolve(spec, f)) broken.push(`${rel(f)} -> ${spec}`);
  }
}
check('every relative/aliased import resolves', broken.length === 0,
  broken.length ? broken.slice(0, 8).join('; ') : `${reached.size} module(s) walked`);

// ── REPORTS — no exit code. Judgement calls, not defects. ────────────────────
// Imported but never rendered. Pure import reachability calls these ALIVE, which is exactly
// why the sweep could not touch them: the bundler ships them, no route can display them.
const shippedButUnrenderable = lazyBindings.filter((b) => !new RegExp(`<${b.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s/>]`).test(appSrc));
if (shippedButUnrenderable.length) {
  console.log('\n  Shipped to every visitor, renderable by no route — an owner decision, not a defect:');
  for (const b of shippedButUnrenderable) {
    const abs = resolve(b.spec, appPath);
    // Count newlines, not split() segments — a trailing newline otherwise reports one line
    // more than `wc -l` and the number stops matching anything a reader can check.
    const lines = abs ? (fs.readFileSync(abs, 'utf8').match(/\n/g) || []).length : 0;
    console.log(`    ${b.spec}  (${lines} lines, imported App.tsx:${b.line}, <${b.name} /> appears 0 times)`);
  }
}

// Alias landmines: the local name does not match the file. Every one of these defeats a
// basename grep, which is how a live page gets deleted by a confident reviewer.
const aliased = lazyBindings.filter((b) => b.spec.split('/').pop() !== b.name);
if (aliased.length) {
  console.log('\n  Local name differs from the file it imports — never delete by name here:');
  for (const b of aliased) console.log(`    App.tsx:${b.line}  ${b.name}  ->  ${b.spec}`);
}

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED — a deleted module is back, or a live twin went with it\n`
  : '\n  the dead twins are gone and every live one still reaches the entry\n');
process.exit(bad ? 1 : 0);
