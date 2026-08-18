// What still holds data after reset-demo. Read-only discovery.
import pg from 'pg';
import fs from 'fs';

const line = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
const pool = new pg.Pool({
  connectionString: line.slice(13).trim().replace(/^["']|["']$/g, ''),
  max: 2, ssl: { rejectUnauthorized: false },
});
const q = async (s, a = []) => (await pool.query(s, a)).rows;

// Everything reset-demo touches, from server/setup-routes.ts:778-786.
const CLEARED = new Set([
  'crm_invoice_items', 'crm_invoices', 'crm_leads', 'crm_clients', 'gallery_images',
  'galleries', 'voucher_sales', 'voucher_products', 'lead_sources', 'email_campaigns',
  'landing_pages', 'blog_posts', 'admin_users',
  'manual_page_content', 'homepage_images', 'portfolio_images', 'ui_translations',
  'i18n_settings', 'website_pages', 'crawl_jobs', 'theme_analysis', 'onboarding_sessions',
  'user_sessions', 'questionnaire_responses', 'questionnaire_links', 'competitor_prices',
  'price_list_suggestions', 'competitor_research', 'price_wizard_sessions',
  'gallery_order_items', 'gallery_orders', 'print_orders', 'workflow_step_executions',
  'workflow_executions', 'workflow_instances', 'workflow_analytics',
]);

const tables = await q(`SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`);

const dirty = [];
for (const { table_name: t } of tables) {
  let n = 0;
  try { n = (await q(`SELECT COUNT(*)::int AS n FROM "${t}"`))[0].n; } catch { continue; }
  if (n > 0 && !CLEARED.has(t)) dirty.push({ table: t, rows: n });
}

console.log(`\n${tables.length} tables total, ${CLEARED.size} named by reset-demo.`);
console.log(`\nTABLES WITH ROWS THAT reset-demo DOES NOT NAME (${dirty.length}):\n`);
console.table(dirty.sort((a, b) => b.rows - a.rows));

// The studio_configs / studio_integrations columns the reset leaves populated.
const cfg = (await q(`SELECT * FROM studio_configs LIMIT 1`))[0] || {};
const CLEARED_COLS = new Set([
  'creative_setup_complete', 'technical_setup_complete', 'onboarding_state',
  'homepage_gen_state', 'homepage_landing_slug', 'homepage_draft_landing_id', 'pricing_embed_url',
  'business_name', 'logo_url', 'meta_description', 'address', 'city', 'phone', 'website',
  'latitude', 'longitude', 'authority_map', 'shootcleaner_api_key', 'shootcleaner_webhook_url',
  'shootcleaner_webhook_secret', 'app_url', 'frontend_url', 'public_site_base_url',
  'enabled_pages', 'site_language', 'studio_name', 'facebook_url', 'instagram_url',
  'twitter_url', 'ga4_measurement_id', 'meta_pixel_id', 'tagline', 'primary_color',
  'site_theme_preset', 'currency', 'vat_number', 'timezone', 'date_format', 'id',
]);
const survivors = Object.entries(cfg)
  .filter(([k, v]) => !CLEARED_COLS.has(k) && v !== null && v !== '' && v !== false)
  .map(([k, v]) => ({ column: k, value: String(JSON.stringify(v)).slice(0, 60) }));

console.log(`\nstudio_configs COLUMNS STILL SET AFTER A RESET (${survivors.length}):\n`);
console.table(survivors);

await pool.end();
