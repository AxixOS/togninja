// Can this instance take a payment at all?
//
// It could not, and nothing said so.
//
// server/routes.ts builds its Stripe client at MODULE scope from process.env
// (routes.ts:1236, :1243), and server/index.ts:15 imports routes STATICALLY — so that runs
// before index.ts:380 calls hydrateEnvFromDb(), which is what copies a wizard-onboarded
// studio's saved credentials out of studio_integrations into process.env.
//
// A studio that entered its Stripe key in the setup wizard therefore had a null client for
// the entire life of the process, and all four guarded paths — invoice payment links,
// checkout session creation, the main webhook and the invoice webhook — answered 503
// "Payment service not configured". No voucher sale, no invoice payment and no print order
// could ever have completed. Stripe records a failed delivery; the studio sees an order
// that never finishes.
//
// config-reader names this exact trap in its own header (config-reader.ts:307-310) as a
// known limitation: "it cannot help module-level constants in statically-imported modules
// ... e.g. the top-level Stripe client in routes.ts". It had never been closed.
//
// WHAT THIS SUITE CAN AND CANNOT PROVE FROM A DEVELOPER MACHINE. Stored credentials are
// AES-GCM encrypted with a key derived from ENCRYPTION_KEY (falling back to SESSION_SECRET)
// — see server/utils/encryption.ts:31. Those values were encrypted on the host, with the
// host's secret, so they do not decrypt locally. That is expected, and it means the
// database branch cannot be exercised here. The suite proves the MECHANISM and reports the
// database branch as a diagnosis rather than pretending to have tested it.
//
// Run: npx tsx scripts/gal-verify-stripe.ts
import 'dotenv/config';
import fs from 'fs';
import pg from 'pg';
import crypto from 'crypto';
import { getStripe, getStripeWebhookSecret, resetStripeClient } from '../server/lib/stripeClient';

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

// A syntactically valid test key. Never a real one, and never printed.
const FAKE_KEY = 'sk_test_' + 'a'.repeat(40);

function decryptsWith(payload: string, secret?: string): boolean {
  try {
    if (!secret || !payload?.startsWith('enc:v1:')) return false;
    const [, , ivHex, tagHex, ctHex] = payload.split(':');
    const key = crypto.createHash('sha256').update(secret).digest();
    const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    d.setAuthTag(Buffer.from(tagHex, 'hex'));
    Buffer.concat([d.update(Buffer.from(ctHex, 'hex')), d.final()]);
    return true;
  } catch { return false; }
}

async function main() {
  const savedKey = process.env.STRIPE_SECRET_KEY;
  const savedWh = process.env.STRIPE_WEBHOOK_SECRET;

  console.log('\n=== no payment gate reads the boot-time client any more ===');
  const routes = fs.readFileSync('server/routes.ts', 'utf8');
  const stale = (routes.match(/!stripe \|\| !stripeConfigured/g) || []).length;
  check('every gate resolves lazily', stale === 0, stale + ' still use the boot-time client');
  check('all four gates were converted',
    (routes.match(/await getStripe\(\)/g) || []).length >= 4);
  // The module-level client must still EXIST — other code paths reference it — but no
  // guard may depend on whether it happened to be built before hydration.
  check('the boot-time client is still constructed for other callers',
    routes.includes('stripe = new Stripe(stripeSecretKey'));

  console.log('\n=== the resolver behaves ===');
  delete process.env.STRIPE_SECRET_KEY;
  resetStripeClient();

  process.env.STRIPE_SECRET_KEY = FAKE_KEY;
  resetStripeClient();
  const client = await getStripe();
  check('a valid key produces a client', Boolean(client));
  check('it exposes the checkout API', typeof (client as any)?.checkout?.sessions?.create === 'function');
  check('it exposes webhook signature verification',
    typeof (client as any)?.webhooks?.constructEvent === 'function');
  check('the client is cached, not rebuilt per request', (await getStripe()) === client);

  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  resetStripeClient();
  check('a "dummy" placeholder is refused', (await getStripe()) === null);

  process.env.STRIPE_SECRET_KEY = 'sk_short';
  resetStripeClient();
  check('an implausibly short key is refused', (await getStripe()) === null);

  console.log('\n=== the webhook secret resolves through the same path ===');
  delete process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_' + 'b'.repeat(32);
  resetStripeClient();
  const wh = await getStripeWebhookSecret();
  check('an environment secret is returned', typeof wh === 'string' && wh.startsWith('whsec_'));
  delete process.env.STRIPE_WEBHOOK_SECRET;

  console.log('\n=== diagnosis: what is actually stored on this database ===');
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  for (let i = 0; ; i++) {
    try { await db.connect(); break; }
    catch (e) { if (i >= 5) { console.log('  (database unreachable — skipping diagnosis)'); await finish(); return; } await new Promise((r) => setTimeout(r, 2500)); }
  }
  try {
    const r = await db.query(`SELECT smtp_pass_encrypted, stripe_secret_key_encrypted,
      stripe_webhook_secret_encrypted, openai_api_key_encrypted, storage_secret_key_encrypted,
      prodigi_api_key_encrypted FROM studio_integrations LIMIT 1`);
    const row: any = r.rows[0] || {};
    let stored = 0;
    let readable = 0;
    for (const [col, val] of Object.entries(row)) {
      if (!val) { console.log(`  ${col.padEnd(34)} not set`); continue; }
      stored++;
      const ok = decryptsWith(String(val), process.env.ENCRYPTION_KEY) ||
                 decryptsWith(String(val), process.env.SESSION_SECRET);
      if (ok) readable++;
      console.log(`  ${col.padEnd(34)} stored, ${ok ? 'decrypts here' : 'DOES NOT decrypt with this machine\'s keys'}`);
    }
    console.log('');
    if (stored && !readable) {
      console.log('  All stored credentials are encrypted with a secret this machine does not hold.');
      console.log('  Expected on a developer box: they were encrypted on the host. It means the');
      console.log('  database branch of getStripe() cannot be exercised here — run this on the');
      console.log('  host to prove it end to end.');
    }
    // This is the operational hazard, and it is worth saying every run.
    console.log('');
    console.log('  WARNING: these values are AES-GCM encrypted with a key derived from');
    console.log('  ENCRYPTION_KEY, falling back to SESSION_SECRET (server/utils/encryption.ts:31).');
    console.log('  Changing either on the host — or ADDING an ENCRYPTION_KEY to an instance that');
    console.log('  had been using SESSION_SECRET — makes every one of them permanently');
    console.log('  unreadable, and nothing warns. They must be re-entered in the wizard.');
  } finally {
    await db.end().catch(() => {});
  }

  await finish();

  async function finish() {
    if (savedKey) process.env.STRIPE_SECRET_KEY = savedKey; else delete process.env.STRIPE_SECRET_KEY;
    if (savedWh) process.env.STRIPE_WEBHOOK_SECRET = savedWh; else delete process.env.STRIPE_WEBHOOK_SECRET;
    resetStripeClient();
    console.log(bad
      ? `\n  ${bad} CHECK(S) FAILED\n`
      : '\n  ALL CHECKS PASSED — payments resolve their credentials at request time\n');
    process.exit(bad ? 1 : 0);
  }
}

main();
