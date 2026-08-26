// Who pays for each AI call.
//
// The model has always been written down: the PLATFORM pays for the one-off site build, so a
// prospective studio sees their rebuilt website before configuring anything; the STUDIO's own
// key pays for everything ongoing.
//
// It was implemented in one place. Counted across the server, 27 OpenAI clients were
// constructed, 20 read process.env.OPENAI_API_KEY directly, and exactly two resolved
// tenant-first — so blog writing, translation, alt text and page generation billed the
// platform for the life of every tenant, and a studio who entered their own key had no way to
// take over their own spend.
//
// The split now lives in server/lib/openaiClient.ts as two named functions. This checks that
// nothing has gone round it, because a rule expressed in one file is only a rule while
// everything uses that file.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const read = (p) => readFileSync(p, 'utf8');

/**
 * Blank out comments, WITHOUT deleting code that merely looks like one.
 *
 * This was `src.replace(/\/\*[\s\S]*?\*\//g, ' ')` plus a line-comment regex, and it was
 * catastrophically wrong on real source. `'https://x'` contains `//`, so everything after it on
 * that line vanished — including endpoint paths the purpose check needed to see. Worse, any
 * string containing `/*` opened a block comment that ran until the next `*​/` anywhere in the
 * file: a review measured roughly 160KB of server code being deleted before the checks looked at
 * it, including server/routes.ts 2159-3941 and server/index.ts 235-1315.
 *
 * A guard that silently stops reading two thirds of a file passes for reasons that have nothing
 * to do with the code being correct. So this walks the source character by character, tracking
 * whether it is inside a string, a template literal, a regex, or a comment, and replaces only
 * genuine comment bytes with spaces — preserving offsets so line numbers and windows still line
 * up with the original.
 */
function stripComments(src) {
  const out = Array.from(src);
  let i = 0;
  const n = src.length;
  let state = 'code'; // code | line | block | sq | dq | tpl | re
  // Whether a `/` here starts a regex or is a division operator. Regex literals matter because
  // one can contain // or /* — e.g. /https:\/\//g.
  const regexAllowedAfter = /[=(,:[!&|?{};+\-*%~^<>]|return|typeof|case|in|of|new|delete|void|instanceof$/;
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (state === 'code') {
      if (c === '/' && c2 === '/') { state = 'line'; out[i] = ' '; out[i + 1] = ' '; i += 2; continue; }
      if (c === '/' && c2 === '*') { state = 'block'; out[i] = ' '; out[i + 1] = ' '; i += 2; continue; }
      if (c === "'") { state = 'sq'; i++; continue; }
      if (c === '"') { state = 'dq'; i++; continue; }
      if (c === '`') { state = 'tpl'; i++; continue; }
      if (c === '/') {
        const before = src.slice(Math.max(0, i - 12), i).trimEnd();
        if (before === '' || regexAllowedAfter.test(before)) { state = 're'; i++; continue; }
      }
      i++; continue;
    }
    if (state === 'line') {
      if (c === '\n') { state = 'code'; i++; continue; }
      out[i] = ' '; i++; continue;
    }
    if (state === 'block') {
      if (c === '*' && c2 === '/') { state = 'code'; out[i] = ' '; out[i + 1] = ' '; i += 2; continue; }
      if (c !== '\n') out[i] = ' ';
      i++; continue;
    }
    // Inside a string / template / regex: copy verbatim, honour escapes, find the terminator.
    if (c === '\\') { i += 2; continue; }
    if (state === 'sq' && c === "'") { state = 'code'; i++; continue; }
    if (state === 'dq' && c === '"') { state = 'code'; i++; continue; }
    if (state === 'tpl' && c === '`') { state = 'code'; i++; continue; }
    if (state === 're' && c === '/') { state = 'code'; i++; continue; }
    // An unterminated string cannot span a newline in valid JS; recover rather than eat the file.
    if ((state === 'sq' || state === 'dq' || state === 're') && c === '\n') { state = 'code'; i++; continue; }
    i++;
  }
  return out.join('');
}

/**
 * The text of the call expression containing `index`.
 *
 * Walks back to the `(` that opens the enclosing call, then forward to its match, counting
 * depth and ignoring anything inside quotes. Returns the whole argument list, so a check can
 * ask "does THIS call name a purpose" rather than "is the word purpose somewhere nearby".
 *
 * Falls back to a bounded slice if the parentheses do not balance, so a parse quirk degrades
 * to the old behaviour rather than throwing the whole verifier.
 */
function enclosingCall(code, index) {
  let open = -1, depth = 0;
  for (let i = index; i >= 0 && index - i < 4000; i--) {
    const c = code[i];
    if (c === ')') depth++;
    else if (c === '(') {
      if (depth === 0) { open = i; break; }
      depth--;
    }
  }
  if (open < 0) return code.slice(index, index + 600);

  let d = 0, q = null;
  for (let i = open; i < code.length && i - open < 20000; i++) {
    const c = code[i];
    if (q) {
      if (c === '\\') { i++; continue; }
      if (c === q) q = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '(') d++;
    else if (c === ')') { d--; if (d === 0) return code.slice(open, i + 1); }
  }
  return code.slice(open, Math.min(code.length, open + 4000));
}

let failed = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!ok) failed++;
};

