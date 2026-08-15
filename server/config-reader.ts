/**
 * Centralized Configuration Reader
 * 
 * Reads app config from DB first (studio_configs + studio_integrations),
 * then falls back to environment variables.
 * 
 * Usage:
 *   import { config } from './config-reader';
 *   const stripeKey = await config.get('stripe_secret_key');
 *   const smtpHost = await config.get('smtp_host');
 * 
 * The config is lazy-loaded from DB on first access and cached for 60s.
 * Call config.invalidate() to force a reload.
 */

import { db } from './db';
import { studioConfigs, studioIntegrations, studios } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { decrypt } from './utils/encryption';

// Cache TTL in milliseconds
const CACHE_TTL = 60_000; // 60 seconds

// Mapping from config key to env var name (for fallback)
const ENV_MAP: Record<string, string> = {
  // Domain & URLs
  app_url: 'APP_URL',
  frontend_url: 'FRONTEND_URL',
  public_site_base_url: 'PUBLIC_SITE_BASE_URL',
  base_url: 'BASE_URL',
  
  // SMTP
  smtp_host: 'SMTP_HOST',
  smtp_port: 'SMTP_PORT',
  smtp_user: 'SMTP_USER',
  smtp_pass: 'SMTP_PASS',
  smtp_from: 'SMTP_FROM',
  smtp_secure: 'SMTP_SECURE',
  from_email: 'FROM_EMAIL',
  email_from_name: 'EMAIL_FROM_NAME',
  studio_notify_email: 'STUDIO_NOTIFY_EMAIL',
  
  // IMAP
  imap_host: 'INBOX_IMAP_HOST',
  imap_port: 'INBOX_IMAP_PORT',
  imap_user: 'INBOX_IMAP_USER',
  imap_pass: 'INBOX_IMAP_PASS',
  imap_tls: 'INBOX_IMAP_TLS',
  
  // Stripe
  stripe_secret_key: 'STRIPE_SECRET_KEY',
  stripe_publishable_key: 'STRIPE_PUBLISHABLE_KEY',
  stripe_webhook_secret: 'STRIPE_WEBHOOK_SECRET',
  vite_stripe_publishable_key: 'VITE_STRIPE_PUBLISHABLE_KEY',

  // Prodigi (print fulfilment) — per-tenant key; env is the fallback for the demo image
  prodigi_api_key: 'PRODIGI_API_KEY',
  prodigi_environment: 'PRODIGI_ENVIRONMENT',
  
  // Storage
  storage_access_key_id: 'AWS_ACCESS_KEY_ID',
  storage_secret_key: 'AWS_SECRET_ACCESS_KEY',
  storage_bucket: 'AWS_S3_BUCKET',
  storage_endpoint: 'AWS_S3_ENDPOINT',
  storage_region: 'AWS_REGION',
  
  // Google
  google_client_id: 'GOOGLE_CLIENT_ID',
  google_client_secret: 'GOOGLE_CLIENT_SECRET',
  google_api_key: 'GOOGLE_API_KEY',
  google_calendar_id: 'GOOGLE_CALENDAR_ID',
  
  // AI
  openai_api_key: 'OPENAI_API_KEY',
  openai_model: 'OPENAI_MODEL',
  anthropic_api_key: 'ANTHROPIC_API_KEY',
  openai_assistant_id: 'TOGNINJA_ASSISTANT_ID',
  
  // Brevo
  brevo_api_key: 'BREVO_API_KEY',
  
  // SMS
  sms_provider: 'SMS_PROVIDER',
  vonage_api_key: 'VONAGE_API_KEY',
  vonage_api_secret: 'VONAGE_API_SECRET',
  vonage_phone_number: 'VONAGE_PHONE_NUMBER',
  twilio_account_sid: 'TWILIO_ACCOUNT_SID',
  twilio_auth_token: 'TWILIO_AUTH_TOKEN',
  twilio_from_number: 'TWILIO_FROM_NUMBER',
  
  // Analytics
  ga4_measurement_id: 'GA4_MEASUREMENT_ID',
  meta_pixel_id: 'META_PIXEL_ID',
  
  // Business info (from studio_configs)
  studio_name: 'STUDIO_NAME',
  business_name: 'BUSINESS_NAME',
  default_cal_tz: 'DEFAULT_CAL_TZ',
};

