#!/usr/bin/env node
/**
 * Provision a new TogNinja instance on Render (a new demo, or a real customer).
 *
 * ONE image, MANY isolated instances: this creates a NEW Render web service from the
 * SAME repo (AxixOS/togninja), pointed at a NEW, EMPTY Postgres database, with all the
 * env vars set. On first boot AUTO_INIT_SCHEMA builds the schema; then you run /setup.
 *
 * It never touches an existing instance's DB — you pass a fresh DATABASE_URL.
 *
 * ── USAGE ─────────────────────────────────────────────────────────────────────
 *   Set these env vars, then: node scripts/provision-instance.mjs
 *
 *   REQUIRED
 *     RENDER_API_KEY        Render API key (Account Settings → API Keys)
 *     SERVICE_NAME          e.g. togninja-demo2
 *     DATABASE_URL          the NEW (empty) Postgres URI. Prefer Supabase's TRANSACTION
 *                           pooler (Connect → Transaction, port 6543) for connection
 *                           headroom — a :5432 Supabase pooler URI is auto-upgraded to :6543.
 *
 *   STORAGE — pick ONE of these two.
 *
 *   (a) PER-TENANT, and the right one for anything a customer will hold. Set your Backblaze
 *       MASTER key and this script mints the studio a bucket of their own plus an application
 *       key scoped to that bucket alone. The master never leaves this machine.
 *     B2_KEY_ID             Backblaze master applicationKeyId
 *     B2_APP_KEY            Backblaze master applicationKey
 *
 *   (b) EXPLICIT, and SHARED. The five values below are copied straight into the instance, so
 *       every instance provisioned with the same values shares one bucket under one credential.
 *       Fine for your own demo. Not fine for a studio who will hold this Render account — they
 *       can read their own environment, and that credential reaches every other studio's
 *       client photographs. Supabase Storage can only ever be used this way: its S3 keys are
 *       PROJECT-scoped, so no key exists that reaches one tenant and not the rest.
 *     AWS_S3_ENDPOINT       e.g. https://<ref>.storage.supabase.co/storage/v1/s3
 *     AWS_S3_BUCKET         a PUBLIC bucket name you created
 *     AWS_ACCESS_KEY_ID
 *     AWS_SECRET_ACCESS_KEY
 *     AWS_REGION            e.g. eu-central-1 (default)
 *
 *   Neither is required to boot. An instance with no storage runs the CRM perfectly well and
 *   refuses uploads until Technical Setup is filled in, which the wizard states plainly.
 *
 *   OPTIONAL
 *     RENDER_OWNER_ID       your Render team/user id (auto-resolved if omitted)
 *     RENDER_REGION         Render region (default: frankfurt — EU)
 *     RENDER_PLAN           starter | standard | ... (default: starter)
 *     REPO                  default: https://github.com/AxixOS/togninja
 *     BRANCH                default: main
 *     DEMO_MODE             default: true (a demo; disables licence enforcement)
 *     OPENAI_API_KEY        enables AI homepage + FR/ES translations
 *     PROTECTED_DB_HOSTS    comma list of DB hosts that must never be auto-inited
 *     SESSION_SECRET        auto-generated if omitted
 *     ENCRYPTION_KEY        auto-generated if omitted (KEEP STABLE for an instance)
 *     SHOOTCLEANER_API_KEY  auto-generated if omitted; printed at the end to hand to
 *                           ShootCleaner (with the studio URL) for the bundled package
 *     DRY_RUN=1             print the request without creating anything
 * ──────────────────────────────────────────────────────────────────────────────
 */
import crypto from 'node:crypto';

const API = 'https://api.render.com/v1';
const need = (k) => {
  const v = process.env[k];
  if (!v) { console.error(`❌ Missing required env: ${k}`); process.exit(1); }
  return v;
};
const gen = () => crypto.randomBytes(32).toString('hex');