console.log('\nAI billing split\n');

const RESOLVER = 'server/lib/openaiClient.ts';
const resolver = read(RESOLVER);

check('there is one place the split lives',
  resolver.includes('export async function tenantOpenAI')
  && resolver.includes('export async function platformOpenAI'));

// The order that was wrong in the only place this used to exist. env is set on every
// deployment because onboarding needs it, so reading it first means it is ALWAYS present and
// a tenant key is never reached.
// Compared in CODE, not in prose. The doc comment at the top of the resolver names
// process.env.OPENAI_API_KEY while explaining the bug, which put it before config.get in the
// raw text and failed this check on correct code. Third time a check has been fooled by a
// comment quoting the thing it forbids.
const resolverCode = resolver
  .split(/\r?\n/)
  .filter((l) => {
    const t = l.trim();
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
  })
  .join('\n');
check('the studio path reads the tenant key first',
  resolverCode.indexOf("config.get('openai_api_key')") < resolverCode.indexOf('process.env.OPENAI_API_KEY'),
  'env first means env always wins');

// The body of platformOpenAI, extracted once and asserted against three times below.
const platformBody = (() => {
  const start = resolverCode.indexOf('export async function platformOpenAI');
  if (start < 0) return '';
  const end = resolverCode.indexOf('\n}', start);
  return end < 0 ? resolverCode.slice(start) : resolverCode.slice(start, end);
})();

// A platform call falling back to a tenant key would charge the studio for the sales pitch.
//
// Scoped to the FUNCTION. This was `!/platformOpenAI[\s\S]*?config\.get/` — a scan for the
// literal `config.get` anywhere after the first mention of the name — which is wrong in both
// directions. It passed while platformOpenAI did the forbidden thing by another route entirely
// (reading a tenant-writable env slot), and then failed the moment an unrelated tenant-side
// helper was added BELOW it in the same file. Text order is not scope.
check('the platform path never falls back to a tenant key',
  platformBody.length > 0
  && !platformBody.includes('config.get')
  && !/\b(require)?[tT]enantOpenAI/.test(platformBody),
  'the studio must never fund the sales pitch');

// ── The platform's key comes from a slot no tenant can write ────────────────
//
// The check above asks whether platformOpenAI calls config.get. It passed for months while the
// function was doing the forbidden thing by another route entirely: reading
// process.env.OPENAI_API_KEY, which IS a tenant value. technical-setup-routes writes the
// studio's key there the moment they save one, and config-reader's hydrateEnvFromDb copies it
// there at every boot on any deployment where the slot starts empty — which is precisely an
// AxixOS-provisioned tenant. So the studio funded their own sales pitch, and this file said ok.
//
// Bound to the function BODY, because "somewhere in the file" is how the original passed.
check('the platform path does not read the shared env slot',
  platformBody.length > 0 && !platformBody.includes('process.env.OPENAI_API_KEY'),
  'that variable is tenant-writable; a studio saving a key would fund their own onboarding');

