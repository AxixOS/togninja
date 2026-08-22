// Every endpoint the audit found open, re-tested anonymously.
//
// Six returned studio or client data to callers with no credentials, verified against the
// live instance. This asserts they are closed AND that the things which must stay open —
// the public booking widget, the public voucher list, the setup status the wizard polls
// before a session exists — still are. Closing a hole by breaking the product is not a fix.
const BASE = process.argv[2] || 'http://localhost:5199';

const MUST_BE_CLOSED = [

  ['GET', '/api/schedulers/bookings/all', 'every booking with name, email, phone, IP'],
  ['GET', '/api/debug/photography-sessions', 'up to 1000 sessions with client contact details'],
  ['GET', '/api/communications/all', 'communications log'],
  ['POST', '/api/communications/bulk/preview', 'the full client roster'],
  ['POST', '/api/communications/sms/config', 'overwrite SMS provider credentials'],
  ['POST', '/api/communications/sms/bulk', "text the studio's entire client base"],
  ['GET', '/api/files/', 'file list'],
  ['POST', '/api/leads/create', 'inject rows into the CRM'],
  ['POST', '/api/vouchers/products', 'create a sellable product'],
  ['POST', '/api/crm/price-list', 'rewrite the price list'],
  ['POST', '/api/setup/technical/email', 'take over outbound mail'],
  ['POST', '/api/price-wizard/research', 'spend the studio money on crawls'],

  // /api/print was mounted with no auth at all — the router's own comment deferred it to
  // a 'Phase 2' that never happened. The order route took an imageUrl straight from the
  // body and dispatched it to Prodigi for physical fulfilment, billed to the studio.
  ['GET', '/api/print/orders', "every print buyer's name, email, phone and postal address"],
  ['POST', '/api/print/catalog', 'create print products in the studio catalogue'],
  ['POST', '/api/print/order', 'print and ship an arbitrary image at the studio expense'],
];

const MUST_STAY_OPEN = [
  ['GET', '/api/setup/status', 'the wizard polls this before a session exists'],
  ['GET', '/api/vouchers/products', 'the public voucher page reads this'],
  ['GET', '/api/schedulers/public/does-not-exist', 'the public booking widget'],
  ['GET', '/api/studio-config', 'the public site reads this'],
];

const hit = async (method, path) => {
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: '{}' } : {}),
    });
    return res.status;
  } catch (e) {
    return 'ERR ' + e.message.slice(0, 30);
  }
};

let bad = 0;
console.log('\n=== must be CLOSED to anonymous callers ===');
for (const [m, p, why] of MUST_BE_CLOSED) {
  const s = await hit(m, p);
  // 401/403 = gated. 404 = route gone, which for the debug endpoint is the fix itself.
  const ok = s === 401 || s === 403 || s === 404;
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${String(s).padEnd(4)} ${m.padEnd(4)} ${p.padEnd(38)} ${ok ? '' : '<- STILL OPEN: ' + why}`);
}

console.log('\n=== must stay OPEN (closing these would break the product) ===');
for (const [m, p, why] of MUST_STAY_OPEN) {
  const s = await hit(m, p);
  // 404 is fine for the deliberately-nonexistent scheduler slug: it means the route ran.
  const ok = s !== 401 && s !== 403;
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${String(s).padEnd(4)} ${m.padEnd(4)} ${p.padEnd(38)} ${ok ? '' : '<- BROKE: ' + why}`);
}

// /api/setup/technical/current answers 200 by design on a fresh install — the wizard
// needs it before any admin exists. What must never leak is the IDENTIFIER half of the
// studio credentials, so assert the values rather than the status code.
console.log(String.fromCharCode(10) + "=== /current: identifiers must be blanked for an anonymous caller ===");
try {
  const j = await (await fetch(BASE + "/api/setup/technical/current")).json();
  for (const key of ["email.smtpHost", "email.smtpUser", "email.fromEmail",
                     "storage.accessKeyId", "storage.bucket", "storage.endpoint"]) {
    const [a, b] = key.split(".");
    const v = String(j?.[a]?.[b] ?? "");
    const ok = v === "" || v === "••••••••";
    if (!ok) bad++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${key.padEnd(24)} ${ok ? "blanked" : "LEAKED: " + v.slice(0, 10) + "..."}`);
  }
} catch (e) { bad++; console.log("  FAIL  could not read /current: " + e.message); }
console.log(bad ? `\n  ${bad} PROBLEM(S)\n` : '\n  ALL CLOSED, NOTHING BROKEN\n');
process.exit(bad ? 1 : 0);
