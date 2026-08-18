// The half of a tenant reset that POST /api/setup/reset-demo does not do.
//
// reset-demo names 36 of 115 tables and clears ~37 studio_configs columns. Everything
// below was measured still holding the previous tenant's data after it runs. Run this
// straight after reset-demo, before the next onboarding.
//
//   node scripts/reset-supplement.mjs           # dry run — shows what it would clear
//   node scripts/reset-supplement.mjs --apply   # do it
//
// Every statement reports its own result. reset-demo wraps each one in a silent catch,
// which is how `primary_color` once survived a reset that named it — it shared a
// statement with a column that did not exist. Nothing here fails quietly.
import pg from 'pg';
import fs from 'fs';

const APPLY = process.argv.includes('--apply');

const line = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
const pool = new pg.Pool({
  connectionString: line.slice(13).trim().replace(/^["']|["']$/g, ''),
  max: 2, ssl: { rejectUnauthorized: false },
});
const q = async (s, a = []) => (await pool.query(s, a)).rows;

// Tables reset-demo never names. Left out on purpose: `studios` and
// `template_definitions` (structural, not tenant data), `studio_configs` and
// `studio_integrations` (the singleton rows — their COLUMNS are cleared below),
// `app_settings` (one row, one key of which is tenant data — handled separately).
const TRUNCATE = [
  ['email_settings', 'SMTP host/user and a PLAINTEXT password, plus the From name every email is signed with'],
  ['email_templates', 'welcome/booking templates carrying the previous studio name'],
  ['email_automations', 'an ENABLED automation that fires on newsletter signup'],
  ['email_subscribers', 'real email addresses belonging to the previous tenant'],
  ['email_automation_logs', 'same addresses again'],
  ['knowledge_base', 'articles powering the site chatbot; the seeder only runs when this is EMPTY, so leaving rows here means it can never re-seed'],
  ['price_list_items', "the previous studio's packages and prices"],
  ['discount_coupons', 'active, redeemable coupon codes'],
  ['questionnaires', 'questionnaire definitions (the responses are cleared, the definitions are not)'],
  ['surveys', 'survey definitions, reachable by slug'],
  ['digital_files', 'uploaded files'],
  ['agent_session', 'prior operator AI conversations'],
  ['agent_message', 'prior operator AI conversations'],
  ['agent_audit', 'prior operator AI audit trail'],
  ['admin_notification_state', 'pre-dismissed warnings — including the missing-OpenAI one, so the next tenant never sees it raised'],
  ['landing_page_events', 'analytics for the previous tenant’s pages'],
  ['shootcleaner_exports', 'orphaned export rows'],
];

// studio_configs columns reset-demo leaves populated. owner_* and founding_year are the
// serious ones: they are published on the About page and in Person JSON-LD, so the next
// studio advertises the previous owner's name, role and founding date as its own.
const CONFIG_NULL = [
  'owner_name', 'owner_role', 'owner_portrait_url', 'founding_year', 'credentials',
  'country', 'state', 'zip', 'email', 'owner_email', 'subdomain',
  'active_template', 'secondary_color', 'font_family', 'site_theme_tokens',
  'enabled_features', 'meta_title', 'opening_hours',
];

const INTEGRATION_NULL = [
  'default_currency', 'timezone', 'storage_provider',
  'gmail_email', 'gmail_refresh_token_encrypted',
];

const results = [];
const run = async (label, sql) => {
  if (!APPLY) { results.push({ target: label, action: 'would run', detail: sql.slice(0, 60) }); return; }
  try { await q(sql); results.push({ target: label, action: 'OK' }); }
  catch (e) { results.push({ target: label, action: 'FAILED', detail: e.message.slice(0, 70) }); }
};

console.log(APPLY ? '\n*** APPLYING ***\n' : '\n--- DRY RUN (pass --apply to execute) ---\n');

for (const [t, why] of TRUNCATE) {
  let n = null;
  try { n = (await q(`SELECT COUNT(*)::int AS n FROM "${t}"`))[0].n; }
  catch { results.push({ target: t, action: 'absent', detail: 'no such table' }); continue; }
  if (n === 0) { results.push({ target: t, action: 'already empty' }); continue; }
  console.log(`  ${t} (${n} rows) — ${why}`);
  await run(t, `TRUNCATE "${t}" RESTART IDENTITY CASCADE`);
}

for (const c of CONFIG_NULL) await run(`studio_configs.${c}`, `UPDATE studio_configs SET ${c} = NULL`);
for (const c of INTEGRATION_NULL) await run(`studio_integrations.${c}`, `UPDATE studio_integrations SET ${c} = NULL`);

// One key inside app_settings is the previous tenant's, the rest of the row is not.
await run('app_settings.questionnaire_confirmation_email',
  `UPDATE app_settings SET questionnaire_confirmation_email = NULL`);

console.log('');
console.table(results);
const failed = results.filter((r) => r.action === 'FAILED');
console.log(failed.length ? `\n${failed.length} STATEMENT(S) FAILED — see above.` : '\nNo statement failed.');
if (APPLY) console.log('\nNow RESTART the Render service: several caches (authority map, site theme,\ncurrency, SMTP transporter, routeMetaCache) are not invalidated by a reset, and\nOPENAI_API_KEY is only read from the DB into env at boot.');

await pool.end();