// Which DB fields are encrypted and need decryption
const ENCRYPTED_FIELDS = new Set([
  'smtp_pass_encrypted',
  'stripe_secret_key_encrypted',
  'openai_api_key_encrypted',
  'storage_secret_key_encrypted',
  'google_client_secret_encrypted',
  'brevo_api_key_encrypted',
  'imap_pass_encrypted',
  'sms_auth_token_encrypted',
  'prodigi_api_key_encrypted',
]);

// Mapping from config key to actual DB column names
// Keys ending in _encrypted get decrypted automatically
const DB_FIELD_MAP: Record<string, { table: 'studio_configs' | 'studio_integrations'; column: string }> = {
  // studio_configs fields
  studio_name: { table: 'studio_configs', column: 'studioName' },
  business_name: { table: 'studio_configs', column: 'businessName' },
  app_url: { table: 'studio_configs', column: 'appUrl' },
  frontend_url: { table: 'studio_configs', column: 'frontendUrl' },
  public_site_base_url: { table: 'studio_configs', column: 'publicSiteBaseUrl' },
  timezone: { table: 'studio_configs', column: 'timezone' },
  logo_url: { table: 'studio_configs', column: 'logoUrl' },
  primary_color: { table: 'studio_configs', column: 'primaryColor' },
  owner_email: { table: 'studio_configs', column: 'ownerEmail' },
  phone: { table: 'studio_configs', column: 'phone' },
  email: { table: 'studio_configs', column: 'email' },
  website: { table: 'studio_configs', column: 'website' },
  address: { table: 'studio_configs', column: 'address' },
  ga4_measurement_id: { table: 'studio_configs', column: 'ga4MeasurementId' },
  meta_pixel_id: { table: 'studio_configs', column: 'metaPixelId' },
  technical_setup_complete: { table: 'studio_configs', column: 'technicalSetupComplete' },
  
  // studio_integrations fields
  smtp_host: { table: 'studio_integrations', column: 'smtp_host' },
  smtp_port: { table: 'studio_integrations', column: 'smtp_port' },
  smtp_user: { table: 'studio_integrations', column: 'smtp_user' },
  smtp_pass: { table: 'studio_integrations', column: 'smtp_pass_encrypted' },
  smtp_from: { table: 'studio_integrations', column: 'default_from_email' },
  // The onboarding "From Email"/"From Name" land in these columns; getFromAddress() reads
  // from_email / email_from_name, so they must be mapped or outbound mail falls back to
  // no-reply@localhost (which most SMTP providers reject).
  from_email: { table: 'studio_integrations', column: 'default_from_email' },
  email_from_name: { table: 'studio_integrations', column: 'email_from_name' },
  stripe_publishable_key: { table: 'studio_integrations', column: 'stripe_publishable_key' },
  stripe_secret_key: { table: 'studio_integrations', column: 'stripe_secret_key_encrypted' },
  stripe_account_id: { table: 'studio_integrations', column: 'stripe_account_id' },
  // Prodigi print fulfilment (per-tenant key + sandbox/production toggle)
  prodigi_api_key: { table: 'studio_integrations', column: 'prodigi_api_key_encrypted' },
  prodigi_environment: { table: 'studio_integrations', column: 'prodigi_environment' },
  openai_api_key: { table: 'studio_integrations', column: 'openai_api_key_encrypted' },
  storage_provider: { table: 'studio_integrations', column: 'storage_provider' },
  storage_access_key_id: { table: 'studio_integrations', column: 'storage_access_key_id' },
  storage_secret_key: { table: 'studio_integrations', column: 'storage_secret_key_encrypted' },
  storage_bucket: { table: 'studio_integrations', column: 'storage_bucket' },
  storage_endpoint: { table: 'studio_integrations', column: 'storage_endpoint' },
  storage_region: { table: 'studio_integrations', column: 'storage_region' },
  google_client_id: { table: 'studio_integrations', column: 'google_client_id' },
  google_client_secret: { table: 'studio_integrations', column: 'google_client_secret_encrypted' },
  google_calendar_id: { table: 'studio_integrations', column: 'google_calendar_id' },
  // Per-tenant Social & Reviews (set in the setup wizard, not host env)
  google_places_api_key: { table: 'studio_integrations', column: 'google_places_api_key_encrypted' },
  google_places_place_id: { table: 'studio_integrations', column: 'google_places_place_id' },
  pulse_api_key: { table: 'studio_integrations', column: 'pulse_api_key_encrypted' },
  pulse_profiles: { table: 'studio_integrations', column: 'pulse_profiles' },
  pulse_mode: { table: 'studio_integrations', column: 'pulse_mode' },
  brevo_api_key: { table: 'studio_integrations', column: 'brevo_api_key_encrypted' },
  imap_host: { table: 'studio_integrations', column: 'imap_host' },
  imap_port: { table: 'studio_integrations', column: 'imap_port' },
  imap_user: { table: 'studio_integrations', column: 'imap_user' },
  imap_pass: { table: 'studio_integrations', column: 'imap_pass_encrypted' },
  imap_tls: { table: 'studio_integrations', column: 'imap_tls' },
  sms_provider: { table: 'studio_integrations', column: 'sms_provider' },
  sms_account_sid: { table: 'studio_integrations', column: 'sms_account_sid' },
  sms_auth_token: { table: 'studio_integrations', column: 'sms_auth_token_encrypted' },
  sms_from_number: { table: 'studio_integrations', column: 'sms_from_number' },
};