// Prefer Supabase's TRANSACTION-mode pooler (port 6543) over the SESSION-mode pooler
// (5432). Session mode caps clients at pool_size (15 on small plans) and the app runs two
// pools (query + session store), so it exhausts easily — the '(EMAXCONNSESSION) max clients
// reached' failure. Transaction mode multiplexes and allows far more clients, so every new
// studio gets the higher-headroom connection by default. Only the Supabase pooler host is
// rewritten; a direct/other Postgres URL is left untouched.
function toTransactionPooler(raw) {
  try {
    const u = new URL(raw);
    const isSupabasePooler = /(^|\.)pooler\.supabase\.com$/i.test(u.hostname);
    if (isSupabasePooler && u.port === '5432') { u.port = '6543'; return { url: u.toString(), mode: 'transaction', rewritten: true }; }
    if (isSupabasePooler && u.port === '6543') return { url: raw, mode: 'transaction', rewritten: false };
    if (isSupabasePooler) return { url: raw, mode: 'pooler', rewritten: false };
    return { url: raw, mode: 'direct', rewritten: false };
  } catch { return { url: raw, mode: 'unknown', rewritten: false }; }
}

const RENDER_API_KEY = need('RENDER_API_KEY');
const SERVICE_NAME = need('SERVICE_NAME');
const { url: DATABASE_URL, mode: DB_MODE, rewritten: DB_REWRITTEN } = toTransactionPooler(need('DATABASE_URL'));

const REPO = process.env.REPO || 'https://github.com/AxixOS/togninja';
const BRANCH = process.env.BRANCH || 'main';
const RENDER_REGION = process.env.RENDER_REGION || 'frankfurt';
const RENDER_PLAN = process.env.RENDER_PLAN || 'starter';
const SESSION_SECRET = process.env.SESSION_SECRET || gen();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || gen();
// ShootCleaner package: every instance is minted with its OWN unique integration key so
// the bundle (ShootCleaner + TogNinja) works out of the box — hand this key + the studio
// URL to ShootCleaner. The studio can still rotate it later in Settings → ShootCleaner.
const SHOOTCLEANER_API_KEY = process.env.SHOOTCLEANER_API_KEY || `sc_${crypto.randomBytes(24).toString('hex')}`;

async function api(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${RENDER_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) {
    console.error(`❌ Render API ${method} ${path} → ${res.status}`);
    console.error(typeof json === 'string' ? json : JSON.stringify(json, null, 2));
    process.exit(1);
  }
  return json;
}

async function resolveOwnerId() {
  if (process.env.RENDER_OWNER_ID) return process.env.RENDER_OWNER_ID;
  const owners = await api('/owners?limit=20');
  const list = (Array.isArray(owners) ? owners : []).map((o) => o.owner || o);
  if (!list.length) { console.error('❌ No Render owners found for this API key.'); process.exit(1); }
  if (list.length > 1) {
    console.log('ℹ️ Multiple Render owners — using the first. Set RENDER_OWNER_ID to choose:');
    list.forEach((o) => console.log(`   ${o.id}  ${o.name || o.email || ''}`));
  }
  return list[0].id;
}

// Env vars for the new instance.
const envVars = [
  { key: 'NODE_ENV', value: 'production' },
  { key: 'DEMO_MODE', value: process.env.DEMO_MODE || 'true' },
  { key: 'AUTO_INIT_SCHEMA', value: 'true' },
  { key: 'DATABASE_URL', value: DATABASE_URL },
  // Storage is resolved in main(), not here — see resolveStorage(). It is the one value that
  // must be MINTED per tenant rather than copied from this machine's environment.
  { key: 'SESSION_SECRET', value: SESSION_SECRET },
  { key: 'ENCRYPTION_KEY', value: ENCRYPTION_KEY },
  { key: 'SHOOTCLEANER_API_KEY', value: SHOOTCLEANER_API_KEY },
  // Absolute base URL — needed for OAuth redirect URIs (Google Calendar connect) and any
  // absolute-link building. Render serves the service at <name>.onrender.com.
  { key: 'APP_URL', value: process.env.APP_URL || `https://${SERVICE_NAME}.onrender.com` },
];
// SHARED Google OAuth app (optional): set these so the studio never creates their own
// Google Cloud project — the wizard hides the Client ID/Secret fields and they just click
// "Connect Google Calendar". Remember to add this instance's callback URI to the OAuth
// client (printed at the end).
if (process.env.GOOGLE_CLIENT_ID) envVars.push({ key: 'GOOGLE_CLIENT_ID', value: process.env.GOOGLE_CLIENT_ID });
if (process.env.GOOGLE_CLIENT_SECRET) envVars.push({ key: 'GOOGLE_CLIENT_SECRET', value: process.env.GOOGLE_CLIENT_SECRET });
if (process.env.OPENAI_API_KEY) envVars.push({ key: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY });
if (process.env.PROTECTED_DB_HOSTS) envVars.push({ key: 'PROTECTED_DB_HOSTS', value: process.env.PROTECTED_DB_HOSTS });
// Transaction-mode pooler allows more clients → give the app pools more headroom.
// (On the session pooler we leave these unset so the code's safe 8+3 defaults apply.)
if (DB_MODE === 'transaction') {
  envVars.push({ key: 'PG_POOL_MAX', value: process.env.PG_POOL_MAX || '15' });
  envVars.push({ key: 'PG_SESSION_POOL_MAX', value: process.env.PG_SESSION_POOL_MAX || '5' });
}

