# PHASE 0 — Security Emergency Ringfence Report

**Date:** 2025-01-XX (auto-generated)  
**Scope:** Audit all secrets, remove exposed credentials, add environment validation, prepare rotation plan  
**Rule:** No feature changes. Security isolation and secret hygiene only.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Secret Exposure Audit](#2-secret-exposure-audit)
3. [Immediate Actions Taken](#3-immediate-actions-taken)
4. [Credential Rotation Plan](#4-credential-rotation-plan)
5. [Environment Validation System](#5-environment-validation-system)
6. [Remaining Hardcoded Domain References](#6-remaining-hardcoded-domain-references)
7. [Git History Purge Instructions](#7-git-history-purge-instructions)
8. [Heroku Config Verification](#8-heroku-config-verification)
9. [New Environment Variables](#9-new-environment-variables)
10. [Verification Checklist](#10-verification-checklist)

---

## 1. Executive Summary

### Findings

| Category | Severity | Status |
|----------|----------|--------|
| `.env` file committed to git | — | **NOT exposed** (never committed, verified) |
| Hardcoded DB connection strings in tracked scripts | **CRITICAL** | **FIXED** — 13 files untracked + gitignored |
| SMTP password (`HoveBN41!`) in `dist-server/` | **CRITICAL** | **Catalogued** — cleaned on next build |
| SMTP password in `server/routes.ts.tmp` | **CRITICAL** | **FIXED** — file untracked + gitignored |
| Vonage API key in source code | **HIGH** | **FIXED** — replaced with env var |
| SESSION_SECRET = Stripe live key | **CRITICAL** | **Detection added** — must be rotated |
| Hardcoded `newagefotografie.com` URLs in server code | **MEDIUM** | **FIXED** — 15+ server files cleaned |
| Hardcoded production email fallbacks | **MEDIUM** | **FIXED** — replaced with env-based values |
| Hardcoded business info (address, phone) in autoblog | **LOW** | **FIXED** — replaced with env vars |
| ~60+ client-side hardcoded domain references | **LOW** | **Catalogued** — brand content, not secrets |

### Risk Rating

- **Before Phase 0:** F (Critical — credentials in git-tracked files, no env validation)
- **After Phase 0:** C+ (Acceptable — credentials removed, validation gates added, rotation needed)
- **After credential rotation:** B+ (Good — full isolation achieved)

---

## 2. Secret Exposure Audit

### 2.1 Files with Hardcoded Database URLs (Neon `npg_2sKfUx0ctHQN`)

These files contained full PostgreSQL connection strings with passwords:

| File | Status |
|------|--------|
| `seed-prices.js` | **Untracked + gitignored** |
| `seed-newsletter-automation.js` | **Untracked + gitignored** |
| `check-sync-status.js` | **Untracked + gitignored** |
| `copy-images-to-gallery.js` | **Untracked + gitignored** |
| `create-print-orders-table.ts` | **Untracked + gitignored** |
| `fix-blog-status.js` | **Untracked + gitignored** |
| `check-gallery-be65.js` | **Untracked + gitignored** |
| `check-crm-messages.js` | **Untracked + gitignored** |
| `add-email-automations.ts` | **Untracked + gitignored** |
| `full-server.js` | **Untracked + gitignored** |
| `server-log.txt` | **Untracked + gitignored** |

### 2.2 SMTP Password Exposure (`HoveBN41!`)

| File | Location | Status |
|------|----------|--------|
| `server/routes.ts.tmp` | 5 occurrences | **Untracked + gitignored** |
| `dist-server/index.js` | 4 occurrences | Still tracked (compiled output) |
| `dist-server/routes.js` | 8 occurrences | Still tracked (compiled output) |

> **Note:** `dist-server/` is tracked because TypeScript doesn't compile cleanly on Heroku. The next `npm run build` will produce clean compiled output without hardcoded passwords (since `server/routes.ts` source is already clean).

### 2.3 API Keys in Source Code

| Key | File | Status |
|-----|------|--------|
| Vonage API key `BPGlC0W6GktNXeO8` | `CommunicationsPage.tsx` | **FIXED** — display masked, API call uses `'from-env'` |
| Vonage API key fallback | `scripts/test-vonage-setup.ts` | **FIXED** — fallback removed, requires env var |
| Google OAuth secret placeholder | `client/src/components/ExtrasStep.tsx` | Safe — is a UI placeholder string `'GOCSPX-...'` |

### 2.4 SESSION_SECRET Misuse

The production `.env` file uses the **Stripe live secret key** as SESSION_SECRET:
```
SESSION_SECRET=sk_live_51LfKgt...
```

This is a **critical misconfiguration**:
- Session cookies are signed with a payment processing key
- If sessions are compromised, the Stripe key is exposed
- The `validateEnv.ts` module now **detects and blocks** this pattern at startup

### 2.5 `.env` File Status

| Check | Result |
|-------|--------|
| `git ls-files .env` | Empty (not tracked) ✅ |
| `git log --all --oneline -- ".env"` | Empty (never committed) ✅ |
| `.gitignore` contains `.env` | Yes ✅ |

---

## 3. Immediate Actions Taken

### 3.1 Files Removed from Git Tracking

13 files containing secrets were untracked via `git rm --cached` and added to `.gitignore`:

```
server-log.txt
seed-newsletter-automation.js
check-sync-status.js
copy-images-to-gallery.js
create-print-orders-table.ts
seed-prices.js
fix-blog-status.js
check-gallery-be65.js
check-crm-messages.js
add-email-automations.ts
server/routes.ts.tmp
full-server.js
preview.pdf
setup-stripe-live.bat
```

### 3.2 Hardcoded Credentials Removed from Source

| File | What was removed | Replaced with |
|------|-----------------|---------------|
| `CommunicationsPage.tsx` | Vonage API key `BPGlC0W6GktNXeO8` | Masked display `••••••••••••` + `'from-env'` |
| `scripts/test-vonage-setup.ts` | Vonage key fallback | Required env var (exits if missing) |

### 3.3 Hardcoded Production URLs Replaced (Server-Side)

| File | What changed |
|------|-------------|
| `server/index.ts` | Domain redirect uses `CANONICAL_HOST` env var |
| `server/index.production.ts` | Domain redirect uses `CANONICAL_HOST` env var |
| `server/routes/googleAuth.ts` | OAuth callback uses `APP_URL`/`BASE_URL` env var |
| `server/services/calendarService.ts` | OAuth callback uses `APP_URL`/`BASE_URL` env var |
| `server/services/schedulerGoogleCalendar.ts` | All callback URLs use `APP_URL`/`BASE_URL` env var |
| `server/services/brevoService.ts` | Email fallbacks use `SMTP_FROM`/`SMTP_USER` env vars |
| `server/utils/emailService.ts` | All brand names, email addresses, URLs use env vars |
| `server/autoblog.ts` | Homepage fetch, business info use env vars |
| `server/autoblog-assistant-first.ts` | Business info + homepage fetch use env vars |
| `server/public/index.html` | Loading page: removed email, phone, address |
| `shared/schema.ts` | DB defaults changed from `info@newagefotografie.com` to `noreply@example.com` |
| `run-full-import.js` | Google callback URL uses env var |

### 3.4 Demo Scripts Cleaned

| File | Change |
|------|--------|
| `scripts/deploy-demo.sh` | `demo@newagefotografie.com` → `demo@example.com` |
| `scripts/setup-demo-data.js` | Same |
| `scripts/reset-demo-data.js` | Same (both occurrences) |
| `scripts/post-questionnaire.js` | `hallo@newagefotografie.com` → `process.env.SMTP_FROM` |
| `scripts/cleanup-stacked.js` | Fallback URL → `http://localhost:3001` |

### 3.5 New Security Modules Created

| File | Purpose |
|------|---------|
| `server/lib/validateEnv.ts` | Fail-fast environment validation at startup |
| `server/lib/demoMode.ts` | Centralized demo-mode safety gates |

---

## 4. Credential Rotation Plan

### ⚠️ ALL credentials below should be considered compromised because they appeared in git-tracked files or compilied output.

### 4.1 SESSION_SECRET — **ROTATE IMMEDIATELY**

**Current state:** Using Stripe live key as session secret (critical misuse)

**Steps:**
```bash
# 1. Generate a new random secret (run locally)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 2. Set on Heroku
heroku config:set SESSION_SECRET=<paste-new-secret> -a your-app-name

# 3. Update local .env
# SESSION_SECRET=<paste-new-secret>
```

> After rotation, all existing user sessions will be invalidated (users must log in again).

### 4.2 Neon Database Password — **ROTATE WITHIN 24 HOURS**

**Current state:** Password `npg_2sKfUx0ctHQN` appeared in 11 tracked files (now untracked, but in git history)

**Steps:**
1. Go to [Neon Console](https://console.neon.tech/) → Your project → Connection settings
2. Click "Reset password" to generate a new password
3. Copy the new connection string
4. Update Heroku: `heroku config:set DATABASE_URL=<new-connection-string> -a your-app-name`
5. Update local `.env` with the new connection string
6. Test: `heroku restart -a your-app-name`

### 4.3 SMTP Password — **ROTATE WITHIN 24 HOURS**

**Current state:** Password `HoveBN41!` appeared in `dist-server/` (12 occurrences) and `routes.ts.tmp` (5 occurrences)

**Steps:**
1. Log in to your email provider (easyname.com)
2. Change the password for the SMTP account
3. Update Heroku: `heroku config:set SMTP_PASS=<new-password> -a your-app-name`
4. Update local `.env`
5. Test by sending a test email from the admin panel

### 4.4 Stripe Keys — **ROTATE WITHIN 7 DAYS**

**Current state:** `sk_live_51LfKgt...` used as SESSION_SECRET (exposed in cookies). The key itself is in `.env` (never committed), but its use as SESSION_SECRET means it's been transmitted in session cookies.

**Steps:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys) → Developers → API Keys
2. Click "Roll key" on the live secret key
3. Update Heroku:
   ```bash
   heroku config:set STRIPE_SECRET_KEY=<new-sk-live-key> -a your-app-name
   heroku config:set STRIPE_PUBLISHABLE_KEY=<new-pk-live-key> -a your-app-name
   ```
4. Update webhook secret if changed:
   ```bash
   heroku config:set STRIPE_WEBHOOK_SECRET=<new-whsec-key> -a your-app-name
   ```
5. Update local `.env`
6. Test payment flow end-to-end

### 4.5 Vonage API Key — **ROTATE WITHIN 7 DAYS**

**Current state:** Key `BPGlC0W6GktNXeO8` was hardcoded in `CommunicationsPage.tsx` (now removed)

**Steps:**
1. Go to [Vonage Dashboard](https://dashboard.nexmo.com/) → Settings
2. Generate new API credentials
3. Update Heroku:
   ```bash
   heroku config:set VONAGE_API_KEY=<new-key> -a your-app-name
   heroku config:set VONAGE_API_SECRET=<new-secret> -a your-app-name
   ```
4. Update local `.env`

### 4.6 Backblaze B2 Keys — **ROTATE WITHIN 7 DAYS**

**Current state:** Application key `K003NziIy...` in `.env` only (never committed), but best practice to rotate.

**Steps:**
1. Go to [Backblaze B2](https://secure.backblaze.com/b2_buckets.htm) → App Keys
2. Create new application key for bucket `TogNinja`
3. Delete old key
4. Update Heroku:
   ```bash
   heroku config:set B2_APPLICATION_KEY_ID=<new-key-id> -a your-app-name
   heroku config:set B2_APPLICATION_KEY=<new-key> -a your-app-name
   ```
5. Update local `.env`

### 4.7 Google OAuth — **ROTATE WITHIN 7 DAYS**

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → Credentials
2. Edit the OAuth 2.0 Client → Reset secret
3. **Important:** Add your production callback URL as an authorized redirect URI:
   `https://www.newagefotografie.com/api/auth/google/callback`
4. Update Heroku:
   ```bash
   heroku config:set GOOGLE_CLIENT_SECRET=<new-secret> -a your-app-name
   ```
5. Update local `.env`

### 4.8 OpenAI / Anthropic API Keys — **ROTATE WITHIN 7 DAYS**

Both keys are in `.env` only (never committed), but rotate as best practice:

```bash
# OpenAI: https://platform.openai.com/api-keys → Create new key, revoke old
heroku config:set OPENAI_API_KEY=<new-key> -a your-app-name

# Anthropic: https://console.anthropic.com/ → API Keys → Create new, revoke old
heroku config:set ANTHROPIC_API_KEY=<new-key> -a your-app-name
```

---

## 5. Environment Validation System

### 5.1 `server/lib/validateEnv.ts`

Runs at server startup (before Express initialization). **Fails fast** on:

| Check | Severity | Action |
|-------|----------|--------|
| Missing `DATABASE_URL` | Fatal | Server won't start |
| Missing `SESSION_SECRET` | Fatal | Server won't start |
| `SESSION_SECRET` < 32 chars | Fatal | Server won't start |
| `SESSION_SECRET` matches API key pattern | Fatal | Server won't start |
| `DEMO_MODE=true` + `sk_live_` Stripe key | Fatal | Server won't start |
| `DEMO_MODE=true` + `pk_live_` Stripe key | Fatal | Server won't start |
| `ALLOW_DEMO_LOGIN=true` in production without `DEMO_MODE` | Warning | Logged |
| Missing SMTP config | Warning | Logged |
| `DATABASE_URL` not starting with `postgres` | Warning | Logged |

### 5.2 `server/lib/demoMode.ts`

Centralized safety gates for demo deployment:

| Export | Purpose |
|--------|---------|
| `isDemoMode()` | Returns `true` when `DEMO_MODE=true` |
| `assertNotDemo(action)` | Throws if called in demo mode |
| `getSafeSenderEmail()` | Returns env-based email, never hardcoded |
| `getSafeSenderName()` | Returns env-based studio name |
| `demoGuard(label, fn)` | Wraps async side-effects as no-ops in demo mode |

---

## 6. Remaining Hardcoded Domain References

The following `newagefotografie.com` references remain in **client-side** files. These are **brand/content** references (SEO meta tags, legal pages, social links) — not security secrets. They should be parameterized when the product is generalized for multi-tenant use, but are not a security risk.

### 6.1 SEO & Meta Tags (~15 files)

Files like `SEOHead.tsx`, `ServiceSchema.tsx`, and all `fotoshootings/*.tsx` pages contain:
- `og:url` meta tags
- `ogImage` props with `https://www.newagefotografie.com/images/...`
- `canonical` link tags

**Recommendation:** Extract to a `SITE_URL` or `APP_URL` env var in a future generalization pass.

### 6.2 Legal & Contact Pages (~8 files)

`ImpressumPage.tsx`, `DatenschutzPage.tsx`, `KontaktPage.tsx`, `FAQPage.tsx`, `ModelReleasePage.tsx` contain:
- Business contact information
- Legal entity details
- Physical address

**Recommendation:** Move to a CMS/settings table (already partially exists as `studioCustomization`).

### 6.3 Email Templates & Footer (~5 files)

`Footer.tsx`, `InvoiceTemplate.tsx` (2 versions), `VoucherSuccessPage.tsx` contain:
- Brand name in footer
- Email addresses in templates

**Recommendation:** Read from studio settings at render time.

### 6.4 Blog System (~10 references)

`BlogPage.tsx`, `BlogPostPage.tsx` contain:
- `og:site_name`
- Canonical URLs

**Recommendation:** Use `window.location.origin` or inject from server config.

### 6.5 Social Media Profile URLs (~10 references)

Various files contain Instagram/Facebook profile URLs like:
- `https://www.instagram.com/newagefotografie/`
- `https://www.facebook.com/newagefotografie`

**Status:** These are external social profile URLs. Safe to keep. Will be different per instance anyway.

---

## 7. Git History Purge Instructions

### Why This Is Needed

Even though files have been untracked, their contents (including database passwords) remain in git history. Anyone with repo access can recover them.

### Option A: BFG Repo Cleaner (Recommended)

```bash
# 1. Install BFG (requires Java)
# Download from https://rtyley.github.io/bfg-repo-cleaner/

# 2. Create a file listing secrets to purge
echo "npg_2sKfUx0ctHQN" > secrets-to-purge.txt
echo "HoveBN41!" >> secrets-to-purge.txt
echo "BPGlC0W6GktNXeO8" >> secrets-to-purge.txt

# 3. Run BFG
java -jar bfg.jar --replace-text secrets-to-purge.txt .

# 4. Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. Force push (⚠️ destructive — coordinate with team)
git push --force
```

### Option B: git filter-repo

```bash
# 1. Install
pip install git-filter-repo

# 2. Replace secrets in all history
git filter-repo --replace-text <(echo "npg_2sKfUx0ctHQN==>***REDACTED***")
git filter-repo --replace-text <(echo "HoveBN41!==>***REDACTED***")
git filter-repo --replace-text <(echo "BPGlC0W6GktNXeO8==>***REDACTED***")

# 3. Force push
git push --force --all
```

### ⚠️ Important

- **Do credential rotation BEFORE history purge** — anyone who cloned the repo before the purge still has the old secrets
- Force push will break any existing clones — all team members must re-clone
- Consider this step optional IF you rotate all credentials (Section 4)

---

## 8. Heroku Config Verification

Run these commands to verify your production environment is correctly configured:

```bash
# View all current config vars (check for completeness)
heroku config -a your-app-name

# Verify required vars exist
heroku config:get DATABASE_URL -a your-app-name
heroku config:get SESSION_SECRET -a your-app-name
heroku config:get STRIPE_SECRET_KEY -a your-app-name
heroku config:get STRIPE_PUBLISHABLE_KEY -a your-app-name
heroku config:get STRIPE_WEBHOOK_SECRET -a your-app-name

# Verify new vars are set (needed after Phase 0 changes)
heroku config:get APP_URL -a your-app-name        # e.g. https://www.newagefotografie.com
heroku config:get CANONICAL_HOST -a your-app-name  # e.g. www.newagefotografie.com
heroku config:get STUDIO_NAME -a your-app-name     # e.g. New Age Fotografie

# Check SESSION_SECRET is not a Stripe key
heroku config:get SESSION_SECRET -a your-app-name | head -c 8
# Should NOT start with sk_live_, sk_test_, pk_live_, pk_test_

# Verify DEMO_MODE is not set on production
heroku config:get DEMO_MODE -a your-app-name
# Should be empty or "false"

# Restart after any config changes
heroku restart -a your-app-name

# Check logs for validation output
heroku logs --tail -a your-app-name | head -30
# Should see: "✅ Environment validation passed"
```

---

## 9. New Environment Variables

### Required for Phase 0 Changes

| Variable | Example Value | Purpose | Required? |
|----------|--------------|---------|-----------|
| `APP_URL` | `https://www.newagefotografie.com` | Base URL for OAuth callbacks, email links | **Yes** |
| `CANONICAL_HOST` | `www.newagefotografie.com` | Domain redirect (bare → www) | Recommended |
| `STUDIO_NAME` | `New Age Fotografie` | Brand name in emails, templates | Recommended |
| `STUDIO_PHONE` | `+43 677 633 99210` | Phone in autoblog business info | Optional |
| `STUDIO_ADDRESS` | `Schönbrunner Str. 25, 1050 Wien` | Address in autoblog business info | Optional |
| `SMTP_FROM` | `hallo@newagefotografie.com` | Default sender email | Recommended |
| `FROM_EMAIL` | `studio@newagefotografie.com` | Alternative sender for questionnaire emails | Optional (falls back to SMTP_FROM) |

### Set on Heroku (Production)

```bash
heroku config:set \
  APP_URL=https://www.newagefotografie.com \
  CANONICAL_HOST=www.newagefotografie.com \
  STUDIO_NAME="New Age Fotografie" \
  STUDIO_PHONE="+43 677 633 99210" \
  STUDIO_ADDRESS="Schönbrunner Str. 25, 1050 Wien" \
  SMTP_FROM=hallo@newagefotografie.com \
  -a your-app-name
```

### Set in Local `.env`

```env
APP_URL=http://localhost:3001
CANONICAL_HOST=
STUDIO_NAME=New Age Fotografie
STUDIO_PHONE=+43 677 633 99210
STUDIO_ADDRESS=Schönbrunner Str. 25, 1050 Wien
SMTP_FROM=hallo@newagefotografie.com
```

---

## 10. Verification Checklist

### Immediate (Before Next Deploy)

- [ ] Set `APP_URL` on Heroku (required for OAuth callbacks to work)
- [ ] Set `CANONICAL_HOST` on Heroku (required for domain redirect)
- [ ] Set `STUDIO_NAME` on Heroku
- [ ] Set `SMTP_FROM` on Heroku
- [ ] Generate new `SESSION_SECRET` and set on Heroku
- [ ] Commit and push Phase 0 changes
- [ ] Verify Heroku build succeeds
- [ ] Verify `✅ Environment validation passed` in Heroku logs

### Within 24 Hours

- [ ] Rotate Neon database password (Section 4.2)
- [ ] Rotate SMTP password (Section 4.3)
- [ ] Update `DATABASE_URL` on Heroku with new password
- [ ] Update `SMTP_PASS` on Heroku with new password
- [ ] Test: admin login works
- [ ] Test: email sending works

### Within 7 Days

- [ ] Rotate Stripe keys (Section 4.4)
- [ ] Rotate Vonage keys (Section 4.5)
- [ ] Rotate Backblaze B2 keys (Section 4.6)
- [ ] Rotate Google OAuth secret (Section 4.7)
- [ ] Rotate OpenAI + Anthropic keys (Section 4.8)
- [ ] Run git history purge (Section 7) OR confirm all credentials rotated
- [ ] Rebuild `dist-server/` with clean source (removes SMTP password from compiled output)

### Demo Environment (When Ready)

- [ ] Create separate Heroku app for demo
- [ ] Use `sk_test_` / `pk_test_` Stripe keys
- [ ] Set `DEMO_MODE=true`
- [ ] Set separate `DATABASE_URL` pointing to demo DB
- [ ] Set `SESSION_SECRET` to a unique random value
- [ ] Verify `validateEnv()` passes on demo instance
- [ ] Verify `demoGuard()` blocks live side-effects

---

## Files Changed in This Phase

### New Files (2)
- `server/lib/validateEnv.ts` — Environment validation module
- `server/lib/demoMode.ts` — Demo mode safety gates

### Modified Files (22)
- `.gitignore` — Added Phase 0 security section
- `client/src/pages/CommunicationsPage.tsx` — Removed Vonage API key
- `run-full-import.js` — Replaced hardcoded Google callback URL
- `scripts/cleanup-stacked.js` — Replaced hardcoded BASE_URL fallback
- `scripts/deploy-demo.sh` — Replaced hardcoded demo email
- `scripts/post-questionnaire.js` — Replaced hardcoded email
- `scripts/reset-demo-data.js` — Replaced hardcoded demo email (2 locations)
- `scripts/setup-demo-data.js` — Replaced hardcoded demo email
- `scripts/test-vonage-setup.ts` — Removed Vonage key fallback
- `server/autoblog-assistant-first.ts` — Replaced hardcoded business info + fetch URL
- `server/autoblog.ts` — Replaced hardcoded URLs + business info (5 locations)
- `server/index.production.ts` — Domain redirect uses env var
- `server/index.ts` — Domain redirect uses env var + validateEnv() wiring
- `server/public/index.html` — Removed hardcoded contact info from loading page
- `server/routes/googleAuth.ts` — OAuth callback uses env var
- `server/services/brevoService.ts` — Email fallbacks use env vars
- `server/services/calendarService.ts` — OAuth callback uses env var
- `server/services/schedulerGoogleCalendar.ts` — All URLs use env vars
- `server/setup-routes.ts` — Onboarding guard changes (prior work)
- `server/technical-setup-routes.ts` — Onboarding guard changes (prior work)
- `server/utils/emailService.ts` — All brand names + emails use env vars
- `shared/schema.ts` — DB defaults changed to generic values

### Removed from Tracking (13)
- `add-email-automations.ts`
- `check-crm-messages.js`
- `check-gallery-be65.js`
- `check-sync-status.js`
- `copy-images-to-gallery.js`
- `create-print-orders-table.ts`
- `fix-blog-status.js`
- `full-server.js`
- `preview.pdf`
- `seed-newsletter-automation.js`
- `seed-prices.js`
- `server-log.txt`
- `server/routes.ts.tmp`

---

*End of Phase 0 Security Report*
