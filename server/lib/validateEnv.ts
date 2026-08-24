/**
 * PHASE 0: Environment Validation Module
 *
 * Runs at server startup. Fails fast on misconfigurations to prevent
 * silent production-damaging defaults.
 *
 * Validates:
 *  - Required variables are present
 *  - Stripe live keys cannot be used in DEMO_MODE
 *  - SESSION_SECRET is not an API key and is long enough
 *  - No dangerous fall-through defaults
 */

interface EnvError {
  variable: string;
  message: string;
  severity: 'fatal' | 'warn';
}

export function validateEnv(): void {
  const errors: EnvError[] = [];
  const warnings: EnvError[] = [];

  const isProduction = process.env.NODE_ENV === 'production';
  const demoMode = (process.env.DEMO_MODE || '').toLowerCase() === 'true';

  // ── 1. Required variables ────────────────────────────────────────
  const required = ['DATABASE_URL'];
  for (const key of required) {
    if (!process.env[key]) {
      errors.push({ variable: key, message: `Missing required env var: ${key}`, severity: 'fatal' });
    }
  }

  // ── 2. SESSION_SECRET quality ────────────────────────────────────
  const sessionSecret = process.env.SESSION_SECRET || '';

  if (!sessionSecret) {
    errors.push({ variable: 'SESSION_SECRET', message: 'SESSION_SECRET is not set', severity: 'fatal' });
  } else {
    if (sessionSecret.length < 32) {
      errors.push({
        variable: 'SESSION_SECRET',
        message: `SESSION_SECRET is only ${sessionSecret.length} chars — must be ≥ 32`,
        severity: 'fatal',
      });
    }

    // Detect API key misuse as session secret
    const apiKeyPatterns = [
      /^sk_live_/,
      /^sk_test_/,
      /^pk_live_/,
      /^pk_test_/,
      /^sk-proj-/,
      /^sk-ant-api/,
      /^whsec_/,
    ];
    for (const pattern of apiKeyPatterns) {
      if (pattern.test(sessionSecret)) {
        errors.push({
          variable: 'SESSION_SECRET',
          message: `SESSION_SECRET looks like an API key (matches ${pattern}). Generate a real random secret.`,
          severity: 'fatal',
        });
        break;
      }
    }

    // Reject known placeholder / dev-default secrets. These pass the length +
    // API-key checks but are GUESSABLE, so anyone who knows the value can forge
    // admin session cookies. (Catches e.g. "dev-secret-change-in-production-…")
    //
    // FATAL in production so no tenant can ship with a placeholder. To make
    // that safe, a high-entropy secret is trusted outright and never pattern
    // matched — otherwise a randomly generated password that happened to
    // contain e.g. "1234567890" would crash a healthy production boot.
    // "Random" requires a genuine mix: lower AND upper AND digit/symbol.
    // (Digits alone are not enough — "dev-secret-change-in-production-12345"
    // is long and has digits but is still a guessable placeholder.)
    const distinctChars = new Set(sessionSecret).size;
    const looksRandom =
      sessionSecret.length >= 32 &&
      distinctChars >= 16 &&
      /[a-z]/.test(sessionSecret) &&
      /[A-Z]/.test(sessionSecret) &&
      /[0-9\W_]/.test(sessionSecret);

    const placeholderPatterns = [
      /change[-_ ]?in[-_ ]?production/i,
      /change[-_ ]?me/i,
      /\bdev[-_ ]?secret\b/i,
      /\byour[-_ ]?secret\b/i,
      /\bsecret[-_ ]?key\b/i,
      /placeholder/i,
      /\bexample\b/i,
      /^changeme/i,
      /1234567890/,
      /^(secret|password|test|dev|demo)([-_]?\w+)?$/i,
    ];
    if (!looksRandom && placeholderPatterns.some((p) => p.test(sessionSecret))) {
      const entry: EnvError = {
        variable: 'SESSION_SECRET',
        message: 'SESSION_SECRET looks like a placeholder/dev default (guessable → admin session cookies can be forged). Set a random 32+ char secret, e.g. `openssl rand -base64 48`.',
        severity: isProduction ? 'fatal' : 'warn',
      };
      (isProduction ? errors : warnings).push(entry);
    }
  }

  // ── 3. Stripe live/demo conflict ─────────────────────────────────
  const stripeKey = process.env.STRIPE_SECRET_KEY || '';

  if (demoMode && stripeKey.startsWith('sk_live_')) {
    errors.push({
      variable: 'STRIPE_SECRET_KEY',
      message: 'DEMO_MODE=true but STRIPE_SECRET_KEY is a LIVE key. Use sk_test_ keys for demo.',
      severity: 'fatal',
    });
  }

  if (demoMode && process.env.STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_')) {
    errors.push({
      variable: 'STRIPE_PUBLISHABLE_KEY',
      message: 'DEMO_MODE=true but STRIPE_PUBLISHABLE_KEY is a LIVE key. Use pk_test_ keys for demo.',
      severity: 'fatal',
    });
  }

  // ── 4. DATABASE_URL basic shape check ────────────────────────────
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl && !dbUrl.startsWith('postgres')) {
    // The single most common self-host mistake: pasting the Supabase PROJECT
    // URL (https://xxx.supabase.co) or the REST endpoint instead of the
    // Postgres connection string. Give a targeted, fix-it-now message.
    const looksLikeSupabaseProjectUrl = /^https?:\/\/[a-z0-9]+\.supabase\.(co|com)/i.test(dbUrl);
    errors.push({
      variable: 'DATABASE_URL',
      message: looksLikeSupabaseProjectUrl
        ? 'DATABASE_URL is a Supabase PROJECT URL (https://…supabase.co), not a database connection string. In Supabase go to Project Settings → Database → Connection string → URI (it starts with "postgresql://") and use THAT.'
        : 'DATABASE_URL must be a Postgres connection string starting with "postgres://" or "postgresql://". A web address (https://…) will not work.',
      severity: 'fatal',
    });
  }

  // ── 5. Warn if production flags are mixed ────────────────────────
  const allowDemoLogin = (process.env.ALLOW_DEMO_LOGIN || '').toLowerCase() === 'true';

  if (isProduction && allowDemoLogin && !demoMode) {
    warnings.push({
      variable: 'ALLOW_DEMO_LOGIN',
      message: 'ALLOW_DEMO_LOGIN=true in production without DEMO_MODE=true. This bypasses auth.',
      severity: 'warn',
    });
  }

  // ── 6. Warn on missing optional but important vars ───────────────
  const recommended = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  for (const key of recommended) {
    if (!process.env[key]) {
      warnings.push({ variable: key, message: `${key} not set — email sending will fail`, severity: 'warn' });
    }
  }

  // ── 7. Migration footguns — keys read directly from process.env ──
  // These silently DEGRADE (rather than error) if not carried over to a new
  // host, so they are the most common regressions on a Heroku→Render cutover:
  //   Stripe → demo/no-op checkout · OpenAI → AI + blog/site translation no-op.
  if (isProduction && !demoMode) {
    if (!stripeKey) {
      warnings.push({ variable: 'STRIPE_SECRET_KEY', message: 'not set in production — checkout will fall back to demo/no-op. Set the live sk_live_ key on the host.', severity: 'warn' });
    }
    if (!process.env.OPENAI_API_KEY) {
      warnings.push({ variable: 'OPENAI_API_KEY', message: 'not set — AI features and blog/site translation will silently no-op.', severity: 'warn' });
    }
    if (!process.env.AXIXOS_INTERNAL_API_KEY && !process.env.TAVILY_API_KEY) {
      warnings.push({ variable: 'AXIXOS_INTERNAL_API_KEY', message: 'no PLATFORM search key set (AXIXOS_INTERNAL_API_KEY or TAVILY_PLATFORM_API_KEY). A studio that has entered their own key in Technical Setup can still run AI Research; everyone else is limited to manual entry.', severity: 'warn' });
    }
    if (stripeKey && !(process.env.STRIPE_WEBHOOK_SECRET || '').startsWith('whsec_')) {
      warnings.push({ variable: 'STRIPE_WEBHOOK_SECRET', message: 'missing/invalid — Stripe webhooks (payment fulfillment) will not verify. Set the whsec_ secret from the Stripe dashboard.', severity: 'warn' });
    }
  }

  // ── Report ───────────────────────────────────────────────────────
  if (warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    for (const w of warnings) {
      console.warn(`   ⚠️  [${w.variable}] ${w.message}`);
    }
  }

  if (errors.length > 0) {
    console.error('');
    console.error('🚨 ═══════════════════════════════════════════════════════');
    console.error('🚨  FATAL: Environment validation failed. Server cannot start.');
    console.error('🚨 ═══════════════════════════════════════════════════════');
    for (const e of errors) {
      console.error(`   ❌ [${e.variable}] ${e.message}`);
    }
    console.error('');
    console.error('Fix the above and restart. See PHASE-0-SECURITY-REPORT.md for rotation instructions.');
    console.error('');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
}