interface CachedConfig {
  studioConfig: Record<string, any> | null;
  integrations: Record<string, any> | null;
  loadedAt: number;
}

let cache: CachedConfig = {
  studioConfig: null,
  integrations: null,
  loadedAt: 0,
};

/**
 * Load config from DB into cache. Safe to call repeatedly — respects TTL.
 */
async function loadFromDb(force = false): Promise<void> {
  // Skip if cache is fresh
  if (!force && cache.loadedAt > 0 && Date.now() - cache.loadedAt < CACHE_TTL) {
    return;
  }
  
  // If DB is not available, skip silently
  if (!db) {
    cache.loadedAt = Date.now();
    return;
  }
  
  try {
    // Load studio config
    const [sc] = await db.select().from(studioConfigs).limit(1);
    cache.studioConfig = sc ? { ...sc } : null;
    
    // Load integrations (get the first one — single-tenant)
    const [si] = await db.select().from(studioIntegrations).limit(1);
    cache.integrations = si ? { ...si } : null;
    
    cache.loadedAt = Date.now();
  } catch (error) {
    console.warn('[config-reader] Failed to load config from DB:', (error as Error).message);
    // Set loadedAt so we don't retry immediately
    cache.loadedAt = Date.now();
  }
}

/**
 * Get a config value. Looks up DB first, then env fallback.
 * 
 * @param key - Config key (e.g. 'stripe_secret_key', 'smtp_host')
 * @returns The config value or null
 */
async function get(key: string): Promise<string | null> {
  await loadFromDb();
  
  // 1. Try DB lookup
  const dbMapping = DB_FIELD_MAP[key];
  if (dbMapping) {
    const row = dbMapping.table === 'studio_configs' ? cache.studioConfig : cache.integrations;
    if (row) {
      const colName = dbMapping.column;
      let value = row[colName];
      
      // Decrypt if it's an encrypted field
      if (value && ENCRYPTED_FIELDS.has(colName)) {
        value = decrypt(value);
      }
      
      if (value !== null && value !== undefined && value !== '') {
        return String(value);
      }
    }
  }
  
  // 2. Env fallback
  const envKey = ENV_MAP[key] || key.toUpperCase();
  const envValue = process.env[envKey];
  if (envValue !== undefined && envValue !== '') {
    return envValue;
  }
  
  return null;
}

