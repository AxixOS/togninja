// The file that provisions a paying studio's instance.
//
// render.yaml is the whole of "Deploy TogNinja" — one click, and whatever this says becomes
// somebody's live business. Every check here is something it got wrong while shipping:
//
//   it pointed at the previous repository and a branch the product no longer ships from;
//   DEMO_MODE was "true", which exposes an unauthenticated endpoint that TRUNCATEs the CRM;
//   ENCRYPTION_KEY was absent while nine stored credentials are encrypted from it;
//   DATABASE_URL was prompted rather than provisioned, so the studio had to go and create a
//   database elsewhere first — most of the friction the Blueprint exists to remove.

import { readFileSync } from 'fs';

const y = readFileSync('render.yaml', 'utf8');

// Split on newlines without naming one: every line is trimmed anyway, so a trailing
// carriage return goes with it and CRLF needs no special case.
const lines = y.split(/\r?\n/).map((l) => l.trim());

let failed = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!ok) failed++;
};

console.log('\nTenant Blueprint\n');

// ── It deploys the right thing ──────────────────────────────────────────────
check('it points at the product repository',
  y.includes('https://github.com/AxixOS/togninja'),
  'siparrott/studioOS-platform is the previous one');

// The branch must be a BRANCH, not remote/branch shorthand.
//
// This file said `product/main`, which reads like a branch and is not one. In the working
// copy `product` is the REMOTE — the pushes are `git push product HEAD:main`, i.e. remote
// `product`, branch `main`. Render went looking for a branch literally called
// "product/main", found none, and refused the Blueprint with
//
//     services[0].branch  branch product/main could not be found
//
// Slashes in branch names are perfectly legal (feature/x), so the check is not "no slash".
// It is: the first segment must not be the name of a remote configured in this repository,
// which is exactly the confusion that produced it.
const branchLine = lines.find((l) => l.startsWith('branch:')) || '';
const branch = branchLine.replace('branch:', '').trim();

