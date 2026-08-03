# SmartTog Platform — Developer Handoff Document

**Prepared:** March 3, 2026 · **Revised:** July 17, 2026 (post-hardening — §8–§12 rewritten)
**Author:** GitHub Copilot (Senior Full-Stack Engineer — AI Pair); July 2026 revision: Claude Code
**Repository:** `workingnewage` (TogNinja / SmartTog Platform)
**Production URL:** https://newagefotografie.com
**Deployment:** GitHub → Heroku (Node.js) + Neon PostgreSQL + Backblaze B2

---

> **✅ Hardening complete — document revised July 17, 2026.**
> The July 2026 hardening pass is finished. §8 now contains the **definitive
> onboarding runbook for a new studio** plus the hardening summary; §9–§12 have
> been refreshed to the current state. The **Hardening Log** below is retained
> verbatim as the historical change record — each entry maps to commits on
> `main`. Where §8–§12 and the log describe the same change, they agree; the
> log carries the implementation detail.

---

## Hardening Log — Changes since March 3, 2026

_Running log so the eventual §8–§12 rewrite is accurate and cheap. Newest first.
Each entry maps to commits on `main`._

### Onboarding-impact checklist (from the July 2026 hardening)

New defaults/behaviours a **fresh tenant** now inherits — fold these into the onboarding docs/checklist during the §8–§12 rewrite. None break first-run onboarding; they are facts a new user/tenant must know.

- **Boot migrations run automatically on first start** (idempotent `ADD COLUMN IF NOT EXISTS`): `voucher_sales.campaign_id` (email→order attribution), gallery image columns, studio_configs onboarding columns. Safe; no manual step. If the app runs on a DB role without ALTER rights, these warn-and-continue.
- **A default "pre-shoot" questionnaire is auto-seeded at every startup** (`/q/pre-shoot`), in **German**, New-Age-flavoured. For a differently-branded or non-German tenant it will appear pre-made and should be edited. Note: it uses `ON CONFLICT (slug) DO UPDATE SET is_active=true`, so it **re-activates on every boot** even if a tenant deactivates it (content is not overwritten). Consider making this seed opt-in / tenant-templated for true multi-tenant onboarding.
- **Provider config is per-tenant via the setup wizard** — SMTP/Brevo (EmailStep), SMS Twilio/Vonage (ExtrasStep), Stripe, storage. Services read these through `config-reader` (DB → env). Onboarding **is** how messaging/payments get turned on; nothing is hardcoded to New Age.
- **Backblaze B2 storage is REQUIRED for Cloud Storage + all uploads** (galleries, voucher images, landing-page hero images, digital files). Configure it in the wizard's **Storage step** (provider `backblaze` + access key / secret / bucket / S3 endpoint / region) **or** via env: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_S3_ENDPOINT` (the B2 S3-compatible endpoint, e.g. `https://s3.eu-central-003.backblazeb2.com`), `AWS_REGION`. Without it, uploads and the Cloud Storage archive won't work. **Recommend making this a required onboarding step.**
- **Cloud Storage paid tiers (Starter/Pro/Enterprise) are a productization/reseller feature, not needed for a single self-hosted studio.** They require Stripe subscription products + `STRIPE_PRICE_STARTER`/`_PROFESSIONAL`/`_ENTERPRISE`; unconfigured, the upgrade buttons now return an honest "not enabled" message (was a cryptic "User not found"). The **Free plan + "Go to My Archive"** is the working path for a studio's own use. Consider hiding the paid tiers for self-hosted deployments.
- **Setup-wizard mutations are gated once an admin exists** — first-run onboarding is open (no admin yet); after Step 7 creates the admin, the credential-save + SMTP/Stripe-test endpoints require auth. Read-only status + `POST /complete` stay open so onboarding can't lock itself out.
- **Email campaigns start with 0 subscribers** — a new tenant's first campaign sends to nobody until newsletter sign-ups populate `email_subscribers`. Expected, not a bug. There is **no admin UI to import/manage subscribers yet** (only `/api/newsletter/signup` adds them).
- **Messaging degrades honestly when unconfigured** — email/SMS report "not configured / demo" instead of faking success. So a half-onboarded tenant gets truthful feedback.
- **Reports read live DB data** — a brand-new tenant will see mostly zeros/empty-states (no invoices/vouchers/galleries yet), which is correct. No mock data masks an empty account.
- **All public marketing copy is backend-controlled (July 18)** — a new tenant rebrands the whole public site from **Settings → Manual Website Update** (fotoshooting pages, both pillar pages, trust hub, homepage sections, FAQ, reviews, site settings) without touching code; published edits are live for visitors in ≤5 min. Blog posts, case studies, landing pages, vouchers and prices were always DB-driven. Only UI chrome (buttons/nav) and link-bearing list items remain in code. Crawler-visible (prerendered) copy updates on the next deploy.
- **Known onboarding gaps still open**: WhatsApp needs an approved Business sender (SMS-first); email open/click tracking needs a pixel + click-redirect; Landing Pages has no on-page lead-capture form (CTAs route to /booking, /vouchers, /contact).

