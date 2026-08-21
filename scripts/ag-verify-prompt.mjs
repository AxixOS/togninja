// Every tool NAME the system prompt teaches must be a tool that exists.
// The prompt named `calendar_create` twice; the registered tool is
// calendar_create_appointment. A model taught a wrong name makes a call that always
// fails and then has to recover from its own instructions.
import fs from 'fs';
import '../agent/v2/tools/index.ts';
const { listOpenAITools } = await import('../agent/v2/core/ToolBus.ts');

// The registered NAME is not derivable from the filename — calendar.create.ts
// registers as calendar_create_appointment — so ask the registry.
//
// And do not hand-write the scope list. listOpenAITools filters by scope, so a scope
// missing from the list silently hides its tools and every assertion about them
// passes by not running. That happened twice here: first ADMIN and PRICE_RESEARCH,
// then SQL_READ and QUESTIONNAIRE_READ. Union the scopes the tools themselves
// declare, and the list cannot drift from the tools again.
const ALL_SCOPES = [...new Set(
  fs.readdirSync('agent/v2/tools')
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .flatMap((f) => [...fs.readFileSync('agent/v2/tools/' + f, 'utf8')
      .matchAll(/authz:\s*\[([^\]]*)\]/g)]
      .flatMap((m) => m[1].split(',').map((x) => x.trim().replace(/["']/g, '')).filter(Boolean))),
)];
const names = new Set(listOpenAITools(ALL_SCOPES).map((t) => t.function.name));
const src = fs.readFileSync('server/routes/agent-v2.ts', 'utf8');
const prompt = src.slice(src.indexOf('const basePrompt'));
const mentioned = [...new Set([...prompt.matchAll(/\b([a-z]+_[a-z_]{3,})\b/g)].map(m => m[1]))]
  .filter(n => /^(crm|email|invoices|calendar|clients|tasks|sessions|leads|price|general|galleries|blog|files|campaigns|voucher|payments|coupons|pricelist|bookings|messages|templates|segments|subscribers|revenue|top|client|appointments|questionnaire|workflow|lead|session|invoice)_/.test(n));

let bad = 0;
console.log(`\n  ${names.size} tool files, ${mentioned.length} tool-shaped names in the prompt\n`);
for (const m of mentioned) {
  const ok = names.has(m);
  if (!ok) { bad++; console.log(`  FAIL  prompt names "${m}" — no such tool`); }
}
console.log(bad ? `\n  ${bad} PHANTOM TOOL NAME(S)\n` : '\n  every tool the prompt names exists\n');
process.exit(bad ? 1 : 0);
