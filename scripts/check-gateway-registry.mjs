// Does our REGISTRY still say what the gateway says?
//
// server/lib/openaiClient.ts carries a mirror of the AxixOS purpose registry. It exists so the
// DIRECT fallback produces the same output as the gateway — same model, same temperature, same
// token ceiling. A drift between them is invisible in the worst way: the same studio gets a
// different homepage depending on whether AxixOS happened to be reachable that day, and nothing
// on either side reports it.
//
// This could not be checked until 27 Aug 2026. AxixOS's /v1/ai/purposes returned model and
// maxTokens but not temperature — the one field that had by then had a defect on BOTH sides
// (they pinned 0.7 on a field-extraction job; we mirrored 0.2, then 0.7, before either was
// right). They now return temperature and responseFormat, so the comparison is possible — and a
// comparison that is possible should not be done by eye.
//
//   AXIXOS_INTERNAL_API_KEY=<any valid key> node scripts/check-gateway-registry.mjs
//
// Deliberately NOT a ui-verify. Those run offline and must never need a network or a credential;
// this is an operator tool, run when you want to know whether the two have parted.
import { readFileSync } from 'fs';

const BASE = (process.env.AXIXOS_API_BASE || 'https://axixos-intelligence.onrender.com').replace(/\/+$/, '');

/** Our table, read out of the source so this cannot drift from what actually ships. */
function readOurs() {
  const src = readFileSync('server/lib/openaiClient.ts', 'utf8');
  const block = src.slice(src.indexOf('const REGISTRY'), src.indexOf('const GATEWAY_TIMEOUT_MS'));
  const out = {};
  for (const m of block.matchAll(/'(ai\.[a-z_]+)':\s*\{\s*model:\s*'([^']+)',\s*maxTokens:\s*(\d+),\s*temperature:\s*([0-9.]+)/g)) {
    out[m[1]] = { model: m[2], maxTokens: Number(m[3]), temperature: Number(m[4]) };
  }
  return out;
}

async function main() {
  const key = (process.env.AXIXOS_INTERNAL_API_KEY || '').trim();
  if (!key) {
    console.error('Set AXIXOS_INTERNAL_API_KEY. Any valid key works — a tenant key is enough, and is\n'
      + 'preferable to the console key for something you might run on a laptop.');
    return 2;
  }

  const ours = readOurs();
  if (!Object.keys(ours).length) {
    console.error('Could not read REGISTRY out of server/lib/openaiClient.ts — has its shape changed?');
    return 2;
  }

  const res = await fetch(`${BASE}/v1/ai/purposes`, { headers: { 'x-axixos-api-key': key } });
  if (!res.ok) {
    console.error(`Gateway returned ${res.status}.${res.status === 401 ? ' The key is not recognised.' : ''}`);
    return 2;
  }

  const live = await res.json();
  const theirs = Object.fromEntries(
    (live.purposes || []).filter((p) => p.kind === 'completion').map((p) => [p.purpose, p]),
  );

  console.log(`\nregistry — ours vs ${BASE}`);
  console.log(`platform credential loaded there: ${live.configured}\n`);

  let bad = 0;
  for (const [purpose, mine] of Object.entries(ours)) {
    const t = theirs[purpose];
    if (!t) {
      console.log(`  GONE  ${purpose}  — we send this and the gateway no longer lists it`);
      bad++;
      continue;
    }
    const diffs = [];
    if (t.model !== mine.model) diffs.push(`model ${mine.model} vs ${t.model}`);
    if (t.maxTokens !== mine.maxTokens) diffs.push(`maxTokens ${mine.maxTokens} vs ${t.maxTokens}`);
    // An older deployment of theirs may not expose it. Say that, rather than reporting a
    // mismatch against undefined and sending someone to fix a difference that is not there.
    if (t.temperature === undefined) diffs.push('temperature not exposed by the gateway — cannot check');
    else if (t.temperature !== mine.temperature) diffs.push(`temperature ${mine.temperature} vs ${t.temperature}`);

    if (diffs.length) {
      console.log(`  DRIFT ${purpose}  — ${diffs.join('; ')}`);
      bad++;
    } else {
      console.log(`  ok    ${purpose}  — ${mine.model} · T${mine.temperature} · ${mine.maxTokens}tk`);
    }
  }

  // Purposes they offer that we never send are fine. The reverse is not.
  const unused = Object.keys(theirs).filter((p) => !ours[p]);
  if (unused.length) console.log(`\n  note  offered but unused by us: ${unused.join(', ')}`);

  console.log(bad
    ? `\n  ${bad} purpose(s) have drifted — the fallback no longer matches the gateway\n`
    : '\n  the mirror matches the gateway\n');
  return bad ? 1 : 0;
}

// exitCode rather than exit(): forcing exit while the fetch socket is still closing trips a
// libuv assertion on Windows and reports 127 instead of the code we meant.
process.exitCode = await main();
