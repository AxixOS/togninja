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
 *   STORAGE (required for uploads; Supabase Storage → S3 Access Keys)
 *     AWS_S3_ENDPOINT       https://<ref>.storage.supabase.co/storage/v1/s3
 *     AWS_S3_BUCKET         a PUBLIC bucket name you created
 *     AWS_ACCESS_KEY_ID
 *     AWS_SECRET_ACCESS_KEY
 *     AWS_REGION            e.g. eu-central-1 (default)
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
  { key: 'AWS_S3_ENDPOINT', value: need('AWS_S3_ENDPOINT') },
  { key: 'AWS_S3_BUCKET', value: need('AWS_S3_BUCKET') },
  { key: 'AWS_ACCESS_KEY_ID', value: need('AWS_ACCESS_KEY_ID') },
  { key: 'AWS_SECRET_ACCESS_KEY', value: need('AWS_SECRET_ACCESS_KEY') },
  { key: 'AWS_REGION', value: process.env.AWS_REGION || 'eu-central-1' },
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

async function main() {
  const ownerId = process.env.DRY_RUN === '1'
    ? (process.env.RENDER_OWNER_ID || '<owner-id>')
    : await resolveOwnerId();
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
  console.log('\n🔑 SAVE these (needed to decrypt this instance\'s stored secrets):');
  console.log('   SESSION_SECRET =', SESSION_SECRET);
  console.log('   ENCRYPTION_KEY =', ENCRYPTION_KEY);

  // The two values ShootCleaner needs for the bundled package.
  console.log('\n🎞 SHOOTCLEANER PACKAGE — give these two to ShootCleaner:');
  console.log('   TogNinja studio URL :', url);
  console.log('   API key             :', SHOOTCLEANER_API_KEY);
  console.log('   (Studio can rotate the key later in Settings → ShootCleaner.)');

  // Google Calendar (shared OAuth app) — the one manual step, done by YOU (the provider),
  // not the studio: register this instance's callback in the shared OAuth client.
  const callback = `${url}/api/auth/google/callback`;
  console.log('\n📅 GOOGLE CALENDAR — one-time action required:');
  if (process.env.GOOGLE_CLIENT_ID) {
    console.log('   Add this Authorised redirect URI to your shared Google OAuth client');
    console.log('   (Google Cloud Console → APIs & Services → Credentials → your OAuth client):');
    console.log(`      ${callback}`);
    console.log('   Then studios just click "Connect Google Calendar" — no keys to enter.');
  } else {
    console.log('   No shared GOOGLE_CLIENT_ID set — studios would each need their own Google');
    console.log('   Cloud OAuth app (technical). To make calendar self-serve, re-provision with');
    console.log('   GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET set, then register this redirect URI:');
    console.log(`      ${callback}`);
  }

  console.log('\nNext: wait for the build, then open', `${url}/setup`, 'and configure the studio.');
}

main().catch((e) => { console.error('❌', e?.message || e); process.exit(1); });