/**
 * Storage for THIS tenant, and nobody else's.
 *
 * This used to be five need() calls reading the operator's own AWS_* variables, which meant
 * every instance this script created shared one bucket under one credential. That was only
 * ever safe while nobody could read their own environment — and under the owned model the LTD
 * creates a Render account and hands it to the studio, so from handover the studio holds the
 * dashboard and everything in it. A shared storage credential there is a credential every
 * customer holds, reaching every other customer's client photographs.
 *
 * With B2_KEY_ID and B2_APP_KEY set, this mints a bucket for the tenant and an application key
 * scoped to that bucket alone. Those are the MASTER credentials and they stay on this machine;
 * what reaches the instance can read, write, list and delete inside one bucket and do nothing
 * else — it cannot even enumerate the account it belongs to.
 *
 * Without them it falls back to explicit AWS_* variables, so an existing workflow, a
 * self-hosted install, or a studio bringing their own bucket all keep working — but it says
 * plainly that the credential is shared, because that is a decision, not a default.
 */
async function resolveStorage() {
  const b2KeyId = (process.env.B2_KEY_ID || '').trim();
  const b2AppKey = (process.env.B2_APP_KEY || '').trim();

  if (b2KeyId && b2AppKey) {
    if (process.env.DRY_RUN === '1') {
      console.log('   storage: (DRY_RUN) would mint a B2 bucket + bucket-scoped key for this tenant');
      return { AWS_S3_ENDPOINT: '<b2-s3-endpoint>', AWS_S3_BUCKET: '<per-tenant-bucket>', AWS_ACCESS_KEY_ID: '<scoped-key-id>', AWS_SECRET_ACCESS_KEY: '<scoped-key>', AWS_REGION: '<from-endpoint>' };
    }
    const { provisionTenantStorage } = await import('./lib/b2.mjs');
    const out = await provisionTenantStorage({ keyId: b2KeyId, appKey: b2AppKey, serviceName: SERVICE_NAME });
    console.log(`   storage: bucket "${out.bucketName}" ${out.created ? 'created' : 'reused'}, key scoped to it alone`);
    return out.env;
  }

  const explicit = ['AWS_S3_ENDPOINT', 'AWS_S3_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
  if (explicit.every((k) => (process.env[k] || '').trim())) {
    console.log('   ⚠ storage: using the AWS_* values from THIS machine, so this instance shares');
    console.log('     whatever bucket they point at. Fine for your own demo; NOT fine for a customer');
    console.log('     who will hold this Render account. Set B2_KEY_ID / B2_APP_KEY to mint a');
    console.log('     bucket and a scoped key per tenant instead.');
    return {
      AWS_S3_ENDPOINT: process.env.AWS_S3_ENDPOINT,
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_REGION: process.env.AWS_REGION || 'eu-central-1',
    };
  }

  // Deliberately not fatal. An instance with no storage boots, serves, and runs the CRM; it
  // just cannot accept an upload until Technical Setup is filled in, and the wizard says so.
  console.log('   ⚠ storage: NONE. The instance will run, but uploads are refused until the');
  console.log('     studio connects storage in Technical Setup. Set B2_KEY_ID / B2_APP_KEY to');
  console.log('     mint per-tenant storage automatically.');
  return null;
}

async function main() {
  const ownerId = process.env.DRY_RUN === '1'
    ? (process.env.RENDER_OWNER_ID || '<owner-id>')
    : await resolveOwnerId();

  const storage = await resolveStorage();
  if (storage) for (const [key, value] of Object.entries(storage)) envVars.push({ key, value });
  const payload = {
    type: 'web_service',
    name: SERVICE_NAME,
    ownerId,
    repo: REPO,
    branch: BRANCH,
    autoDeploy: 'yes',
    serviceDetails: {
      runtime: 'docker',
      region: RENDER_REGION,
      plan: RENDER_PLAN,
      envSpecificDetails: { dockerfilePath: './Dockerfile' },
    },
    envVars,
  };

  console.log(`\n🛠  Creating Render service "${SERVICE_NAME}" (${RENDER_REGION}, ${RENDER_PLAN}) from ${REPO}@${BRANCH}`);
  console.log(`   DB: ${DATABASE_URL.replace(/:\/\/[^@]*@/, '://***@')}`);
  console.log(`   DB pooler mode: ${DB_MODE}${DB_REWRITTEN ? ' (rewrote 5432→6543 for higher connection headroom)' : ''}`);
  if (DB_MODE === 'pooler' || DB_MODE === 'direct') {
    console.log('   ⚠ Not the Supabase transaction pooler — for scale, use the :6543 pooler URI (Supabase → Connect → Transaction).');
  }
  console.log(`   env keys: ${envVars.map((e) => e.key).join(', ')}`);

  if (process.env.DRY_RUN === '1') {
    console.log('\n(DRY_RUN) Would POST /services with:\n', JSON.stringify({ ...payload, envVars: '[…redacted…]' }, null, 2));
    console.log('\nGenerated (save these!):\n  SESSION_SECRET =', SESSION_SECRET, '\n  ENCRYPTION_KEY =', ENCRYPTION_KEY);
    console.log('\n🎞 ShootCleaner package credentials (would be set):');
    console.log('   TogNinja studio URL =', `https://${SERVICE_NAME}.onrender.com`);
    console.log('   SHOOTCLEANER_API_KEY =', SHOOTCLEANER_API_KEY);
    return;
  }

  const created = await api('/services', 'POST', payload);
  const svc = created.service || created;
  const url = svc.serviceDetails?.url || svc.dashboardUrl || `https://${SERVICE_NAME}.onrender.com`;
  console.log('\n✅ Service created.');
  console.log('   id:        ', svc.id);
  console.log('   dashboard: ', svc.dashboardUrl || `https://dashboard.render.com`);
  console.log('   url:       ', url, '(live once the first build finishes)');
  // Operator-only secrets — store securely; NOT part of the customer handover.
  console.log('\n🔑 OPERATOR SECRETS — store securely (needed to decrypt this instance):');
  console.log('   SESSION_SECRET =', SESSION_SECRET);
  console.log('   ENCRYPTION_KEY =', ENCRYPTION_KEY);

  // One copyable handover sheet per new studio.
  const callback = `${url}/api/auth/google/callback`;
  const oauthLine = process.env.GOOGLE_CLIENT_ID
    ? 'Shared GOOGLE_CLIENT_ID is set — studios just click "Connect Google Calendar".'
    : 'No shared GOOGLE_CLIENT_ID — set one + re-provision to make calendar self-serve.';
  console.log(`
────────────────────────────────────────────────────────────────────
 NEW STUDIO HANDOVER — ${SERVICE_NAME}
────────────────────────────────────────────────────────────────────

 1. Finish setup (studio, or you on their behalf)
      ${url}/setup

 2. ShootCleaner (bundled package) — enter in ShootCleaner → Connect TogNinja
      TogNinja studio URL : ${url}
      API key             : ${SHOOTCLEANER_API_KEY}
      (Studio can rotate this later in Settings → ShootCleaner.)

 3. Google Calendar — one action for YOU (the provider)
      Add this Authorised redirect URI to the shared Google OAuth client
      (Google Cloud Console → APIs & Services → Credentials → OAuth client):
      ${callback}
      ${oauthLine}
────────────────────────────────────────────────────────────────────
`);
  console.log('Next: wait for the build to finish, then open', `${url}/setup`);
}

main().catch((e) => { console.error('❌', e?.message || e); process.exit(1); });