let remoteNames = [];
try {
  const cfg = readFileSync('.git/config', 'utf8');
  remoteNames = [...cfg.matchAll(/\[remote "([^"]+)"\]/g)].map((m) => m[1]);
} catch { /* not a git checkout; skip the cross-check rather than fail */ }

check('a branch is declared', branch.length > 0, branch || 'none');

check('it is a branch name, not remote/branch shorthand',
  !remoteNames.includes(branch.split('/')[0]),
  remoteNames.length
    ? `branch "${branch}" vs remotes ${remoteNames.join(', ')}`
    : 'no git config to cross-check against');

// ── It cannot ship a CRM-wipe endpoint ──────────────────────────────────────
//
// The single most dangerous line this file can contain. DEMO_MODE=true enables
// POST /api/setup/reset-demo, which truncates clients, invoices, leads, galleries and
// landing pages — unauthenticated, because on a demo instance that is the point.
check('demo mode is off',
  /key: DEMO_MODE[\s\S]{0,200}?value: "false"/.test(y));

// Assert the PROPERTY, not a proxy for it. This banned any `value: "true"` anywhere in the
// file, which worked only while DEMO_MODE was the sole boolean — then AUTO_INIT_SCHEMA had to
// be set to "true" for a legitimate and necessary reason and the check went red on correct
// code. What matters is that DEMO_MODE specifically is not on; other keys being true is none
// of its business.
const demoIdx = lines.findIndex((l) => l === '- key: DEMO_MODE');
const demoValue = demoIdx >= 0 ? (lines[demoIdx + 1] || '') : '';
check('demo mode is off, specifically',
  demoIdx >= 0 && demoValue.includes('"false"'),
  demoIdx >= 0 ? demoValue : 'DEMO_MODE not declared at all');

// ── The database gets TABLES ────────────────────────────────────────────────
//
// A provisioned database is empty, and the core tables are not created by the boot DDL:
// server/index.ts runs 32 CREATE TABLE IF NOT EXISTS statements and studio_configs is not one
// of them, nor crm_clients, admin_users or galleries. Those come from scripts/ensure-schema.mjs,
// which the Dockerfile runs before npm start and which does nothing unless AUTO_INIT_SCHEMA is
// set. Without it the container starts, every query fails on a missing table, and nothing says
// a step was skipped.
//
// Safe to set here and nowhere else: that script refuses to act on a database with any tables
// in it, which is the condition a fresh tenant is in and no live instance ever is.
const autoIdx = lines.findIndex((l) => l === '- key: AUTO_INIT_SCHEMA');
check('the schema is installed on first boot',
  autoIdx >= 0 && (lines[autoIdx + 1] || '').includes('"true"'),
  autoIdx >= 0 ? (lines[autoIdx + 1] || '') : 'AUTO_INIT_SCHEMA not declared');

// ── The studio gets a database without going anywhere else ──────────────────
check('a database is provisioned in the same click',
  /^databases:/m.test(y));

check('the connection string is wired, not typed',
  /fromDatabase:[\s\S]{0,120}property: connectionString/.test(y));

// A cross-region pairing is not an error and will not fail a deploy — it just puts a
// continent between every query, which is the kind of thing nobody finds later.
const regions = y.match(/region: [a-z-]+/g) || [];
check('the database and the service sit in the same region',
  regions.length >= 2 && new Set(regions).size === 1,
  regions.join(', ') || 'none declared');

// ── Secrets exist, and nobody handles them ──────────────────────────────────
//
// Both are load-bearing and neither can be rotated later without silently making every
// stored integration credential unreadable.
for (const key of ['SESSION_SECRET', 'ENCRYPTION_KEY']) {
  check(`${key} is generated by Render`,
    new RegExp(`key: ${key}[\\s\\S]{0,80}generateValue: true`).test(y));
}

// A generated secret must never also be promptable — that is how one tenant ends up sharing
// another's key by paste.
check('neither is left for a human to paste',
  !/key: (SESSION_SECRET|ENCRYPTION_KEY)[\s\S]{0,80}sync: false/.test(y));

// ── The keys that are deliberately the studio's ─────────────────────────────
//
// Platform pays to show, studio pays to use. An AI key baked into the Blueprint would be
// the platform paying for every tenant's generation forever.
for (const key of ['OPENAI_API_KEY', 'AWS_SECRET_ACCESS_KEY']) {
  check(`${key} is the studio's to provide`,
    new RegExp(`key: ${key}[\\s\\S]{0,60}sync: false`).test(y));
}

// ── It must not adopt something already running ─────────────────────────────
//
// Render matches Blueprint services to existing ones BY NAME. Named exactly "togninja",
// applying this in the AxixOS workspace would not have created a tenant — it would have
// reconfigured the LIVE demo service, and because DATABASE_URL is wired fromDatabase it
// would have repointed that instance at a brand-new empty Postgres. Every client, invoice
// and gallery would have appeared to vanish while sitting untouched in a database nothing
// was connected to any more.
// Plain string work, no regex. The first draft of this line was /^s+name:/ — the backslash
// lost in transit — which matches nothing, so the check went green while asserting nothing.
// That is a worse outcome than having no check, and it is the fourth time this session.
const serviceNames = lines
  .filter((l) => l.startsWith('name: ') || l.startsWith('- name: '))
  .map((l) => l.replace('- ', '').slice(6).trim());
check('no service or database is named after the live instance',
  !serviceNames.includes('togninja'),
  serviceNames.join(', '));

// ── The provisioner has to be able to fire ──────────────────────────────────
//
// Its guard was `tableCount > 0` — never touch a populated database. Fair reading, wrong
// for the only case that matters: server/index.ts creates 32 tables of its own on every
// boot, so a database is empty exactly once, before the very first start, and that moment
// passes before anyone can set AUTO_INIT_SCHEMA. Observed on a Blueprint-provisioned tenant:
// studio_configs never existed, /api/setup/status returned 500, and /api/studio-config
// returned 200 because it degrades to neutral defaults — so it looked fine from outside.
const ensure = readFileSync('scripts/ensure-schema.mjs', 'utf8');

check('the provisioner asks whether the CORE schema exists',
  ensure.includes("to_regclass('public.studio_configs')"));

check('and a boot-DDL-only database still provisions',
  ensure.includes('if (coreSchemaPresent) {')
  && ensure.includes('booted before it was provisioned'));

// drizzle-kit push:pg prompts when it sees tables that are not in shared/schema.ts, and most
// of the boot DDL tables are not — landing_pages, homepage_images, print_products and the
// rest are raw SQL. A container has no TTY, so the prompt is never answered and the only
// thing that ends it is the 4-minute timeout. Without clearing them first, the provisioner
// would try, hang, and report failure.
check('the push can run unattended',
  ensure.includes('DROP TABLE IF EXISTS') && ensure.includes('unattended'));

// And that clearing is confined to the case where nothing can be lost.
check('clearing only happens when setup never completed',
  ensure.indexOf('DROP TABLE IF EXISTS') > ensure.indexOf('if (coreSchemaPresent) {'),
  'the drop sits inside the studio_configs-is-absent branch');

check('a real instance is still never touched',
  ensure.includes('already exists'));

// ── The seed must not answer the wizard's questions ────────────────────────
//
// init-database.ts seeded businessName and studioName as "Photography Studio", and
// server/index.ts treats a non-empty name as proof the studio has been through Basics. So a
// freshly provisioned tenant booted, was auto-marked creative_setup_complete, and the
// /api/setup mount then demanded authentication that cannot exist yet — the admin account is
// created several steps into the wizard that could no longer save anything. Observed live:
// setup status said currentStep "complete" on an instance nobody had opened.
const seed = readFileSync('scripts/init-database.ts', 'utf8');
const boot = readFileSync('server/index.ts', 'utf8');

check('the seed does not invent a studio name',
  !seed.includes("businessName: 'Photography Studio'"));

check('nor a country',
  !seed.includes("country: 'Austria'"),
  'a seeded country pre-answers the wizard and drives the search index');

// A name is not a finished setup. The detector flipped creative_setup_complete the moment
// studio_configs held a name — and a studio types their name at step 2 of 5, so a real
// onboarding was declared finished on the next boot and the /api/setup mount then demanded
// authentication for the three steps still to come.
//
// What it is FOR is recognising an instance that predates the wizard, whose owner should not
// be marched through onboarding they never needed. Such an instance has a business: an admin
// account AND real records. A wizard in progress has a name and nothing else.
check('a name alone no longer completes setup',
  boot.includes('hasName && admins > 0 && records > 0'),
  'all three, because any two of them describe a wizard partway through');

check('and it counts real records, not just a name',
  boot.includes("countOf('crm_clients')") && boot.includes("countOf('admin_users')"));

check('the boot detector ignores placeholder names',
  boot.includes("'photography studio', 'my studio'"));

// Excluding the placeholder stops it recurring and heals nothing already flagged, because
// that branch only ever wrote true.
check('and an already-stuck instance reopens itself',
  boot.includes('creative_setup_complete = false') && boot.includes('admins === 0'),
  'no admin means the wizard was never completed, whatever the flag says');

// ── The trap that cost a real onboarding ────────────────────────────────────
check('the storage endpoint note names the S3-compatible host',
  y.includes('s3.<region>.backblazeb2.com') && y.includes('api.backblazeb2.com'),
  'pointing at the native B2 API produces an unreadable SDK parser error');

// ── One studio's credential must not reach another studio ───────────────────
//
// provision-instance.mjs built every instance's storage from need('AWS_ACCESS_KEY_ID') — the
// OPERATOR's own environment — so every studio it provisioned shared one bucket under one
// credential. That is only survivable while nobody can read their own environment, and under
// the owned model the LTD creates a Render account and hands it to the studio, who then holds
// the dashboard and everything in it. The credential would reach every other studio's client
// photographs: portraits, weddings, newborn sessions.
//
// Bound to need(), not to the presence of the variables: they still appear on the fallback
// path, deliberately, for a self-hosted install or a studio bringing their own bucket. What
// must never come back is REQUIRING them from this machine, which is what silently made them
// shared and gave the operator no signal that it had.
const prov = readFileSync('scripts/provision-instance.mjs', 'utf8');
const forced = ['AWS_S3_ENDPOINT', 'AWS_S3_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']
  .filter((k) => prov.includes(`need('${k}')`));
check('the provisioner does not copy one storage credential into every tenant',
  forced.length === 0,
  forced.length ? `still required from the operator: ${forced.join(', ')}` : 'minted per tenant, or explicitly opted into');

check('and it can mint a bucket-scoped key instead',
  prov.includes('B2_KEY_ID') && prov.includes("import('./lib/b2.mjs')"),
  'B2 scopes an application key to one bucket; Supabase S3 keys are project-wide and cannot');

// A shared credential is still allowed — for a demo, or a self-hosted install — but it is a
// decision, and the operator has to be told they made it.
check('choosing the shared path says so out loud',
  prov.includes('NOT fine for a customer'),
  'silence is how it became the default in the first place');


// ── Who pays for the site a new instance generates ─────────────────────────
//
// This script creates instances for people the provider has never met. It set storage per
// tenant, minted a ShootCleaner key per tenant, generated a SESSION_SECRET and an
// ENCRYPTION_KEY per tenant — and then funded the AI by copying OPENAI_API_KEY straight in
// from whoever ran it. One shared credential on every instance, unmetered, with nothing
// between a wizard someone keeps clicking and a real invoice.
//
// The alternative it fell back to was worse in a different direction: with no key at all, an
// instance crawls the studio's website and then generates nothing, which is a trial that
// looks broken and reads as the product not working.
//
// The gateway exists precisely to make this per-tenant and bounded. It was simply never
// reached from here.
check('provisioning mints a metered AI key per tenant',
  /async function resolvePlatformAi/.test(prov)
  && /\/v1\/ai\/keys/.test(prov)
  && /AXIXOS_INTERNAL_API_KEY/.test(prov));

// The header is the one that looks like a bad key when it is wrong.
check('and calls the gateway the way the gateway expects',
  /'x-axixos-api-key': consoleKey/.test(prov),
  'Authorization: Bearer answers 401 and is indistinguishable from a dead key');

// A shared unmetered key must be reachable — it is right for the provider's own demos — but
// never by DEFAULT, because the default is what gets used at three in the morning.
check('an unmetered shared key requires saying so out loud',
  /ALLOW_UNMETERED_PLATFORM_AI !== '1'/.test(prov)
  && !/if \(process\.env\.OPENAI_API_KEY\) envVars\.push/.test(prov),
  'it used to be copied in silently whenever it happened to be set');

check('and so does provisioning an instance that cannot generate',
  /ALLOW_NO_PLATFORM_AI !== '1'/.test(prov),
  'a trial that crawls a website and produces nothing is worse than no trial');

// The provider reads this sheet and hands the instance over; which of the three it got is the
// difference between a bounded trial and an open tab.
check('and the handover sheet says which of the three it got',
  /Site generation is funded by/.test(prov),
  'stated where the provider is already looking');

// ── The one-click path can generate a site ─────────────────────────────────
//
// The Blueprint got the database, both secrets and the schema right, and then had no platform
// AI at all — neither AXIXOS_INTERNAL_API_KEY nor a platform OpenAI key. The OPENAI_API_KEY it
// does carry is documented, correctly, as the STUDIO's own for ongoing use.
//
// So a studio clicking Deploy got an instance that crawls their website, reads it, and then
// generates nothing: a first run that looks like the product does not work. That is the same
// hole provision-instance.mjs was just made to refuse, still open on the path that is actually
// one click — and this file's own header says one click is what makes it somebody's live
// business.
check('the Blueprint carries platform AI',
  /AXIXOS_INTERNAL_API_KEY/.test(y),
  'without it onboarding reads their site and produces nothing');

// sync: false, so it is PASTED per instance. A value hard-coded here would be one credential
// in a public repository, shared by every studio who ever clicks Deploy — which is worse than
// the gap it fixes.
check('and asks for it per instance rather than shipping one',
  /- key: AXIXOS_INTERNAL_API_KEY\s*\n\s*sync: false/.test(y),
  'a key committed here is one credential for every tenant, in a public repo');

// The distinction is the whole billing model and it is easy to collapse by accident.
check('and does not confuse it with the studio\'s own key',
  /Who pays to SHOW the product/.test(y) && /own AI account/.test(y),
  'platform pays to show, studio pays to use — two keys, two payers, two comments');
console.log(`\n  ${failed === 0 ? 'all checks passed' : failed + ' FAILED'}\n`);
process.exit(failed === 0 ? 0 : 1);
