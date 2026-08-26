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

// A platform call falling back to a tenant key would charge the studio for the sales pitch.
check('the platform path never falls back to a tenant key',
  !/platformOpenAI[\s\S]*?config\.get/.test(resolver));

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
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
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
const wrongSide = PLATFORM_PAID.filter((f) => read(f).includes('tenantOpenAI('));
check('the onboarding generators are not billed to the studio',
  wrongSide.length === 0,
  wrongSide.join(', ') || `${PLATFORM_PAID.length} generators`);

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

check('competitor research is funded by the studio',
  axixos.includes("purpose: 'crawl.competitor'") && axixos.includes('SEARCH_COMPETITOR'),
  'they asked for it, so they fund it');

// Required positional argument, so omission is TS2554 and a non-crawl purpose is TS2345 —
// the compiler enforces the payer, not this file. This only checks the shape stays that way.
check('the crawl payer cannot be defaulted',
  axixos.includes('readPageText(url: string, purpose: CrawlPurpose'),
  'purpose is required, so it cannot be got wrong by omission');

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
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const re = /\/v1\/(search|crawl)\/[a-z]+/g;
  let m;
  while ((m = re.exec(code))) {
    // The body follows the path within a few lines. Deliberately generous — a window too
    // short produces a false FAIL, which is noisy but safe; too long produces a false PASS.
    if (!code.slice(m.index, m.index + 600).includes('purpose')) {
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