check('the platform key is captured before a tenant can overwrite it',
  resolverCode.includes('PLATFORM_OPENAI_API_KEY')
  && /const PLATFORM_KEY_AT_BOOT\s*=/.test(resolverCode),
  'an explicit platform slot, and a boot snapshot for deployments that have not set one');

check('and it says so when the platform is paying for ongoing work',
  resolver.includes('bills to the PLATFORM key'));

// ── Nothing goes round it ───────────────────────────────────────────────────
//
// Walk the server tree and find any client still built straight from the environment. The
// resolver itself is the one place allowed to read that variable.
const ALLOWED = new Set([
  RESOLVER.replace(/\\/g, '/'),
  // Reference implementation, predates the resolver and resolves correctly by hand. Left
  // alone deliberately rather than churned; it is the behaviour the resolver was copied from.
  'server/routes/agent-v2.ts',
]);

// UNREFERENCED. Not excused — reported, every run, at the bottom of this file.
//
// Both are imported by nothing: `grep -rl` across server/ finds no other file that mentions
// them. Converting them introduced type errors in code nobody executes, which is effort spent
// making dead code compile. They are listed rather than silently allowed so the decision to
// delete or convert stays visible instead of decaying into a permanent exception.
const DEAD = new Set([
  'server/autoblog-fixed.ts',
  'server/autoblog-utils.ts',
]);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.ts')) out.push(p.replace(/\\/g, '/'));
  }
  return out;
};