/**
 * Get a config value with a default fallback.
 */
async function getOrDefault(key: string, defaultValue: string): Promise<string> {
  const value = await get(key);
  return value ?? defaultValue;
}

/**
 * Get a numeric config value.
 */
async function getNumber(key: string, defaultValue: number): Promise<number> {
  const value = await get(key);
  if (value === null) return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Get a boolean config value.
 */
async function getBoolean(key: string, defaultValue: boolean): Promise<boolean> {
  const value = await get(key);
  if (value === null) return defaultValue;
  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Check if technical setup has been completed.
 */
async function isTechnicalSetupComplete(): Promise<boolean> {
  return getBoolean('technical_setup_complete', false);
}

/**
 * Copy DB-configured values (studio_configs / studio_integrations) into
 * process.env for any variable that ISN'T already set. This lets the many
 * runtime consumers that read process.env directly (Stripe, OpenAI, Google
 * OAuth, IMAP, Brevo, …) pick up values a studio entered in the setup wizard —
 * without refactoring every call site.
 *
 * SAFETY: env ALWAYS wins. A var already present in process.env is never
 * overridden, so an env-configured deployment is completely untouched; this only
 * fills gaps for a wizard-onboarded tenant. Best-effort — never throws.
 *
 * LIMITATION: runs during boot, so it cannot help module-level constants in
 * statically-imported modules that already read process.env at import time
 * (e.g. the top-level Stripe client in routes.ts). It DOES cover request-time
 * reads and lazily-imported services (the voucher checkout, most AI calls, etc).
 *
 * @returns the number of env vars filled from the DB.
 */
const hydratedEnvKeys = new Set<string>();

async function hydrateEnvFromDb(): Promise<number> {
  let filled = 0;
  try {
    await loadFromDb(true);
    for (const key of Object.keys(DB_FIELD_MAP)) {
      const envName = ENV_MAP[key];
      if (!envName) continue;               // no known env var to fill
      if (process.env[envName]) continue;   // env already set — env wins, never override
      const val = await get(key);           // DB (decrypted) → null if absent
      if (val) {
        process.env[envName] = val;
        // Record the provenance. Downstream, "env is set" is ambiguous: it can mean
        // an operator configured the deployment, or it can mean this function copied
        // a database row here seconds ago. Consumers that also have a live read of
        // the same row (siteIdentity, via site-address) need to tell those apart —
        // an operator override must still win, but a boot snapshot must not outrank
        // the row it was copied from. Carried in env rather than exported so
        // siteIdentity can stay import-free; see the note there.
        hydratedEnvKeys.add(envName);
        process.env.CONFIG_HYDRATED_ENV_KEYS = Array.from(hydratedEnvKeys).join(',');
        filled++;
      }
    }
  } catch (e) {
    console.warn('[config-reader] hydrateEnvFromDb failed:', (e as Error).message);
  }
  return filled;
}

/**
 * Invalidate the cache to force a reload on next access.
 */
function invalidate(): void {
  cache.loadedAt = 0;
}

/**
 * Get the raw cached studio config (for bulk access without individual lookups).
 */
async function getStudioConfig(): Promise<Record<string, any> | null> {
  await loadFromDb();
  return cache.studioConfig;
}

/**
 * Get the raw cached integrations config.
 */
async function getIntegrations(): Promise<Record<string, any> | null> {
  await loadFromDb();
  return cache.integrations;
}

export const config = {
  get,
  getOrDefault,
  getNumber,
  getBoolean,
  invalidate,
  hydrateEnvFromDb,
  isTechnicalSetupComplete,
  getStudioConfig,
  getIntegrations,
};