### July 18, 2026
- **✅ FEATURE COMPLETED: Manual Website Update actually controls the live site** — the admin editor (Settings → Manual Website Update) saved draft/published copy to `manual_page_content` via `/api/manual-pages`, but **no public page ever read it back**: the site's `t()` only used the hardcoded translation tables, so admin edits were stored and silently ignored (found because previously-published Babyfotos hero images were sitting unused in the DB). Fixed with a new **public** `GET /api/manual-pages/published/all?language=` (merged flat `{translationKey: value}` map, 5-min cache) + a `LanguageContext` overlay: published values now override built-in copy site-wide in `t()`. **Onboarding note (§8.2): "backend controls the frontend" is a core product feature — all marketing copy on the fotoshooting pages, pillar pages, homepage sections, FAQ page, reviews and site settings is edited in Settings → Manual Website Update → Publish (live in ≤5 min for visitors; crawlers see prerender-baked copy until the next deploy, so redeploy after SEO-critical wording changes).**
- **Pillar pages made backend-editable** — `/gewerbliche-fotografie-wien/` ("Gewerbliche Fotografie (Pillar)": hero, 5 service-hub cards, guide heading/intro, CTAs) and `/warum-new-age-fotografie/` ("Warum New Age (Trust Hub)": hero, 4 proof cards, 4 process steps, guarantees heading, CTAs) added to `shared/manualPages.ts` with defaults in `LanguageContext` (DE+EN). The wedding pillar already used the manual.* pattern. Case studies are blog posts → already backend-managed. Convention kept: copy containing inline links stays in code.
- **SEO: server-side BODY injection for data-driven routes** (completes the meta-injection work) — non-JS crawlers (incl. the Infinite Authority auditor) saw an EMPTY hydration root on `/blog/:slug`, `/lp/:slug`, `/gutschein/:slug` → zero-word dead-end pages. `server/vite.ts` now injects a static HTML body from the same DB lookup as the meta (1.5s race, 5-min cache): blog = full article HTML (legacy-Markdown converted) + cover + topic-matched pillar-links block (mirror of `BlogPostPage`'s `PILLARS` — keep in sync) + conversion links; LP = every visible section's text (both content vocabularies, respects `sectionVisibility`); voucher = name/description/links. `X-Route-Body: hit` header for verification. The client uses `createRoot().render()` (not hydrate), so React replaces the injected body on mount — no hydration mismatch. Blog meta lookup switched to single-row `getBlogPostBySlug` (was fetching every published post's full content per lookup).
- **LP public renderer: dual-vocabulary sections fixed** — `content_json` exists in two shapes (AI generation writes raw arrays `benefits:[...]`/`faq:[...]`; an editor save writes normalized objects `{title, items}`/`{title, testimonials}`, whyChooseUs points as plain strings). The public renderer read only the AI shape, so **after any editor save benefits/testimonials/FAQ silently vanished and Why-Choose-Us rendered empty cards** (user-visible on `/lp/wienmobil-familienportrait`). Renderer + section components now accept both shapes (incl. `role`|`source` on testimonials); serializer writes objects for whyChooseUs reasons.
- **Familienfotos FAQ facts corrected (DE+EN defaults)** — shoots are **60 min** (was "90 Min."); image delivery is **selection same day; digital retouching ≤7 days; prints ≤14 days** (was "3–5 day selection / 10–14 day retouch"). Fixed in `LanguageContext` + inline fallbacks; from now on such copy is editable via Manual Website Update without a deploy.

### July 17, 2026
- **✅ BRANCHES CONVERGED (f3bc655)** — the recommended permanent cure is DONE: `main`'s tree was made byte-identical to `portable-pg` via a merge (portable had all the canonical idioms; main had zero unique files). A fifth incident forced the timing: a static `siteIdentity` import cherry-picked to main (which never tracked that file) crash-looped the dyno and **took the site down**; the merge both restored it and ended the bug class. Included: prerender-safe `__SITE_CONFIG__` (JSON script + safe loader — an unreplaced `%SITE_CONFIG_JSON%` token no longer crashes the prerender browser) and serve-time `renderIndexHtml()` on prerendered files. **New workflow: commit on `main`, then `git merge --ff-only main` on `portable-pg` and push both. NO MORE CHERRY-PICKING.** Verification for every risky change: build from a clean `git worktree` of the actual commit (a dirty working dir hid missing-file breaks all day).
- **Admin settings menus merged** — sidebar had two menus ("Customization" + "Settings") plus a stray Agent Console entry; now ONE Settings menu (Studio Templates, Website Wizard, Website Analyzer, Manual Website Update, Knowledge Base, Agent Console), mirrored as tiles in the Settings hub.
- **/lp homepage flash + LP SEO** — the SPA shell is the prerendered homepage; `/lp/<slug>` (View Live) visibly flashed homepage content before React rendered. Data-driven routes (`/blog`, `/gutschein`, `/lp`) now serve the shell with the hydration root **emptied via a depth-walk** (regex could not find #root's true closing tag; verified live: 95KB→11.8KB) and `/lp` gets request-time title/description/canonical via `getLandingPageBySlug`.
- **Inbox email-settings save fixed (and made real)** — the Inbox modal saved SMTP creds to the legacy `email_settings` table which NOTHING sends from; now saves to the canonical store (`/api/setup/technical/email` → `studio_integrations`, what smtp-helper reads), signature/out-of-office best-effort to legacy, real error messages. **The three email-settings surfaces (Inbox modal, Settings page, wizard) now all write the same canonical store.**
- **Landing Page publish silent failure** — the legacy preview-screen Publish used `fetch().then(r.json())` without `r.ok`; the server's 422 "not ready" validation ran the success path and the button appeared dead. Errors now surface with the specific missing-field list. (The newer `/admin/landing-pages/:id` editor already handled this.)
- **⚠️ PROCESS LESSON: the "used-but-not-imported" merge-artifact class** — four production incidents today traced to ONE cause: cherry-picking between the diverged branches (`portable-pg` uses `SITE`/`siteIdentity`; `main` historically used literals) auto-merges hunks that *reference* identifiers whose *imports/definitions* main never had. Bundlers don't catch bare identifiers, so it compiles and **crashes at runtime**: (1) missing `client/src/config/site.ts` on main → build failures; (2) 4 files using `SITE` without import → app crashed in the prerender browser → every build failed on `prerender-ready` timeout; (3) `renderedIndex()` called but never defined in main's `serveStatic` → async throw → 30s hang → Heroku 503 on all blog/voucher URLs; (4) `renderIndexHtml`/`getSiteIdentity` used without import in the same file. **Mitigations now standing:** local `vite build` on main before every push; targeted `tsc --noEmit` undefined-name checks on touched server files; a last-resort guard in the SPA catch-all that always responds; grep-sweeps for `SITE.` without import. **Real cure (recommended): converge the branches** so `main` and `portable-pg` differ only by env/config, not by code idioms.
- **Prerender pipeline fixed end-to-end** — three stacked build-failure causes closed: the SITE crash above; concurrency (4 Chrome tabs parsing the ~5MB bundle on a shared-CPU build dyno blew the 30s event wait → `maxConcurrentRoutes: 1`, `timeout: 90s`); and the useless fallback (`PRERENDER` is a config var, so the bare `npm run build` fallback prerendered too → fallback now runs `cross-env PRERENDER=`). Full `PRERENDER=1` build verified locally (~1m50s). `express.static` now `index:false` on main so prerendered pages flow through the catch-all (identity stamp + data-route handling).
- **Serve-time tenant identity** — the prerender browser has no env, so pages interpolating `SITE.name` baked the neutral "My Studio" into static HTML. `renderedIndex()` + the prerendered-file path now stamp `getSiteIdentity().name` (from `BUSINESS_NAME`, config var now set) over the fallback. **§8.2 runbook note: `BUSINESS_NAME`, `PUBLIC_SITE_URL`, `CONTACT_EMAIL`, `BUSINESS_PHONE` config vars are required for correct crawler-visible branding.**
- **Meta injection hardened** — lookup rebuilt on the proven request-time data path the dynamic sitemap uses (`./storage.js`, in-memory slug match, 5-min cache) after ad-hoc drizzle imports misbehaved; `injectRouteMeta` made attribute-tolerant, strips the prerendered homepage's canonical/og/description before injecting the route's own, and empties the hydration root so blog URLs don't serve homepage body content to non-JS crawlers (dist/index.html IS the prerendered homepage).
- **Landing-page CTA fixed for unconfigured pages** — `'/booking'`/`'/contact'` were not routes (SPA-shell flash); `book_now`/`waitlist` → `/warteliste`, `enquire`/`callback` → `/kontakt`. And the signed offer now falls back to the page's own generated `content_json.offerSection.price` (German number formats parsed) when no CTA price is set in Settings — every AI-generated LP's "Jetzt buchen" opens the voucher personalization flow at the page's advertised price out of the box.
- **Blog Publish Date: UTC round-trip bug (root cause of the accidental mass-publish)** — both blog forms rendered the `datetime-local` input via `toISOString().slice(0,16)` (UTC into a LOCAL-time input) and re-parsed per keystroke. On a UTC+7 machine the display shifted 7h per round-trip (picking 16:17 showed 09:17; typing "18" mangled to a past date), so "Scheduled" posts silently saved with **past dates → the scheduler published them immediately** (the July backlog incident). Fixed in `AdvancedBlogPostForm` + `BlogPostForm`: raw local string kept in state, local formatting for display, ISO conversion once at save; inline past-date warning under the field; **hard guard** blocks saving a SCHEDULED post with a past/invalid date.
- **SEO: commercial-B2B + trust-hub pillars** — `/gewerbliche-fotografie-wien/` (hub for product/real-estate/event/team/business-portrait; Service + FAQPage JSON-LD) and `/warum-new-age-fotografie/` (trust hub: reviews, team, FAQ, case studies, guarantees; deliberately no self-serving review markup). Wired: routes, prerender list, all 3 sitemap bases, sitewide footer links, RelatedTopicsBlock mappings. Completes the audit's missing-pillars set (wedding shipped earlier).
- **Route-meta 503 fix** — `/blog/<missing-slug>` could hang 30s (lookup promise never settled) → Heroku H12 → 503. The lookup now races a 1.5s timeout and the whole branch is try/caught; worst case is the plain shell, never an error page.
- **SPA catch-all path bug (affects any per-route logic there)** — inside `app.use("*", …)` Express strips the matched mount path, so **`req.path` is always `/`** in `serveStatic`'s catch-all; the real path is only in `req.originalUrl`. This silently disabled the meta injection below on first deploy and made `resolvePrerenderedHtmlPath(req.path)` path-blind. Fixed by deriving the path from `req.originalUrl` (query stripped). **Rule for future work: never use `req.path` inside the `app.use("*")` catch-all.** Blog/voucher routes now always serve the shell (meta-injected on DB hit) — never prerendered error captures. Verified with a local Express 4.21.2 repro.
- **SEO: wedding pillar built** (`/hochzeitsfotografie-wien/`) — upgraded the existing cornerstone (keeps its inbound links) into a true pillar: FAQPage JSON-LD (rich-result eligible) + cost/how-to-choose guide sections with search-focused H2s + "Rund um eure Hochzeit" cluster hub. Package CTAs → `/kontakt` (waitlist-dominance follow-through; 7→3 waitlist links on the page).
- **SEO: waitlist link dominance reduced** — audit found `/warteliste` the most-linked page sitewide. Footer link removed (header nav keeps the sitewide funnel entry), `RelatedTopicsBlock`'s 6 WARTELISTE mappings → pricing/reviews/services, `ContextualLinks` closer + blog-post bottom CTA → `/kontakt`. Hero CTAs untouched (conversion safety).
- **Case-study drafts (audit item)** — three "Fallstudie" articles in `content/articles/` grounded in REAL published Google reviews (no invented client details; `[FOTO: …]` placeholders). `server/seed-case-studies.ts` inserts them as DRAFTS at boot (idempotent per slug, never publishes). ⚠️ Content is New-Age-specific — a new tenant deletes/replaces them (noted in §8.2).
- **SEO: server-side meta injection for data-driven routes** — discovered build-time prerendering **cannot** render `/blog/:slug` and `/gutschein/:slug`: puppeteer has no API/DB during the Heroku build, so those prerender files captured the **"not found" error state** — crawlers were served default-title error pages (the deeper cause of the audit's blog findings). `serveStatic`'s catch-all (`server/vite.ts`) now resolves real meta from the DB (blog_posts `seoTitle`/`metaDescription`/`excerpt`; voucher_products `metaTitle`/`metaDescription`), injects title/description/canonical/OG into the served shell, and **bypasses the bad prerendered files** for those paths (5-min per-path cache; DB errors fall back to the plain shell, never 500). Dedicated `/gutschein/family|newborn|maternity` pages keep their component SEO. **Architecture note:** prerender static-content routes only; data-driven routes get request-time meta injection — do NOT expect blog/voucher slugs in the prerender list to produce content. `PRERENDER=1` is set via `heroku-postbuild` (confirmed).

### July 16, 2026
- **SEO audit fixes (Infinite Authority, July 2026)** — technical fixes for the structural audit: (1) **301s in `seoRedirects.ts`**: `/immobilienfotografie-wien`→`/immobilien-fotografie-wien/`, `/fotoshooting-preise-wien`→`/preise/` (duplicate pages splitting authority; `/preise` kept — ~22 internal links vs 4; client route now `<Navigate>`s too; sitemaps cleaned), `/termin-planen`→`/warteliste`, `/paar-fotoshooting-wien`→`/portrait-fotografie-wien/` (internally-linked routes that never existed in the router). (2) **`/admin*` deindexing**: `X-Robots-Tag: noindex,nofollow` middleware (robots.txt disallow alone doesn't deindex; audit found /admin indexed with the homepage title). (3) **Missing page meta**: `SEOHead` added to `/galleries` + `/gutschein/:slug` (dynamic). (4) **Prerender route list** (`vite.config.ts`): added `/model-release/`, `/calculator`, `/galleries`, `/gutschein/baby`, `/gutschein/business` — those routes were serving crawlers the raw SPA shell (the "duplicate homepage title" set). **Prerendering only runs when `PRERENDER` is set in the Heroku build env — verify it's set, else all the per-page meta stays invisible to crawlers.** (5) **Blog**: `BlogPostPage` switched from legacy `react-helmet` to `react-helmet-async` (the app's provider ignored the legacy tags); end-of-post internal-links block extended (services + Gutscheine + Kundenstimmen) — the audit's "blog posts have 0 outgoing links" was the shell-render symptom. (6) **Footer**: `/kundenstimmen/` added (reviews page had 1 inbound link); pricing link → `/preise/`. All internal links to redirected/dead URLs fixed. **Not done (editorial track)**: pillar pages (commercial B2B, wedding cluster, trust hub), case studies, title-length trims, de-emphasizing `/warteliste` link gravity.
- **Onboarding config is now editable in Settings (Email/SMTP, Storage, SMS, Stripe)** — the setup-wizard configuration can be viewed/edited after onboarding from the Settings hub, reusing the wizard's own endpoints (`/api/setup/technical/current` + `POST .../{email|storage|extras|stripe}` + `/test/{smtp|storage|stripe}`) so there's no second source of truth. New pages: `StorageSettingsPage` (`/admin/settings/storage`), `SmsSettingsPage` (`/admin/settings/sms`), `StripeSettingsPage` (`/admin/settings/payments`); Storage & Stripe have live Test buttons. Secrets are write-only (shown as "saved"; blank keeps existing). **`EmailSettingsPage` was rewritten** — it previously POSTed to `/api/admin/email-settings` + `/api/admin/test-email`, **neither of which exists** on the server, so it never saved; now wired to `/api/setup/technical/email` + `/test/smtp` (SMTP + optional IMAP + Brevo + test send). The email save also now calls `invalidateTransporter()` so new SMTP creds apply immediately (was cached ≤5 min). Settings hub reorganised: new "Connections & Integrations" group; **dead placeholder tiles removed** (database/website/security/users/api-keys/theme/notifications had no routes/pages) along with the non-functional Quick Actions buttons. Business profile remains editable via Studio Customization. **Onboarding impact:** every credential collected in the wizard is now correctable in Settings without re-running onboarding.
- **Knowledge Base starter seed** — the KB is fully functional (CRUD `/api/knowledge-base` + it feeds the customer chat assistant's answer search) but empty on a fresh install, so the assistant had nothing to draw on and the page looked like a placeholder. `server/seed-knowledge-base.ts` seeds 9 professional photography FAQ articles when the table is empty (idempotent; won't overwrite a studio's own or duplicate on redeploy). Content is tenant-neutral industry guidance; studio-specific contact/location is pulled from `studio_configs` so each tenant gets its own details. All editable in the admin UI. **Onboarding note:** like the questionnaire seed, this is currently generic-German starter content a non-German tenant would edit.
- **Studio Customization Save fixed + branding propagation reworked** — the first cut mirrored branding into `manual_page_content`, whose `studioId` FK to `studio_configs` can mismatch on production (the singleton row id ≠ the `STUDIO_ID` constant the CMS readers use), which **500-ed the whole Save**. Reworked so `studio_configs` is the single source of truth and the READERS consume it directly — no CMS mirror, no FK coupling: PUT `/api/studio/branding` writes `studio_configs` only (can't FK-fail); new public GET `/api/studio/public-branding` (logo + name) feeds the site header (`Header.tsx` prefers it → CMS → env → default); `/api/studio-config` (invoice) reads `studio_configs` and prefers its logo/business info. Save is now reliable and the logo/business info reach the header + invoices.
- **Settings surfaced Agent Console + Studio Customization** — per request, `/admin/agent-console` now appears in the Settings hub under a new "AI Assistant & Knowledge" group (with Knowledge Base), and Studio Customization under a new "Studio Profile & Branding" group (the onboarding business data, editable any time). Settings remains a hub of links; several sub-pages it links to (database/website/security/users/api-keys/theme/notifications) are still stubs — a broader Settings build-out is a candidate next task.
- **Studio Customization is now a real feature (was a mockup)** — `/admin/studio-templates` previously persisted nothing (the `/api/studio/*` endpoints it called were never built) and did not drive the site. Built it end-to-end. New `server/routes/studio-branding.ts` (mounted `/api/studio`): `GET/PUT /api/studio/branding`. PUT writes to `studio_configs` (authoritative singleton) **and mirrors logo + business info into `manual_page_content`** — the store the **public Header** (`site-settings`→`site.logo`, `Header.tsx`) and the **invoice template** (`contact.*`, `/api/studio-config`) already read — so changes actually appear on the site + invoices (written to both `de`/`en`). Frontend: loads saved branding on mount; **Save** persists; **Choose File** opens a real picker → uploads to `/api/upload/image` (field `file`, reads back `.url`) → live preview → logo applied immediately. Boot seed creates a `studio_configs` singleton row keyed on the canonical `STUDIO_ID` so the `manual_page_content` FK holds on a fresh instance. **Brand colours: persisted but honestly labelled** — the live theme uses ~2000 hardcoded Tailwind `purple/violet` literals and defines no `:root` tokens, so colours are stored for template/invoice use but do **not** restyle the whole public site yet (full colour theming = a separate repo-wide refactor, deliberately not faked). **Onboarding impact:** a new photographer can upload their logo + set business details in the wizard/settings and see them live on their site + invoices. Template *switching* (visual re-skin) still persists the choice only; a true multi-template renderer remains future work.
- **Agent Console: real audit data (was hardcoded mock)** — `/admin/agent-console` Overview showed a fixed literal (245 calls, 94.7%, a fake tool-usage chart) and the Audit Log tab was never populated, even though every tool call **is** logged to `agent_audit` by ToolBus. Added `GET /api/agent/v2/audit/stats?days=30` (aggregate execution stats) + `GET /api/agent/v2/audit/logs?limit=100` (recent executions) and wired `fetchData` to both. Refresh now shows real numbers; a fresh tenant with no agent activity correctly shows zeros, not fake 245. **Note on the page's purpose:** it's an observability/QA console (success rate, latency, tool mix, per-call audit trail, V1-vs-V2 shadow testing) — an admin diagnostic, reasonable to relocate under Settings.
- **Studio Customization: Preview Live Site + Refresh wired** — both buttons on `/admin/studio-templates` had no `onClick` (dead). Preview → opens the public site in a new tab; Refresh → reloads. **Left deliberately un-faked:** the logo upload, Save Configuration, and template-apply buttons have no working backend — the `/api/studio/current|config|template` endpoints the page references were never built and the public site does not read `studio_configs` for branding, so persisting there would be orphan data that never restyles the site. Making studio branding (logo/colors/template) actually drive the live site is a **feature build**, not a button-fix; flagged for post-hardening. Until then this page is largely a non-functional mockup (an onboarding trap — a photographer can change colors and see no effect).
- **Agent: appointments now read the real calendar** — the AI agent's `appointments_query` tool read the empty `studio_appointments` table and reported "no appointments" while the Calendar showed hundreds. Repointed it to `photography_sessions` (the Calendar's table) with the same filters + client join, so the agent's appointment answers match the Calendar.
- **Inbox email delivery + archive folders + plans button** — (1) Inbox "Sent" rows could be **demo_sent (never delivered)** while the composer showed success; `smtp-helper` default port 587→**465 (SSL)** to match the studio's working automations (587/STARTTLS was silently failing → demo), and `SimpleEmailComposer` now surfaces the demo/undelivered state. (2) My Archive folders stuck on "Loading files…": a `Date.now()` in the React-Query key made every render a new query — keyed on folder only now; and `/api/files` + upload now resolve `folderId` (photo_folders id) → folderName (uploads were defaulting to "Manual Website Images", so folders looked empty), list limit 20→200. (3) "See Plans & Pricing" was a raw `<a href="/admin/digital-files">` full-page reload that flashed the public homepage → repointed the 4 upgrade CTAs to Backblaze pricing (external, new tab). **Note:** files uploaded before this fix stay under "Manual Website Images" (old folderId was dropped); only new uploads land in the chosen folder.
- **Voucher offers: server-signed price (anti-tamper)** — the landing-offer CTA price is now server-authoritative. `server/utils/offer-token.ts` HMAC-signs `{amount,title}`; `GET /api/lp/:slug` attaches `cta_offer_token`; the CTA uses `/cart?vf=personalization&offer=<token>`; `CartPage`→`VoucherFlow`→`EnhancedCheckoutPage` thread the token into the checkout payload; `stripeVoucherService` verifies it and forces the primary item's price+name to the signed values (rejects a present-but-invalid token). Editing the URL or client item price can no longer change what Stripe charges. **Still open:** fixed-product + package voucher prices remain client-supplied (broader voucher-flow trust) — a follow-up.
- **Storage bridged to onboarding config (FIXED)** — the upload S3 clients read `process.env.AWS_*` only and ignored the wizard's DB storage config (`studio_integrations`), so wizard-configured storage didn't work. Now `s3-storage.ts` `getS3Config()` resolves `studio_integrations` (via `config-reader`) → env, cached/refreshed at boot + on save + lazy TTL; `routes.ts` + `routes/files.ts` module clients, bucket refs, guards, and `/api/storage/health` all bridged. Uploads now work from wizard config OR env. (Same class as the SMS bridge.)
- **Landing Pages: dynamic-priced voucher CTA** — the CTA opens the voucher **personalization flow** at the landing page's own offer price. New `cta_voucher_amount` + `cta_voucher_title` columns; Settings panel "Voucher offer — CTA price" (€ + title). CTA builds `/cart?vf=personalization&amount=<€>&title=<offer>`; `CartPage` reads those on mount, seeds a voucher cart item, opens the existing personalize→checkout→Stripe wizard, which charges the amount verbatim and prints it on the downloadable PDF. Overrides the fixed-price product binding; UTM propagated. **Known limitation (pre-existing, whole voucher flow):** prices are client-supplied (package prices are client literals; server charges `item.price` with no DB re-lookup). Signed amounts / server-side validation is a separate hardening item.
- **Cloud Storage: hide paid tiers on self-hosted + Backblaze labels; Reports pie fix** — `/api/files/usage` returns `billingEnabled` (true only when `STRIPE_PRICE_*` set); the page hides all paid Starter/Pro/Enterprise cards + upgrade CTAs when disabled (self-hosted studios see Free + "Go to My Archive"). Onboarding Storage step now names Backblaze B2 and labels the Access Key/Secret fields with the Backblaze terms (keyID / applicationKey). Reports "Revenue by Service" pie: long service names overlapped as inline labels → now top-8 (+ "Other") pie with a side legend.
- **Cloud Storage buttons + rename** — renamed "Digital Files" → "Cloud Storage" (nav + headings, EN/DE; route unchanged). Fixed the upgrade buttons: `/api/storage/create-checkout-session` queried a `users` table the admin isn't in → "User not found"; now resolves the admin via `getCurrentUser` (admin_users). When paid tiers aren't configured (`STRIPE_PRICE_*` unset), it returns an honest "Paid storage plans are not enabled" message instead of a cryptic error. Free tier / demo / "Go to My Archive" already worked. Added a Backblaze-storage onboarding recommendation (see checklist).
- **Dialog legibility** — shared `DialogContent` used `bg-background` (rendered translucent); set explicit opaque `bg-white`/`dark:bg-neutral-900` so all modals are readable.
- **Landing-page editor/renderer content mismatch (the flagged pre-existing bug) — FIXED** — the modular editor saved `content_json` in a different field vocabulary than the public renderer reads (editor `title/intro/bullets/primaryCtaText` vs public `headline/description/inclusions/ctaText`) and dropped `offerSection.price`, so editing/regenerating a section could blank the public page or strip the price. `serializeEditorContent` now writes BOTH vocabularies and preserves `price`; `normalizeOffer` keeps `price`; the Offer editor has a Price field. Round-trip is lossless.

### July 15, 2026
- **Landing Pages: hero media + working voucher CTA** — added `hero_image_url`/`hero_video_url`/`cta_voucher_slug` page columns (boot migration + `updateLandingPage` allow-list; partial PUTs from the Settings panel don't clobber the editor's content save). Settings panel now has a **Voucher product** dropdown (from `/api/vouchers/products`, shows name + price) → binds the CTA to `/voucher/{slug}` (that product's personalize → Stripe flow at its fixed price, e.g. €225) instead of the bare `/vouchers` list, UTM preserved; plus a **hero image upload** (reuses `POST /api/upload/image`) + optional **hero video URL**, rendered as a background with a dark overlay. **Architecture note for the rewrite:** the modular editor re-normalizes `content_json` on save via `normalizeLandingPageContent`/`serializeEditorContent`, which uses a DIFFERENT shape than the public renderer (editor `offerSection.{title,intro,bullets}` vs public `{headline,description,price,inclusions}`) and DROPS `offerSection.price` — so editing an AI-generated page via the section editors can strip the offer price and mismatch fields. New landing-page settings were deliberately stored as page COLUMNS to avoid this. This editor/renderer divergence is unresolved tech debt worth fixing.
- **Landing Pages pre-campaign smoke test + fixes** — code-path smoke test before a partner campaign found and fixed: **(B1)** AI generate/regenerate/promo-pack used `OPENAI_MODEL` (the Responses-only model that 404s chat/completions) → switched to `OPENAI_LANDING_MODEL || OPENAI_PRICE_MODEL || 'gpt-4o-mini'`; **(B2)** `landing_page_events` had no repo migration (analytics inserts 500) → ensured at boot; **(B3)** publishing/preview columns (`preview_token`, `preview_token_expires_at`, `canonical_url`, `noindex`) allow-listed but never created (preview links 500/404) → ensured at boot; **(R1)** SEO `metaDescription` vs `description` mismatch (would 422 on publish / render empty meta) → both accepted; **(R2)** CTAs now propagate `utm_campaign`/source onto `/booking`·`/vouchers`·`/contact`; **(R5)** the AI generation wizard was UI-unreachable ("Create" went to a basics-only scaffold) → primary create action now opens the wizard. **Still open (not blockers):** landing pages have no on-page lead form; A/B-variant + automation tables still lack repo migrations (secondary features).
- **Email campaign bulk send queue (feature completed)** — replaced the `// TODO: bulk send queue` no-op in `POST /api/email/campaigns/send`. Audience = opted-in `email_subscribers` (status='active') honoring tag include/exclude; background batched+paced sender personalizes, tags links for attribution, appends an unsubscribe footer, sends via `EnhancedEmailService`, logs per-recipient `email_events`, and writes authoritative counters from the event log. Idempotent/resumable (skips already-attempted recipients). New public `GET /api/email/unsubscribe` (stateless HMAC token) flips subscriber status + bumps counters — required for bulk-mail compliance; unsubscribed addresses are excluded from future sends. **Known follow-up:** open/click tracking still needs a tracking pixel + click-redirect (the `POST /api/email/track/event` sink exists but nothing calls it automatically), and the subscribers list has no admin CRUD UI yet (only newsletter signup populates it).
- **Revenue by Service from invoice line items** — `GET /api/reports/revenue-by-service` sums `crm_invoice_items` (quantity×unit_price) on PAID invoices grouped by line-item description; Reports pie now real (invoices have no service field).
- **Email→order revenue attribution (order-tracking mechanism)** — new end-to-end chain so campaigns report real revenue: boot migration adds `voucher_sales.campaign_id`; client captures `utm_campaign`/`nac` into a 30-day window (`client/src/lib/attribution.ts`, called in `main.tsx`) and threads it into the voucher checkout payload; the id flows into Stripe session `metadata.campaign_id` (`stripeVoucherService`) and is persisted on the `voucher_sales` row in both the webhook and the manual Stripe-sync insert; campaign links are auto-tagged with `utm_campaign` on send; `GET /api/reports/email-campaign-revenue` sums paid revenue per campaign and the Reports email table shows it. Generic/onboarding-ready; revenue is 0 until campaigns send tagged links and buyers purchase. **Dependency:** bulk campaign send is still a TODO stub — link-tagging is applied on the working test-send path, so real attribution starts once bulk send is implemented (or links are shared manually).
- **Reports dashboard now shows real DB metrics** — every section was reading wrong/placeholder fields. Fixed: vouchers (Drizzle camelCase `createdAt`/`finalAmount`/`isRedeemed`/`paymentStatus` — was `created_at`/`amount` → NaN dates/€0; revenue counts paid sales), lead conversion (lowercase `'converted'`, group by `form_type`), clients-by-source (`leadSource`), top clients (name from `firstName`+`lastName`), client retention (real new-vs-returning; was `Math.random()`), email campaigns (fetch `/api/admin/email/campaigns` → `sentCount`/`openedCount`/`clickedCount`; revenue not tracked), gallery performance (new `GET /api/reports/gallery-analytics` joins `galleries`+`gallery_analytics` for real views/email-captures; was hardcoded). Overview swapped fake "Satisfaction 4.8"/"Avg Duration 14d" cards for real Total Revenue / Total Clients. **Known data limits:** email campaigns have no revenue column; invoices have no service-type field (Revenue-by-Service groups as "Other"); "inquiries" is proxied by gallery email captures.
- **Messaging is now onboarding-ready** — the setup wizard's Extras step saves SMS creds to `studio_integrations`, but `SMSService` only read the legacy `sms_config` table / env, so SMS silently didn't work after onboarding. Bridged it: `SMSService.initialize()` now reads the onboarding provider via `config-reader` (`sms_provider`/`sms_account_sid`/`sms_auth_token`/`sms_from_number`) — same pattern SMTP already uses — for both Twilio and Vonage. `getSMSConfig` reports that state too. Full chain now works: **ExtrasStep UI → /extras → studio_integrations → config-reader → SMSService → send.** Email is likewise onboarding-driven (EmailStep → SMTP/Brevo → smtp-helper, with the SMTP fallback). Honesty: the Communications page no longer claims email "sent successfully" in demo mode. **Known limitation:** WhatsApp still needs an approved Business sender and isn't wired for the Twilio path (SMS-first per current priority).

### July 14, 2026
- **Communications Center — email** — "Send Email" failed with "API Key is not enabled" (a Brevo error) even though SMTP works. `EnhancedEmailService` routed through Brevo whenever `BREVO_API_KEY` merely existed (even if invalid) and returned Brevo's error with no fallback. Now: prefer Brevo only if it truly initialises, always build the SMTP transporter too, and fall back to SMTP if a Brevo send fails.
- **Communications Center — WhatsApp/SMS** — the `sendSMS` controller dropped `messageType`, so "WhatsApp Message" was silently sent as SMS. Now forwarded. Also added a **Twilio env branch** to `SMSService.initialize()` (`TWILIO_ACCOUNT_SID`/`AUTH_TOKEN`/`FROM_NUMBER`) so SMS can be enabled via config vars, and removed a `console.log` that printed the Vonage API key. **Still needed for delivery:** a configured provider (Twilio chosen). WhatsApp additionally needs an approved Business sender; the current WhatsApp code targets the Vonage sandbox and is not production-wired.
- **Automations email editor** — replaced the plain-text "Write" box (which did a lossy HTML→text→HTML round-trip: ragged pagination + silently destroyed the CTA button/`{{questionnaireLink}}`) with the shared **`AdvancedRichTextEditor` WYSIWYG** (headings, bold/italic, colour, alignment, lists, links, images, tables, undo, HTML source). Templates are now edited exactly as they render, so spacing is controlled directly; a "Preview (sample data)" toggle substitutes the `{{placeholders}}`. Body stays HTML end-to-end.
- **Questionnaire link fixed** — `/q/pre-shoot` (the default Pre-Shoot automation link) showed "Questionnaire not found or expired" because no active `questionnaires` row with that slug existed and the request fell through to the SPA token lookup. Server now seeds a default active **pre-shoot** questionnaire at startup so the link resolves end-to-end.
- **Setup wizard endpoints gated** — every mutating `/api/setup/technical/*` endpoint (credential saves `/domain` `/email` `/stripe` `/storage` `/extras`, admin creation `/security`, and the SSRF-prone `/test/{smtp,stripe}` probes) was unauthenticated. Now gated with one rule: open on a fresh install (no admin yet, so first-run onboarding works), require auth once an admin account exists. Read-only status endpoints and `POST /complete` (fires right after admin creation, before any session) are exempt.
- **Email test-send honesty** — "Send Test" previously always reported success even when SMTP was unconfigured and the mail silently fell into demo mode. Demo-mode returns now carry `demo:true` + an honest error; the send endpoint and UI report true delivery.
- **Accounting Export** — Validate/Preview + Generate/Download fixed (profile enum had drifted out of sync with registered adapters; also fixed an N+1 line-item fetch that exhausted the DB pool).
- **Lead Sources** — new performance dashboard (bar + pie + table), date-range filter (this year / last year / last 12m), leads-vs-revenue combined view, €/lead column.
- **Top Clients** — removed redundant "By Total Revenue" sort option.
- **Price List Wizard** — per-service summary table (our price vs market low/median/high), "what's included" surfacing, own-price-guide comparison, and fixed the OpenAI 404 (a Responses-only model in `OPENAI_MODEL`) that had produced 0 extracted prices.
- **Heroku build** — `heroku-postbuild` prerender step made best-effort (falls back to a plain build) so a puppeteer navigation timeout can't fail the whole deploy.

### July 13, 2026
- **Galleries** — Phase 1 (pro cover, larger templates, reliable expiry), Phase 2a (visible watermark + protected delivery + working ZIP download), Phase 2b (invisible forensic QIM watermark, private-ready delivery).
- **Price Wizard** — wired **AxixOS Intelligence** as the discovery + crawl provider (replacing Tavily); real re-read, manual path, honest per-competitor status.
- **Top Clients** — fixed inflated lifetime value caused by an invoices×sessions SQL fan-out (separate pre-aggregated subqueries), plus a follow-up WHERE-clause fix.
- **Blog scheduler** — stopped future-dated posts from publishing today; enabled cleanup reschedule.
- **Intelligent Merge Wizard** — confidence-scored duplicate-client detection, safe audited merge, undo.

### July 12, 2026
- **Pre-migration hardening** — response compression, rate limiting, webhook signature verification, thumbnail generation.
- **Checkout crash** — moved all hooks above conditional returns.
- **Vouchers** — photo-upload fix (JSON/DOCTYPE + downscale), QR → waitlist page, single-page PDF redesign.

> **Environment / secrets note:** during July 2026 work several live secrets were
> pasted into chat (Render API key, a GitHub PAT, a Supabase password, the AxixOS
> internal key). These were **flagged for rotation and must not be committed to
> git**. Whether they were actually rotated is **unverified** — confirm before sign-off.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Map](#2-architecture-map)
3. [Tech Stack](#3-tech-stack)
4. [Repository Structure](#4-repository-structure)
5. [Database Design](#5-database-design)
6. [External Integrations](#6-external-integrations)
7. [Environment Configuration](#7-environment-configuration)
8. [Hardening Summary & Onboarding Runbook](#8-hardening-summary--onboarding-runbook)
9. [Known Issues & Technical Debt](#9-known-issues--technical-debt)
10. [Security Findings (CRITICAL)](#10-security-findings-critical)
11. [Demo Duplication Viability](#11-demo-duplication-viability)
12. [Prioritised Action Items](#12-prioritised-action-items)
13. [Appendices](#appendices)

---

## 1. Project Overview

SmartTog is an **all-in-one photography studio management platform** built as a single-tenant SaaS application. Currently deployed for a single customer (New Age Fotografie, Vienna). The business goal is to duplicate the platform into a demo environment for inviting other photographers to purchase, eventually evolving into a multi-tenant BYOC (Bring Your Own Cloud) model controlled by a central "SmartTog Hub".

### Feature Set

| Module | Description | Status |
|--------|-------------|--------|
| CRM | Client & lead management, interaction history, lead-to-client conversion | ✅ Complete |
| Invoicing | Creation, Stripe payments, PDF generation, recurring invoices | ✅ Complete |
| Galleries | Upload, organise, client sharing, download, watermarking | ✅ Complete |
| Email Marketing | Campaigns, templates, send, basic analytics | ✅ Complete |
| Blog / CMS | CRUD, AI-powered generation, SEO optimisation, auto-publish | ✅ Complete |
| Scheduling | Configurable booking types, Google Calendar sync, availability | ✅ Complete |
| Vouchers | Create, PDF, sell online (Stripe), redeem | ✅ Complete |
| Automations | Workflow builder, triggers, email/SMS actions | ✅ Complete |
| AI Agent | V2 ToolBus agent, safe mode, shadow mode (GPT-4o / Claude) | ✅ Complete |
| Questionnaires | Create, share, collect responses | ✅ Complete |
| Reports & Dashboard | Revenue, bookings, lead analytics | ✅ Complete |
| Client Portal | Client self-service area | ✅ Complete |
| Public Website | Multi-page, SEO, responsive, manual page CMS | ✅ Complete |
| Accounting Export | Austrian-compliant financial export | ✅ Complete |
| Price List Wizard | Competitor research + AI-assisted pricing | ✅ Complete |
| Onboarding Wizard | 7-step technical + 5-phase creative setup | ✅ Complete |
| Digital File Delivery | Upload + client download via secure links | ✅ Complete |
| Multi-language | Mixed German/English — no i18n framework | ⚠️ Partial |
| Testing | No tests exist | ❌ None |

---

## 2. Architecture Map

### Current State (Single Instance)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HEROKU APP                                  │
│  web dyno ─── Node.js Express (API) + Vite (React SPA)            │
│                                                                     │
│  Procfile: web: node dist/index.js                                 │
│  Build:    heroku-postbuild → cross-env HEROKU=true npm run build  │
│            → npx vite build --mode production                      │
└────────────────────┬────────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────────────────────────────┐
        │            │    EXTERNAL SERVICES                │
        │            ▼                                     │
        │  ┌──────────────┐  ┌──────────────┐             │
        │  │ Neon Postgres │  │ Backblaze B2 │             │
        │  │ (single DB)   │  │ (S3-compat)  │             │
        │  └──────────────┘  └──────────────┘             │
        │                                                  │
        │  ┌─────────┐ ┌────────┐ ┌──────────┐           │
        │  │ Stripe   │ │ OpenAI │ │Anthropic │           │
        │  │ (LIVE)   │ │GPT-4o  │ │ Claude   │           │
        │  └─────────┘ └────────┘ └──────────┘           │
        │                                                  │
        │  ┌──────────┐ ┌────────────┐ ┌───────┐         │
        │  │ Easyname │ │ Google Cal │ │Vonage │         │
        │  │ SMTP     │ │ OAuth+Sync │ │ SMS   │         │
        │  └──────────┘ └────────────┘ └───────┘         │
        │                                                  │
        │  ┌──────────┐ ┌────────┐ ┌───────────┐         │
        │  │ Tavily   │ │ Serper │ │ Geoapify  │         │
        │  │ Research │ │ Search │ │ Geocoding │         │
        │  └──────────┘ └────────┘ └───────────┘         │
        └──────────────────────────────────────────────────┘
```

### Target State (Prod + Demo)

```
┌──────────────────────┐          ┌──────────────────────┐
│   PROD (New Age)     │          │   DEMO (SmartTog)    │
│                      │          │                      │
│  Heroku App A        │          │  Heroku App B        │
│  Neon DB A           │          │  Neon DB B (seeded)  │
│  B2 Bucket A         │          │  B2 Bucket B         │
│  Stripe LIVE keys    │          │  Stripe TEST keys    │
│  Real SMTP           │          │  Mailtrap / disabled │
│  Google Calendar     │          │  Disabled / mock     │
│  DEMO_MODE=false     │          │  DEMO_MODE=true      │
└──────────────────────┘          └──────────────────────┘
         │                                  │
         └──── Same GitHub repo (main) ─────┘
              env-driven behaviour only
```

---

## 3. Tech Stack

### Server

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Runtime | Node.js | >=20 (Heroku resolves to LTS 24.14.0) | Specified in `engines.node` |
| Framework | Express.js | 4.x | |
| ORM | Drizzle ORM | Latest | Type-safe, Postgres adapter |
| Database | PostgreSQL (Neon) | 16 | Serverless, pooled connection |
| Auth | express-session + bcrypt | | Session-based, no JWT for web |
| Email | Nodemailer | Latest | 4 different service files (debt) |
| Payments | Stripe SDK | Latest | Live keys in prod |
| AI | OpenAI SDK + Anthropic SDK | Latest | GPT-4o-mini default |
| Storage | AWS SDK v3 (S3-compatible) | | Backblaze B2 endpoint |
| Build | TypeScript → esbuild | | `server/` compiled to `dist/` |

### Client

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | React | 18.x | |
| Build | Vite | 5.4.x | CJS deprecation warning (cosmetic) |
| Styling | Tailwind CSS | 3.x | |
| Components | shadcn/ui | Latest | ~40 primitive components |
| Data Fetching | @tanstack/react-query | Latest | Consistent throughout |
| Routing | react-router-dom | 6.x | |
| State | React hooks (no Redux) | | Context API for global state |
| Icons | Lucide React | Latest | |
| Charts | Recharts | Latest | Dashboard analytics |

### Infrastructure

| Service | Provider | Notes |
|---------|----------|-------|
| Hosting | Heroku | Single web dyno |
| Database | Neon | Free/Pro tier, `eu-central-1` |
| Object Storage | Backblaze B2 | S3-compatible API, bucket: `TogNinja` |
| DNS/Domain | External | newagefotografie.com |
| CI/CD | None | Manual `git push` to Heroku |
| Monitoring | None | No Sentry, no uptime monitoring |
| Logging | `console.log` | No structured logging |

---

## 4. Repository Structure

### Top-Level Layout

```
workingnewage/
├── client/                     # React SPA (Vite)
│   ├── src/
│   │   ├── App.tsx             # Router — all routes defined here
│   │   ├── main.tsx            # Entry point
│   │   ├── index.css           # Tailwind base styles
│   │   ├── components/
│   │   │   ├── admin/          # Admin-specific components (~30 files)
│   │   │   ├── auth/           # Auth guards (NeonProtectedRoute)
│   │   │   ├── layout/         # Navbar, Footer, Sidebar, AdminLayout
│   │   │   ├── public/         # Public-facing components
│   │   │   └── ui/             # shadcn/ui primitives (~40 files)
│   │   ├── contexts/           # React context providers
│   │   ├── hooks/
│   │   │   ├── useDateFormatSync.ts     # Date preference sync
│   │   │   ├── useTechnicalSetupGuard.ts # Setup redirect guard
│   │   │   └── use-toast.ts             # Toast notifications
│   │   ├── lib/
│   │   │   ├── dateFormat.ts   # Centralised date formatting
│   │   │   ├── leads.ts        # Lead API functions
│   │   │   ├── queryClient.ts  # React Query configuration
│   │   │   └── utils.ts        # cn() class merge utility
│   │   └── pages/
│   │       ├── admin/          # Admin pages (~25 files)
│   │       ├── public/         # Public-facing pages (~15 files)
│   │       ├── setup/          # Onboarding wizard (2-stage)
│   │       └── portal/         # Client portal pages
│   └── index.html              # SPA entry (needs dynamic meta)
│
├── server/
│   ├── index.ts                # Express app + Vite middleware + startup
│   ├── routes.ts               # ⚠️ ~15,000+ lines — ALL API routes
│   ├── db.ts                   # Drizzle DB connection (Neon)
│   ├── auth.ts                 # Session + bcrypt auth
│   ├── config-reader.ts        # DB-first config with env fallback
│   ├── technical-setup-routes.ts  # Stage 1 onboarding API
│   ├── setup-routes.ts            # Stage 2 onboarding API
│   ├── hub-integration.ts      # SmartTog Hub communication
│   ├── autoblog.ts             # AI blog generation
│   ├── storage.ts              # Database storage layer
│   ├── jobs/
│   │   └── index.ts            # Background job scheduler (cron)
│   ├── routes/
│   │   ├── auth.ts             # Auth endpoints
│   │   ├── googleAuth.ts       # Google OAuth flow
│   │   ├── agent-v2.ts         # AI Agent V2 endpoints
│   │   ├── agent-shadow.ts     # Agent shadow mode
│   │   ├── manual-pages.ts     # CMS page management
│   │   ├── onboarding.ts       # Onboarding session management
│   │   ├── emailTest.ts        # Email test endpoint
│   │   └── files.ts            # File upload/download
│   ├── services/
│   │   ├── calendarService.ts      # Google Calendar 2-way sync
│   │   ├── email-basic.ts          # Simple email sender
│   │   ├── enhancedEmailService.ts # Rich email with templates
│   │   ├── smsService.ts           # Vonage SMS
│   │   ├── syncScheduler.ts        # Calendar sync scheduler
│   │   └── WorkflowExecutionService.ts  # Automation engine
│   ├── utils/
│   │   ├── encryption.ts       # AES-256-GCM encrypt/decrypt
│   │   ├── emailService.ts     # Legacy email utility
│   │   └── smtp-helper.ts      # SMTP transporter factory
│   ├── migrations/             # SQL migration files
│   └── seed/                   # (empty — needs demo seed)
│
├── shared/
│   └── schema.ts               # Drizzle schema (~2200 lines, all tables)
│
├── hub/                        # SmartTog Hub (orchestration layer, WIP)
│   └── src/
│       └── db/schema.ts        # Hub-specific schema
│
├── agent/                      # AI Agent modules
│   └── core/
│       ├── tools.ts            # Agent tool definitions
│       ├── session-manager.ts  # Session management
│       └── planner.ts          # Task planning
│
├── dist/                       # Compiled server output
├── dist-server/                # Alternative compiled output
│
├── .env                        # ⚠️ COMMITTED — contains LIVE secrets
├── package.json                # Dependencies + scripts
├── Procfile                    # Heroku: web: node dist/index.js
├── vite.config.ts              # Vite build configuration
├── tailwind.config.ts          # Tailwind configuration
├── drizzle.config.ts           # Drizzle Kit configuration
├── tsconfig.json               # TypeScript configuration
│
├── add-onboarding-columns.sql  # Migration: onboarding schema
├── db-schema.js                # Legacy schema setup script
├── setup-tenant.js             # Tenant provisioning script
├── setup-database.js           # Database initialisation
└── *.ts / *.js                 # ~100+ ad-hoc check/migration scripts
```

### Key Files for Any Incoming Developer

| File | Why It Matters |
|------|---------------|
| `server/routes.ts` | **Start here.** Contains ~95% of all API logic. ~15,000 lines. |
| `shared/schema.ts` | All database table definitions (Drizzle). ~2,200 lines. |
| `client/src/App.tsx` | All frontend routes. Shows the full page structure. |
| `server/index.ts` | Server startup, middleware, migration runner. |
| `server/config-reader.ts` | New config system — DB-first with env fallback. |
| `server/technical-setup-routes.ts` | New onboarding wizard (Stage 1). |
| `client/src/hooks/useTechnicalSetupGuard.ts` | Frontend guard that redirects to setup if not onboarded. |
| `.env` | All environment variables (⚠️ contains live secrets — see Security section). |

---

## 5. Database Design

### Technology
- **PostgreSQL 16** on Neon (serverless, pooled)
- **Drizzle ORM** for schema definition and queries
- **No formal migration system** — ad-hoc SQL files + `drizzle-kit push`

### Schema Overview (~35 tables)

| Category | Tables | Key Schema File Location |
|----------|--------|------------------------|
| **Auth** | `users`, `admin_users` | `shared/schema.ts` L1-30 |
| **Studio Config** | `studios`, `studio_configs`, `studio_integrations` | `shared/schema.ts` L32-160 |
| **CRM** | `crm_clients`, `crm_leads`, `client_interactions`, `lead_sources` | `shared/schema.ts` L164-220 |
| **Financial** | `invoices`, `invoice_items`, `payments`, `expenses` | `shared/schema.ts` L222-400 |
| **Content** | `blog_posts`, `blog_categories` | `shared/schema.ts` L402-480 |
| **Media** | `galleries`, `gallery_images`, `digital_files` | `shared/schema.ts` L482-600 |
| **Communication** | `email_campaigns`, `email_templates`, `email_sends`, `sms_messages` | `shared/schema.ts` L602-750 |
| **Scheduling** | `schedulers`, `bookings`, `calendar_events` | `shared/schema.ts` L752-900 |
| **Automation** | `automations`, `workflow_steps`, `workflow_executions` | `shared/schema.ts` L902-1050 |
| **Commerce** | `vouchers`, `voucher_products`, `services`, `packages` | `shared/schema.ts` L1050-1200 |
| **Forms** | `questionnaires`, `questionnaire_responses`, `questionnaire_links` | `shared/schema.ts` L1200-1350 |
| **System** | `notifications`, `admin_notifications_state`, `email_settings`, `homepage_images` | various |

### Tenancy Model

**Single-tenant.** No `tenant_id` or `studio_id` foreign key on data tables. Each deployment has its own isolated DB. The `studio_configs` and `studio_integrations` tables are singletons (1 row each).

### Key Columns Added by Onboarding Work

```sql
-- studio_configs (added by recent onboarding commit)
technical_setup_complete  BOOLEAN DEFAULT FALSE
creative_setup_complete   BOOLEAN DEFAULT FALSE
app_url                   TEXT
frontend_url              TEXT
public_site_base_url      TEXT
ga4_measurement_id        TEXT
meta_pixel_id             TEXT
date_format               TEXT DEFAULT 'auto'
```

### Migration Strategy (Current)

- **No version-controlled migrations.** Schema changes applied via:
  1. `drizzle-kit push` (compares schema.ts to live DB, applies ALTER)
  2. Ad-hoc SQL files run manually (e.g., `add-onboarding-columns.sql`)
  3. Startup migrations in `server/index.ts` (ALTER TABLE IF NOT EXISTS)
- **No rollback capability.** No migration history table.
- **Recommendation:** Adopt `drizzle-kit generate` + `drizzle-kit migrate` for proper versioned migrations.

---

## 6. External Integrations

| Integration | Provider | Purpose | Key Env Vars | Demo Treatment |
|-------------|----------|---------|--------------|----------------|
| **Database** | Neon PostgreSQL | Primary data store | `DATABASE_URL` | Separate Neon project |
| **Payments** | Stripe | Invoices, voucher sales, subscriptions | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `VITE_STRIPE_PUBLIC_KEY`, `STRIPE_WEBHOOK_SECRET` | Use test-mode keys |
| **Email (SMTP)** | Easyname | Transactional + campaign email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Mailtrap or disable |
| **Object Storage** | Backblaze B2 | Gallery images, files, voucher PDFs | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_S3_ENDPOINT`, `AWS_REGION` | Separate bucket |
| **AI (LLM)** | OpenAI | Blog gen, agent, pricing wizard | `OPENAI_API_KEY`, `OPENAI_MODEL` | Same key (rate-limit) or separate |
| **AI (LLM)** | Anthropic | Agent alternate model | `ANTHROPIC_API_KEY` | Same or disable |
| **Calendar** | Google Calendar | 2-way booking sync | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALENDAR_ID` | Disable in demo |
| **SMS** | Vonage | SMS notifications | `VONAGE_API_SECRET` | Disable in demo |
| **Search** | Tavily | Competitor price research | `TAVILY_API_KEY` | Same key OK |
| **Search** | Serper | SERP analysis | `SERPER_API_KEY` | Same key OK |
| **Geocoding** | Geoapify | Location services | `GEOAPIFY_API_KEY` | Same key OK |

### Files Where External Calls Are Made

| File | External Call | Must Gate in Demo |
|------|--------------|-------------------|
| `server/utils/emailService.ts` | SMTP send | ✅ Yes |
| `server/services/email-basic.ts` | SMTP send | ✅ Yes |
| `server/services/enhancedEmailService.ts` | SMTP send | ✅ Yes |
| `server/services/WorkflowExecutionService.ts` | SMTP + SMS | ✅ Yes |
| `server/services/smsService.ts` | Vonage SMS | ✅ Yes |
| `server/routes.ts` (~L6200) | Stripe checkout | ✅ Yes (use test keys) |
| `server/routes.ts` (~L6400) | Stripe invoice | ✅ Yes (use test keys) |
| `server/services/calendarService.ts` | Google Calendar API | ✅ Yes |
| `server/services/syncScheduler.ts` | Calendar sync cron | ✅ Yes |
| `server/autoblog.ts` | OpenAI API | ⚠️ Rate-limit |
| `server/routes/agent-v2.ts` | OpenAI / Anthropic | ⚠️ Rate-limit |

---

## 7. Environment Configuration

### How Config Works (3 layers)

```
Priority:  DB (studio_configs/studio_integrations)
              ↓ fallback
           Environment vars (.env / Heroku config)
              ↓ fallback
           Hardcoded defaults in code
```

The new `server/config-reader.ts` implements this layered approach, but **adoption is incomplete** — many parts of the codebase still read `process.env.*` directly.

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `NODE_ENV` | ✅ | `production` / `development` |
| `PORT` | ⚠️ | Default 3001, Heroku sets automatically |
| `SESSION_SECRET` | ✅ | Express session encryption key |
| `JWT_SECRET` | ✅ | JWT signing key (API tokens) |
| `STRIPE_SECRET_KEY` | ✅ | Stripe API (live or test) |
| `STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe public key |
| `VITE_STRIPE_PUBLIC_KEY` | ✅ | Same as above (Vite build-time) |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ | Webhook signature verification |
| `SMTP_HOST` | ⚠️ | Mail server hostname |
| `SMTP_PORT` | ⚠️ | Mail server port |
| `SMTP_USER` | ⚠️ | Mail username |
| `SMTP_PASS` | ⚠️ | Mail password |
| `EMAIL_FROM` | ⚠️ | Sender address + name |
| `OPENAI_API_KEY` | ⚠️ | OpenAI API key |
| `AWS_ACCESS_KEY_ID` | ⚠️ | B2 storage key |
| `AWS_SECRET_ACCESS_KEY` | ⚠️ | B2 storage secret |
| `AWS_S3_BUCKET` | ⚠️ | B2 bucket name |
| `AWS_S3_ENDPOINT` | ⚠️ | B2 S3-compatible endpoint |
| `AWS_REGION` | ⚠️ | B2 region |
| `DEMO_MODE` | Optional | `true` enables demo safety gates |
| `ALLOW_DEMO_LOGIN` | Optional | `true` bypasses auth |
| `GOOGLE_*` | Optional | Google Calendar integration |
| `VONAGE_*` | Optional | SMS integration |

### Flags Needed for Demo (Not Yet Implemented)

```bash
DEMO_MODE=true              # Gate: email/SMS/calendar sends
SEED_MODE=demo              # Auto-seed demo data on first boot
TOGNINJA_BRAND=demo         # Brand identity (demo vs newage vs blank)
```

---

## 8. Hardening Summary & Onboarding Runbook

### 8.1 What the July 2026 hardening changed (summary)

The full detail lives in the **Hardening Log** at the top of this document.
The one-paragraph version: every module in §1's feature table was smoke-tested
against production and fixed where broken. The recurring themes were
(a) **honesty** — email/SMS/storage report real failure instead of faking
success; mock dashboards (Agent Console, Reports) now read real data;
(b) **config bridging** — services read the wizard's DB config via
`config-reader` (DB → env fallback) instead of env-only, so onboarding
actually configures the system; (c) **security** — setup endpoints auth-gated
once an admin exists, HMAC-signed voucher prices, `/admin` deindexed;
(d) **editability** — everything collected during onboarding is now editable
in Settings; and (e) **SEO** — duplicate pages 301-consolidated, per-page
meta, request-time meta injection for data-driven routes, waitlist
link-equity rebalanced, wedding pillar built.

### 8.2 Onboarding a new studio — the definitive runbook

This is the correct, current path to stand up a **new tenant** of this
platform. It assumes a fresh Postgres database and an empty object-storage
bucket.

**Step 0 — Provision infrastructure**
- Node host (Heroku or the portable Docker image — see §11), Postgres
  (Neon), an S3-compatible bucket (**Backblaze B2 recommended; storage is
  REQUIRED** — galleries, voucher images, landing-page media and file
  delivery all upload to it), Stripe account, SMTP mailbox.
- Minimum env: `DATABASE_URL`, `SESSION_SECRET`, `JWT_SECRET`. Site identity
  env (`BUSINESS_NAME`, `PUBLIC_SITE_URL`, `CONTACT_EMAIL`, `BUSINESS_PHONE`,
  `LOGO_URL`, `SITE_LOCALE`, …) brands the public shell via
  `server/lib/siteIdentity.ts` (`%SITE_*%` placeholders + `window.__SITE_CONFIG__`).
  Everything else can be configured in the wizard instead of env.
- Build: `heroku-postbuild` runs `PRERENDER=1` (static prerender of public
  marketing routes; falls back to a plain build if prerender fails).

**Step 1 — First boot (automatic)**
Idempotent boot migrations + seeds run on every start
(`server/index.ts`): `ADD COLUMN IF NOT EXISTS` migrations; a
`studio_configs` singleton row (keyed on `STUDIO_ID`, default
`550e8400-…440000`); a German **pre-shoot questionnaire** at `/q/pre-shoot`
(re-activates each boot — edit content, don't just deactivate); **9 German
Knowledge-Base starter articles** (only when the table is empty) that feed
the customer chat assistant; and **3 case-study blog DRAFTS**.
⚠️ **Tenant note:** the questionnaire, KB articles and especially the
case-study drafts are German and partly New-Age-specific (the case studies
quote New Age's real Google reviews). They never auto-publish, but a new
tenant must edit or delete them before use.

**Step 2 — Technical Setup Wizard** (`/setup` — open until an admin exists,
auth-gated after). Steps: Welcome → Domain → **Email** (SMTP host/port/user/
pass — **port 465 + SSL recommended**; optional IMAP for the Inbox; optional
Brevo key for bulk campaigns; live test-send) → **Stripe** (publishable +
secret + webhook secret; live key test) → **Storage** (Backblaze keyID/
applicationKey/bucket/endpoint/region; live connection test) → **Extras**
(SMS Twilio/Vonage — SMS-first, WhatsApp needs an approved Business sender;
OpenAI/Anthropic keys; Google Calendar; GA4/Meta pixel) → **Security**
(creates the admin user; from this point setup mutations require auth).
Secrets are AES-256-GCM encrypted at rest (`studio_integrations`) and read
back through `config-reader` (DB first, env fallback). Saves invalidate the
config cache — and the SMTP transporter — immediately.

**Step 3 — Creative setup + branding**
- **Studio Customization** (`/admin/studio-templates`, also in Settings):
  upload the logo (→ public header + invoices, immediately), business
  name/address/phone/email (→ invoices + contact surfaces). Brand colours
  are persisted but do **not** re-theme the site (hardcoded palette); template
  selection persists the choice only (no re-skin engine yet).
- Content CMS (manual pages), price list (wizard or CSV import), voucher
  products, scheduling types.

**Step 4 — Verify with the built-in tests**
Settings → Connections & Integrations: **Email & SMTP** (send test), **Cloud
Storage** (connection test), **Payments** (Stripe key test), **SMS**. All
onboarding config is editable here forever — no wizard re-run needed.

**What a fresh tenant should expect on day one**
- Reports/dashboards show real zeros (no mock data).
- Email campaigns have 0 subscribers until `/api/newsletter/signup` fills
  `email_subscribers` (no admin import UI yet).
- Unconfigured channels degrade honestly ("not configured", never fake
  "sent").
- The AI agent works against live CRM data; its Console (Settings → AI
  Assistant & Knowledge) shows real audit stats.

---

## 9. Known Issues & Technical Debt

> Refreshed July 17, 2026 (post-hardening). The March "critical" list is
> resolved or externally-verifiable only; the genuine open items are marked.

### Critical Issues — March list, current status

| # | Issue (March 2026) | Status (July 17, 2026) |
|---|--------------------|------------------------|
| 1 | `.env` with live secrets committed to git | ✅ **Never true** — verified `.env` was never committed (empty `git log --all -- .env`), is gitignored. |
| 2 | SESSION_SECRET = Stripe live key | ⚠️ **Verify on Heroku** — not verifiable from the repo; ensure a random `SESSION_SECRET` config var is set. |
| 3 | No rate limiting on auth/lead/webhook endpoints | 🟡 **Partial** — global 300/min cap + strict 30/15-min cap on `/api/auth` POSTs; webhooks exempt (signature-verified). Per-endpoint limits on public forms still recommended. |
| 4 | DEMO_MODE / ALLOW_DEMO_LOGIN in prod | ⚠️ **Verify on Heroku** — `heroku config -a newagefotografie \| grep -iE "DEMO"` should be empty/false. |

### Open items (July 2026)

| # | Issue | Notes |
|---|-------|-------|
| A | **`helmet` not applied** | 30 min; §10. |
| B | **No CSRF protection** | Session-cookie auth ⇒ state-changing routes CSRF-exposed; §10. |
| C | Fixed-product/package voucher prices client-supplied | Landing-offer prices are HMAC-signed (server-authoritative); the older fixed-product flow still trusts the client. |
| D | No email open/click tracking | Campaign analytics lack pixel + click-redirect. |
| E | No subscriber admin UI | Only `/api/newsletter/signup` adds subscribers. |
| F | WhatsApp sending | Needs an approved WhatsApp Business sender (SMS works). |
| G | Colour theming / template re-skin | Studio Customization persists colours + template choice; live re-theme is future work (~2000 hardcoded Tailwind colour literals). |
| H | Seeded content is German/New-Age flavoured | Questionnaire, KB articles, case-study drafts — a non-German or non-NAF tenant must edit them (see §8.2 Step 1). |

### High-Priority Debt

| # | Issue | Location | Effort |
|---|-------|----------|--------|
| 5 | `server/routes.ts` is ~15,000 lines (monolith) | `server/routes.ts` | Large (16h) |
| 6 | 4 different email service implementations | `server/utils/emailService.ts`, `server/services/email-basic.ts`, `server/services/enhancedEmailService.ts`, `server/services/WorkflowExecutionService.ts` | Medium (4h) |
| 7 | ~15 email templates are inline HTML strings in routes.ts | `server/routes.ts` (scattered) | Medium (8h) |
| 8 | No input validation on most API endpoints | All POST/PUT routes | Medium (6h) |
| 9 | Remaining "New Age Fotografie" hardcoded references | Footer, Navbar, email templates, AI prompts, OG tags | Medium (8h) |
| 10 | No automated tests (zero) | N/A | Large (40h+ for baseline) |
| 11 | `config-reader.ts` partially adopted — many `process.env.*` calls remain | Various server files | Medium (4h) |
| 12 | No DB indexes beyond primary keys | `shared/schema.ts` | Small (2h) |
| 13 | Creative setup `setupMode` only persisted in-memory | `server/setup-routes.ts` | ✅ Fixed & deployed (persists to DB; auto-detects existing instances) |
| 14 | No migration version tracking | N/A | Medium (4h) |
| 15 | ~100+ ad-hoc check/migration scripts in repo root | `check-*.js`, `add-*.ts`, `run-*.ts` | Small (2h cleanup) |

### Low-Priority Debt

| # | Issue | Notes |
|---|-------|-------|
| 16 | No CDN for static assets | Performance at scale |
| 17 | No image optimisation pipeline (thumbnails, WebP) | Gallery performance |
| 18 | No structured logging (all `console.log`) | Debugging in production |
| 19 | No error tracking (Sentry/etc.) | Unknown error rate |
| 20 | No CI/CD pipeline | Manual deploys only |
| 21 | Background jobs run on web dyno | Resource contention under load |
| 22 | Mixed German/English, no i18n framework | Market expansion blocker |

---

## 10. Security Findings (CRITICAL)

> **Status update — July 17, 2026 (verified against the codebase; unchanged
> from the July 14 verification except as noted).** The original findings
> below were written March 3, 2026. Current, checked state:
>
> | Finding | Status (July 14, 2026) |
> |---------|------------------------|
> | Remove `.env` from git / purge from history | ✅ **Resolved / moot** — `.env` was **never committed** (verified via `git log --all --full-history -- .env`, empty), is listed in `.gitignore`, and is absent from the working tree. `.env.example` contains placeholders only (`change-me-random-string`, `postgres://user:pass@host`). |
> | Rotate ALL credentials | ⚠️ **Confirm externally** — no live secrets in the repo, but keys pasted into chat during July work (Render, GitHub PAT, Supabase, AxixOS) should be rotated in their provider consoles. Not verifiable from the codebase. |
> | Verify prod `DEMO_MODE` / `ALLOW_DEMO_LOGIN` off | ⚠️ **Confirm externally** — Heroku CLI not available in this environment. Run `heroku config -a newagefotografie \| grep -iE "DEMO_MODE\|ALLOW_DEMO_LOGIN"` (should be empty/false). |
> | `express-rate-limit` on auth + public endpoints | 🟡 **Partial** — `server/index.ts` applies a global cap (300/min) to everything plus a strict cap (30 / 15 min) on `/api/auth` POSTs; Stripe webhooks + image proxy exempted. Public form endpoints (contact, questionnaire, voucher) rely on the blunt global cap only — a per-endpoint limiter would be stronger. |
> | Webhook signature verification | ✅ **Present** — Stripe `webhooks.constructEvent` on webhook routes; raw body preserved and webhooks exempt from rate-limit/JSON parsing. |
> | Response compression | ✅ **Present** — `compression()` in `server/index.ts`. |
> | Request body size limits | ✅ **Present** — `express.json({ limit: '50mb' })` (generous; tighten per-route if desired). |
> | Add `helmet` security headers | 🔴 **Not done** — `helmet` is not installed/applied. |
> | Add CSRF protection | 🔴 **Not done** — no `csurf`/CSRF token; session-cookie auth means state-changing routes are CSRF-exposed. |
> | Audit routes for missing `requireAuth` | ✅ **Setup wizard closed (July 14)** — **all** mutating `/api/setup/technical/*` endpoints (credential saves, admin creation, SMTP/Stripe probes) are now gated: open on a fresh install (no admin yet), require auth once an admin exists. Read-only status endpoints and post-admin `POST /complete` are exempt so first-run onboarding can't lock itself out. A broader repo-wide route audit is still advisable. |
>
> **Net:** the March "🔴 immediate" list is largely addressed. Remaining genuine gaps: **`helmet`** and **CSRF** (both not started), tighter **per-endpoint rate limits** on public forms, and two **externally-verifiable** items (credential rotation, prod DEMO flags). The remediation instructions below remain valid reference for those.

### 🔴 Immediate Actions Required

#### 1. Remove `.env` from Git

```bash
# Add to .gitignore
echo ".env" >> .gitignore

# Remove from tracking
git rm --cached .env
git commit -m "Remove .env from tracking"

# Purge from history (use BFG Repo-Cleaner)
# https://rtyley.github.io/bfg-repo-cleaner/
bfg --delete-files .env
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

#### 2. Rotate ALL Credentials

Every key in the `.env` file must be considered compromised and rotated:

| Credential | Rotation Method |
|-----------|----------------|
| Stripe keys | Stripe Dashboard → Developers → API Keys → Roll keys |
| Neon DB password | Neon Console → Connection Settings → Reset password |
| SMTP password | Easyname hosting panel |
| OpenAI API key | OpenAI Dashboard → API Keys → Create new, delete old |
| Anthropic API key | Anthropic Console → API Keys |
| Backblaze B2 keys | B2 Console → App Keys → Create new |
| Google OAuth secret | Google Cloud Console → Credentials |
| Vonage API secret | Vonage Dashboard → API Settings |
| Session secret | Generate new: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| JWT secret | Generate new (same command) |

#### 3. Verify Prod Config

```bash
# On Heroku, verify these are NOT set:
heroku config:get DEMO_MODE -a <app-name>        # should be empty or "false"
heroku config:get ALLOW_DEMO_LOGIN -a <app-name>  # should be empty or "false"
```

#### 4. Additional Security Recommendations

| Recommendation | Effort | Priority |
|---------------|--------|----------|
| Add `express-rate-limit` to auth + public form endpoints | 2h | 🔴 Critical |
| Add `helmet` middleware for security headers | 30min | 🟡 High |
| Add CSRF protection | 2h | 🟡 High |
| Audit all routes for missing `requireAuth` middleware | 2h | 🟡 High |
| Add request body size limits | 30min | 🟡 Medium |

---

## 11. Demo / Second-Tenant Deployment

> Rewritten July 17, 2026. The March estimate ("~6 working days of prep")
> is obsolete — most of that prep was DONE during hardening.

### Current state: ✅ largely ready

A demo already exists: the **portable Docker image** built from the
`portable-pg` branch, deployed on Render, with its own Postgres
(`TENANT_ZERO_RUNBOOK.md` is the walkthrough). The hardening pass closed the
March gaps:

| March item | Status |
|------------|--------|
| DEMO_MODE safety gates | ✅ Messaging degrades honestly when unconfigured; demo sends are surfaced as such (never fake "sent"). |
| Brand abstraction | ✅ `siteIdentity.ts` env-driven identity (`%SITE_*%`, `window.__SITE_CONFIG__`) + `studio_configs` branding via Studio Customization. Remaining literals are cosmetic. |
| Config-reader adoption | ✅ Email/SMS/Stripe/storage all read wizard DB config → env fallback. |
| Seed on first deploy | ✅ Boot seeds (studio_configs singleton, questionnaire, KB articles) run idempotently on start. A *rich demo-data* seed (fake clients/invoices/galleries) is still optional work. |
| Provisioning | ✅ Proven: Render + Postgres via the portable image. |

### To refresh the demo after hardening

The demo image predates the hardening commits. Rebuild from the current
`portable-pg` (all hardening is on both branches), tag a fresh image, and
redeploy on Render per `TENANT_ZERO_RUNBOOK.md`. Then run the §8.2 runbook
as the demo tenant would — that doubles as onboarding QA.

### Recommended approach (unchanged)

**Single repository, env-driven behaviour.** Do NOT fork the repo per
tenant; a second deployment differs only in env + wizard config.

---

## 12. Prioritised Action Items

> Rewritten July 17, 2026, post-hardening. The March Phase 0–3 items are
> done or moot (see §9/§11); what follows is the real remaining backlog.

### Phase A: Close the last security gaps (hours, not days)

- [ ] Add `helmet` security headers (30 min)
- [ ] Add CSRF protection for session-cookie state-changing routes (2 h)
- [ ] Per-endpoint rate limits on public forms (contact, questionnaire, voucher) (2 h)
- [ ] Externally verify: prod `SESSION_SECRET` is random; `DEMO_MODE`/`ALLOW_DEMO_LOGIN` unset; rotate keys pasted into chats during July work (Render, GitHub PAT, Supabase, AxixOS)
- [ ] Extend server-side price validation to fixed-product/package vouchers (landing offers already HMAC-signed)

### Phase B: Demo refresh + onboarding QA (1 day)

- [ ] Rebuild the portable image from current `portable-pg`; redeploy on Render (`TENANT_ZERO_RUNBOOK.md`)
- [ ] Run the §8.2 onboarding runbook end-to-end as a fresh tenant (doubles as QA)
- [ ] Edit/delete the German/NAF-specific seeds for the demo tenant (questionnaire, KB, case-study drafts)
- [ ] Optional: rich demo-data seed (fake clients/invoices/galleries)

### Phase C: Product gaps surfaced during hardening

- [ ] Email campaign open/click tracking (pixel + click-redirect)
- [ ] Subscriber admin UI (import/manage `email_subscribers`)
- [ ] WhatsApp Business sender approval (SMS already works)
- [ ] Colour theming + template re-skin engine (Studio Customization persists both today)
- [ ] Remaining SEO editorial track: commercial-B2B pillar, trust-hub pillar (wedding pillar shipped July 17), title-length trims

### Phase D: Engineering quality (unchanged from March, still valid)

- [ ] Split `routes.ts` monolith into module files
- [ ] Consolidate the 4 email service implementations into 1
- [ ] Zod input validation on all endpoints
- [ ] DB indexes on key query columns
- [ ] drizzle-kit migration tracking
- [ ] API integration tests (Vitest + Supertest); then E2E (Playwright)
- [ ] Structured logging (Pino) + error tracking (Sentry)
- [ ] Clean up ad-hoc scripts in repo root; GitHub Actions CI

### Phase E: Scale preparation (unchanged)

- [ ] Image optimisation pipeline (thumbnails, WebP, CDN)
- [ ] Separate worker dyno for background jobs
- [ ] i18n framework
- [ ] Multi-tenant architecture for the SmartTog Hub BYOC model

---

## Appendices

### A. Build & Deploy Commands

```bash
# Local development
npm run dev                    # Starts Vite dev server + Express

# Production build
npm run build                  # Vite build (client) + esbuild (server)

# Heroku deployment
git push heroku main           # Auto-builds via heroku-postbuild script

# Database schema push
npx drizzle-kit push           # Applies schema.ts changes to live DB

# Database migrations (ad-hoc)
psql $DATABASE_URL -f add-onboarding-columns.sql
```

### B. Key API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/setup/technical/status` | Public | Check if onboarding complete |
| POST | `/api/setup/technical/complete` | Auth | Mark tech setup done |
| GET | `/api/setup/status` | Auth | Creative setup status |
| POST | `/api/setup/complete` | Auth | Mark creative setup done |
| GET | `/api/crm/clients` | Auth | List clients |
| POST | `/api/crm/clients` | Auth | Create client |
| GET | `/api/leads/list` | Auth | List leads |
| POST | `/api/leads/:id/convert-to-client` | Auth | Convert lead → client |
| GET | `/api/invoices` | Auth | List invoices |
| POST | `/api/invoices` | Auth | Create invoice |
| GET | `/api/galleries` | Auth | List galleries |
| POST | `/api/email/campaigns` | Auth | Create campaign |
| GET | `/api/blog/posts` | Auth | List blog posts |
| GET | `/api/dashboard/stats` | Auth | Dashboard analytics |
| POST | `/api/stripe/webhook` | Stripe | Webhook handler |
| GET | `/api/studio-config` | Public | Studio branding/config |

### C. Heroku Configuration

```
Buildpack:     heroku/nodejs
Node:          >=20.0.0 (resolves to LTS)
Procfile:      web: node dist/index.js
Build script:  heroku-postbuild → cross-env HEROKU=true npm run build
Stack:         Heroku-24
```

### D. File Change History (This Session)

| File | Changes Made |
|------|-------------|
| `server/routes.ts` | Added `POST /api/leads/:id/convert-to-client` endpoint |
| `client/src/pages/admin/AdminLeadsPage.tsx` | Added UserPlus button, `handleConvertToClient` handler, loading state |
| `client/src/pages/MySubscriptionPage.tsx` | Fixed import path (`./../../lib/dateFormat` → `../lib/dateFormat`) |
| `server/index.ts` | Added onboarding column migrations at startup + auto-detect existing instances |
| `server/technical-setup-routes.ts` | Added auto-detect logic (≥3 steps configured → mark complete) |
| `server/setup-routes.ts` | Persist `creativeSetupComplete` to DB + read from DB for `setupMode` |

---

*Document prepared for developer review — March 3, 2026*
*GitHub Copilot — AI Pair Programming Assistant*