const offenders = [];
const deadOffenders = [];
for (const f of walk('server')) {
  if (ALLOWED.has(f)) continue;
  const src = read(f);
  // Comments may discuss the variable; code may not construct a client from it.
  const code = stripComments(src);
  if (!/new OpenAI\(\s*\{\s*apiKey:\s*process\.env\.OPENAI_API_KEY/.test(code)) continue;
  (DEAD.has(f) ? deadOffenders : offenders).push(f);
}

check('no live call site builds a client straight from the environment',
  offenders.length === 0,
  offenders.length ? offenders.map((f) => f.replace('server/', '')).join(', ') : 'all resolved through openaiClient');

// Printed rather than checked. If one of these is ever imported again it stops being dead and
// starts being a billing bug, so the reminder is deliberately noisy.
if (deadOffenders.length) {
  console.log('');
  console.log('  note  unreferenced files still reading the environment directly:');
  for (const f of deadOffenders) console.log(`          ${f.replace('server/', '')}  — delete, or convert if it comes back`);
}

// ── The three that are genuinely the platform's ─────────────────────────────
//
// Onboarding only. Everything else a studio does is theirs to fund.
const PLATFORM_PAID = [
  'server/lib/landing-generator.ts',
  'server/lib/authority-map-generator.ts',
  'server/lib/authority-from-crawl.ts',
];
// `tenantOpenAI(` does not match `requireTenantOpenAI(` — different first letter — so the
// tighter of the two tenant resolvers was the one this check could not see. A generator moved
// onto it would have billed the studio for the sales pitch and passed here.
const wrongSide = PLATFORM_PAID.filter((f) => /\b(require)?[tT]enantOpenAI\(/.test(stripComments(read(f))));
check('the onboarding generators are not billed to the studio',
  wrongSide.length === 0,
  wrongSide.join(', ') || `${PLATFORM_PAID.length} generators`);

// ── Using the resolver means USING it ───────────────────────────────────────
//
// Two ways a converted file kept the old behaviour while looking converted.
//
// ONE: gate on the env var first. translate.ts read `!process.env.OPENAI_API_KEY` and returned
// the source text before tenantOpenAI was ever called. On an AxixOS-provisioned tenant that
// variable is deliberately unset and the studio's key is in the database — so translation
// silently returned untranslated German and the tenant wiring below it was unreachable code.
// The file imported the resolver, called the resolver, and never reached it.
const gatedOnEnv = [];
// TWO: memoise the resolved CLIENT at module scope. That pins the payer for the life of the
// process: a studio whose first call fell back to the platform's key keeps billing the platform
// after entering their own, until somebody redeploys. It is the exact bug the split exists to
// remove, reintroduced one layer down by a cache. Caching is also pointless here — config.get
// already caches for 60s and the SDK constructor is cached inside the resolver.
const cachedClients = [];
// THREE, and the one v1.9.153 never looked for: authenticate a raw fetch with the env var.
//
// That commit swept for `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })` and reported the
// server clean. A raw `fetch('https://api.openai.com/...', { Authorization: Bearer ${...} })` is
// every bit as much a call site and every bit as much a billing decision, and it was invisible
// to the sweep. So the split was reported complete while a large part of the server still paid
// out of the platform's pocket — and on a provisioned tenant, which has no OPENAI_API_KEY at
// all, these send the literal string "Bearer undefined".
const rawHttp = [];

// validateEnv reports what the ENVIRONMENT contains at boot. Reading the variable is its whole
// job, and it makes no AI call, so it is not a billing decision.
const ENV_READERS_OK = new Set(['server/lib/validateEnv.ts']);

for (const f of walk('server')) {
  if (f === RESOLVER.replace(/\\/g, '/') || ENV_READERS_OK.has(f)) continue;
  const code = stripComments(read(f));
  // Bound to GATING, not to mention. Reporting whether the platform key is set is legitimate —
  // capabilities.ts ORs it with the studio's stored key, and a diagnostics readout should say
  // what it sees. What is never legitimate is REFUSING on it, or authenticating with it, before
  // the resolver has been asked. Those are the two shapes below.
  const gates = [
    /if\s*\(\s*!\s*process\.env\.OPENAI_API_KEY\s*\)/, // if (!KEY) return ...
    /!\s*process\.env\.OPENAI_API_KEY\s*\)\s*(return|throw)/,
    /\|\|\s*!\s*process\.env\.OPENAI_API_KEY/, // ... || !KEY) return src
    /if\s*\(\s*process\.env\.OPENAI_API_KEY\s*&&/, // if (KEY && x) do-the-work
  ];
  if (gates.some((re) => re.test(code))) {
    gatedOnEnv.push(f.replace('server/', ''));
  }

  // Counted separately, because it is a different defect with a different fix.
  const bearer = code.match(/Bearer\s*\$\{\s*process\.env\.OPENAI_API_KEY/g);
  if (bearer) rawHttp.push([f.replace('server/', ''), bearer.length]);
  // A module-scope `let x: OpenAI | null = null` is the memoisation idiom. Column 0 matters:
  // the same declaration inside a function is a local and pins nothing.
  if (/^(let|var)\s+\w+\s*:\s*OpenAI\s*\|\s*null/m.test(code) && /await\s+(require)?[tT]enantOpenAI\(/.test(code)) {
    cachedClients.push(f.replace('server/', ''));
  }
}

check('no converted file still gates on the environment variable',
  gatedOnEnv.length === 0,
  gatedOnEnv.length ? gatedOnEnv.join(', ') : 'the resolver decides, not a variable it ignores');

check('the resolved client is not cached for the life of the process',
  cachedClients.length === 0,
  cachedClients.length ? cachedClients.join(', ') : 'a studio can take over their own spend without a redeploy');

const rawTotal = rawHttp.reduce((n, [, c]) => n + c, 0);
check('raw HTTP calls authenticate through the resolver too',
  rawTotal === 0,
  rawTotal
    ? `${rawTotal} Bearer header(s) read the env var directly — ${rawHttp.map(([f, c]) => `${f} x${c}`).join(', ')}`
    : 'no call site bypasses the split by using fetch instead of the SDK');

// ── Who pays for a crawl ────────────────────────────────────────────────────
//
// The gateway reads the payer from the `purpose` in the request body, NOT from the key that
// presented it — one tenant key funds both sides. So the purpose is the billing decision.
//
// The trap this guards: ONE method, TWO payers. readPageText() reads the studio's own site
// during onboarding, which the platform funds because nobody has agreed to anything yet, and
// it reads a competitor's price page, which the studio funds because they asked for it. Both
// calls succeed whichever purpose is sent, so getting it wrong is invisible until an invoice.
const crawler = read('server/lib/site-crawler.ts');
const axixos = read('server/services/AxixosSearchService.ts');

check('the onboarding crawl is funded by the platform',
  crawler.includes("'crawl.onboarding'") && !crawler.includes("'crawl.competitor'"),
  'reading a studio own site before they have agreed to anything');

// Asserts the VALUE, not that an identifier exists. This checked `axixos.includes('SEARCH_COMPETITOR')`,
// which is satisfied by the constant being declared — including one retargeted to a
// platform-funded purpose, which is the only change that would actually matter here.
const searchConst = (stripComments(axixos).match(/const SEARCH_COMPETITOR\s*=\s*'([^']+)'/) || [])[1];
check('competitor research is funded by the studio',
  axixos.includes("purpose: 'crawl.competitor'") && searchConst === 'search.competitor',
  searchConst ? `search purpose is ${searchConst}` : 'SEARCH_COMPETITOR is not a literal');

// Required positional argument, so omission is TS2554 and a non-crawl purpose is TS2345 —
// the compiler enforces the payer, not this file. This only checks the shape stays that way.
//
// The old form was a substring test for `readPageText(url: string, purpose: CrawlPurpose`,
// which is a PREFIX of the very signature it exists to forbid: adding
// ` = 'crawl.competitor'` still contains it, so a defaulted payer passed the check named
// "the crawl payer cannot be defaulted". The parameter list is read and the default rejected.
const readPageSig = (stripComments(axixos).match(/readPageText\(([^)]*)\)/) || [, ''])[1];
check('the crawl payer cannot be defaulted',
  /purpose\s*:\s*CrawlPurpose\s*(,|$)/.test(readPageSig.trim()),
  readPageSig.includes('purpose') ? `signature: ${readPageSig.trim()}` : 'no purpose parameter at all');

// ── Every AxixOS call names a purpose ───────────────────────────────────────
//
// A tenant key MUST name one: omitting it is a 400 unknown_purpose rather than a silent
// default, because guessing the payer would defeat having a payer rule at all.
//
// Checked across the whole tree rather than in AxixosSearchService, because the call that
// broke this was the one that did NOT go through the service — the Price Wizard diagnostic is
// a raw fetch, so it inherited nothing, and would have reported "AxixOS discovery is failing"
// on an instance where discovery worked fine.
const endpointMisses = [];
for (const f of walk('server')) {
  const src = read(f);
  // Comments name these paths while documenting them; only real calls matter.
  const code = stripComments(src);
  const re = /\/v1\/(search|crawl)\/[a-z]+/g;
  let m;
  while ((m = re.exec(code))) {
    // Bounded by the CALL, not by a character count.
    //
    // This was `code.slice(m.index, m.index + 600)`, and the number was wrong in both
    // directions. Too far and a call with no purpose passes on its NEIGHBOUR's purpose; too
    // near and correct code fails — which is exactly what happened the moment comments started
    // being blanked rather than deleted, because a seven-line explanation between the path and
    // the body pushed a real `purpose` past 600 characters of preserved offsets.
    //
    // A magic number cannot express "this call names its purpose". Balanced parentheses can.
    const call = enclosingCall(code, m.index);
    if (!call.includes('purpose')) {
      endpointMisses.push(`${f.replace('server/', '')} ${m[0]}`);
    }
  }
}
check('every AxixOS search and crawl call names a purpose',
  endpointMisses.length === 0,
  endpointMisses.length ? endpointMisses.join(', ') : 'a tenant key 400s without one');

// ── The gateway seam ────────────────────────────────────────────────────────
//
// AxixOS smarthub exposes POST /v1/ai/complete with a server-side purpose registry, a
// per-tenant lifetime budget and fail-closed metering. When it lands, platformOpenAI is the
// only thing that changes — which is only true while every platform-funded call comes
// through it.
check('the gateway has one seam to land in',
  resolver.includes('/v1/ai/complete'),
  'documented where the change will be made');

console.log(`\n  ${failed === 0 ? 'all checks passed' : failed + ' FAILED'}\n`);
process.exit(failed === 0 ? 0 : 1);
