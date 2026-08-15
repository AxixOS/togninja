# TogNinja / New Age — Developer Handover

Written 11 Aug 2026. Read this before touching anything; §2 in particular will save you
from shipping a correct change to the wrong place.

---

## 1. What this system is

**One codebase, many single-tenant deployments.** Each customer gets their own Render
service and their own database. **One database = one studio.** There is no tenant column
anywhere — the `studio_configs` table holds a single row, read everywhere with `LIMIT 1`,
and that row *is* the tenancy.

It started life as the website + CRM for **New Age Fotografie** (NAF), a family photography
studio in Vienna. It is being turned into a product any photographer can buy, which means
removing NAF from the image so a buyer sees only their own business. Most work in the last
week is that removal.

**Test tenant:** Susan Grace Hinman, a Brighton (UK) **boudoir** photographer — chosen to
be as unlike a Viennese family studio as possible. That contrast is what keeps surfacing
leaks; a German family studio would have hidden most of them.

---

## 2. TWO LINES. Read this twice.

There are two live products from this one repo, and **they have deliberately diverged.**

| | Product line | New Age line |
|---|---|---|
| Remote | `product` → `AxixOS/togninja` | `newage` → `siparrott/workingnewage` |
| Local branch | `promote-1.8.22` | `naf-remove-calculator` |
| Remote branch | `main` | `main` **and** `newage-production` |
| Head (11 Aug) | `eb7877e` (v1.8.79) | `be1a47e` |
| Deploys to | `togninja.onrender.com` (demo) + customer instances | `newagefotografie.com` |

**Why they diverged.** NAF's line was left at `4bc28a2` (6 Aug). Everything on the product
line since then is de-branding — including stripping "Wien" from the German SEO strings.
That is correct for a buyer and a **local-search regression for NAF**, which is the brand
being removed. So NAF gets specific fixes cherry-picked, not the whole line.

**Consequences you must respect:**

- A change wanted by both lines has to be applied to **both**. Cherry-picks between them
  routinely conflict (four days of divergence in the same files) — apply manually to the
  other line's file when they do.
- These are on the **NAF line only** and are NOT in the product image:
  `be1a47e` campaign-page coupons · `f351a5f` admin sidebar scroll fix ·
  `b100ade` homepage calculator removal (the product line removed it separately in `16fb991`).
  The **sidebar scroll fix is a plain bug every studio has** — port it.

### Deploying

```bash
# Product line
git checkout promote-1.8.22
git cherry-pick <sha>                 # use the SHA, never the branch name
git push product promote-1.8.22:main
git tag v1.8.80 <promote-sha> && git push product v1.8.80

# New Age line
git checkout naf-remove-calculator
git push newage naf-remove-calculator:main
git push newage naf-remove-calculator:newage-production   # both, they must stay level
```

**Tag the commit on the promote branch, not the one on `main`.** They are different SHAs
after a cherry-pick. Tagging main's SHA makes a tag that is not on the deployed branch —
this happened three times and had to be undone each time.

---

## 3. What you cannot get from the repo

`.env` is gitignored (correctly — live credentials). Get it from Matt. Minimum to boot:
`DATABASE_URL`, `ENCRYPTION_KEY`, `SESSION_SECRET`.

**`ENCRYPTION_KEY` matters more than it looks.** Every stored integration credential (SMTP,
Stripe, OpenAI, storage) is AES-256-GCM encrypted with it. A different key does not error —
it silently fails to decrypt, and every integration appears broken for no visible reason.

```bash
npm install --legacy-peer-deps
cp <the .env you were given> .env
npm run dev
```

---

## 4. First thing, every single time

```js
await fetch('/api/version?cb=' + Date.now()).then(r => r.json()).then(d => console.log(d.commitShort))
```

At least six "the fix doesn't work" investigations across this project were a stale image.
Twice a command was run in the ~30 seconds before a new build finished booting and appeared
to do nothing. Check the commit **before** you diagnose.

---

## 5. The onboarding pipeline

`/setup` — a 14-step wizard (`client/src/pages/setup/UnifiedSetupWizard.tsx`). Completed
steps are clickable to go back; the sidebar says so.

The interesting part is what happens after **Business basics**, driven by the studio's own
website URL (`server/lib/homepage-pipeline.ts`):

```
crawl the studio's existing site
   ↓
distil → generate copy (OpenAI, in the studio's chosen language)
   ↓
├── seed manual_page_content  → the five built-in pages, published
├── generate the Authority Map → the studio's real services  (authority-from-crawl.ts)
│      ↓
│   ├── scaffold pillar PAGES, published   (authority-scaffold.ts)
│   └── starter voucher products, INACTIVE at price 0   (starter-products.ts)
└── nav, sitemap, SSR meta all read the map
```

**Starter products are created inactive at price 0 on purpose.** They are live payment
items; a price invented by a language model is a price a customer can actually pay. The
studio sets prices before anything is purchasable. Do not "helpfully" fill them in.

### Three settings that look similar and are not

| Value | Table | Drives |
|---|---|---|
| `studio_configs.site_language` | studio_configs | page visibility, generated copy, **public URLs** |
| `i18n_settings.default_language` | i18n_settings | which translation set the public site renders |
| `SITE_LANG` | env | fallback for the first |

These were never linked. A studio could onboard in English, get English URLs and English
copy, and still serve visitors the **German** set — which is NAF's Vienna copy, down to its
phone number. `applySiteLanguageToI18n()` now sets both. If you add a third language
concept, wire it in here.

**URL localisation only happens on an EXPLICIT language choice** (`getExplicitSiteLanguage()`,
null when unanswered). This is deliberate: NAF has never answered, and localising on the
fallback would have 301'd every one of its live German URLs to English paths.

---

## 6. Recent work (5–11 Aug)

Roughly in order. Product line unless marked.

**Per-studio pillars.** The nav had 14 hardcoded Vienna service pages. Now: the crawl
builds an Authority Map, the nav reads it, pillar pages are generated and published, and
they serve at their real paths (`/boudoir-photography/`) with SSR meta and sitemap entries.
Three separate faults were in the way — the pages were never built, then built as drafts
that nothing served, then the meta resolver was unreachable because the injection branch
was gated on a path pattern pillars don't match.

**Localised public URLs.** `/kontakt` → `/contact` / `/contacto` via `shared/routeSlugs.ts`,
with 301s from the canonical paths. Implemented by handing `<Routes>` a rewritten location
rather than rewriting ~420 link literals.

**Onboarding hardening from a real run.** Six findings: credentials surviving `reset-demo`,
"Storage test failed: Invalid URL" on correct input (the test path didn't normalise the
endpoint, the save path did), a Region placeholder that invited the error it then punished,
language defaulting to the browser's, no visible way back, and being made to log in again
after choosing your own password two steps earlier.

**Stripe.** Webhook auto-created from the secret key; progression gated on a passing test;
an explicit "I'm not selling online" opt-out that actually hides the shop.

**De-branding.** The origin studio's pricing calculator was embedded on every homepage by
default; its product catalogue, service cards, hero rotators, FAQ answers, phone number and
Instagram handle were burnt in; the German translation set had never been cleaned at all.

**Connection pool.** Three pools (`server/db.ts`, `server/auth.ts`, `database.js`) share one
Supabase pooler. Two were budgeted against the 15-client cap; the third asked for 20 and was
never counted. Total 31 → everything 500'd with `EMAXCONNSESSION`. The sum is now asserted
at boot — **read that line**.

**New Age line only:** homepage calculator removed pending a PricingEmbed rework; coupons
restricted to campaign landing pages; admin sidebar made to actually scroll.

---

## 7. Outstanding

Updated 14–15 Aug, after `v1.8.80 → v1.8.96` (18 commits). The demo instance was reset
and re-onboarded from scratch onto a real UK wedding company, `bigdayproductions.co.uk`,
which is what surfaced most of what follows. **Susan Grace Hinman is no longer the test
tenant** — that was consumed by the reset, because one database is one studio.

| Item | Notes |
|---|---|
| Port sidebar scroll fix to product line | `f351a5f`. Plain bug, every studio has it. Still the cheapest thing on this list. |
| Port campaign-page coupons to product line | `be1a47e`, if wanted in the image. |
| Service area is a single value | `studio_configs.city` holds one string, so a studio covering nine cities can name one. Comma-splitting was considered and rejected: "Brighton, UK" is one place written two ways, and the normaliser already strips the segment after the comma. Needs a UI that asks for a list. |
| Identity is a boot-time snapshot | `config-reader.ts` hydrates `BUSINESS_NAME` and `APP_URL` from `studio_configs` into `process.env` at startup, only when not already set. So "env wins" in `siteIdentity` does not mean an operator override wins — it means **a frozen copy of the same database row wins**. A studio that renames itself sees no change until the service restarts. Decide whether the live row should beat the snapshot. |
| Currency | `€` still renders on pillar pages for a GBP studio; voucher prices format as `299,00 £` — German number formatting on sterling. |
| Three Vienna case studies are seeded into every tenant | `server/index.ts` → `seed-case-studies.ts` writes them as **drafts** into `blog_posts` at boot. One publish click puts the origin studio's real client outcomes on a buyer's site. Needs a de-seed and a data migration, not a code default change. |
| `blogImageAnalysis.ts:61-70` | Stamps `© New Age Fotografie, Wien` and Vienna GPS into the IPTC/XMP of every analysed blog image. Unlike HTML this is **not repairable after the fact**. |
| `STATIC_ROUTE_META` (`server/vite.ts:796-833`) | German, NAF-branded titles and crawlable body injected **server-side for every tenant** on `/gutschein*`. No client fix reaches it. |
| Prerender manifest + shipped static files | `vite.config.ts:42-126` is a hardcoded list of NAF German URLs; `client/public/sitemap.xml` has 48 `<loc>`s on newagefotografie.com and `robots.txt` points its `Sitemap:` there. All shipped into `dist` for every buyer. |
| `FotoshootingPreiseWienPage` | A geo-targeted landing page that is *about* Vienna. Do not interpolate a city into it — gate it on tenancy. |
| Structured data | Three overlapping business entities (`PhotoStudio`, `ProfessionalService`, `LocalBusiness`) each carry the same claims on one page. |
| `manual_page_content` re-key | `homepage-pipeline.ts:235` seeds every studio's copy under `language='en'` because `config?.language` is undefined (the column is `siteLanguage`). **Do not just fix the expression** — see §9. |
| Sidebar reordering | Requested, not started. Needs a stored order, a UI, and — the part to get right — appending unknown items so a future nav entry isn't invisible to existing studios. |
| Image upload docs | Never written: where homepage/portfolio photos are uploaded and how sections are chosen. |
| `tsc` | Crashes with an out-of-memory dump on the current machine. Try `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`. **Baseline is 613 pre-existing errors** — that is the bar, not zero. |

**Done since the last revision**, so you don't go looking for it: the homepage TDZ crash;
language precedence (`GET /api/i18n/settings` now resolves the studio's own answer ahead of
the table); canonical localisation; the studio's name, city and domain reaching its own
pages; the crawler rendering JavaScript; and the removal of the origin studio's
photographer, social accounts, Google review link, client list, address, opening hours,
history, review score, twelve invented testimonials, business metrics and dead internal
links. `/gift-vouchers/{family,newborn,maternity}` no longer carry Vienna in their titles,
though their body copy is still German-first.

---

## 8. How to verify (tsc being unreliable)

```bash
npx vite build --mode production          # catches JSX/syntax

# Boot the PRODUCTION handler. setupVite() and serveStatic() each register their own
# app.use("*"), and SSR meta/prerendering/sitemap live ONLY in the production one.
# Three rounds of debugging were lost to testing against the dev handler.
NODE_ENV=production PORT=5265 PUBLIC_SITE_URL=https://example.com npx tsx server/index.ts

node scripts/check-visible-leaks.mjs http://localhost:5265
```

`check-visible-leaks.mjs` renders each public page and reads visible text **plus** iframe
sources, `title`/`alt`/`aria-label`, document title and meta description. A grep over
`client/src` counts defaults no studio renders, and an iframe contributes nothing to
`innerText` — the pricing-calculator leak was invisible to both. It exits non-zero on a leak
**or on a page it could not inspect**: it once reported "23 pages, 0 visible" while every
page had failed on a `ReferenceError`, and a false all-clear gets believed.

**It has three blind spots, all of which hid a real defect.**

1. **It never reads link targets.** It sweeps text and attributes, never `href`. So a
   "Review us on Google" button pointing at the origin studio's Business Profile, and a
   named individual's personal LinkedIn, were invisible to it by construction. One line
   fixes it: collect `a[href]`.
2. **Its pattern is too narrow.** It matches `New Age|Vienna|Wien|Wehrgasse|+43` — so it
   scored `/about/` clean while that page's biggest heading read "Simon — the photographer
   behind <the buyer's name>". Add the origin photographer's name, the fabricated client
   list, and a bare currency symbol.
3. **It cannot tell a rendered page from a crashed one.** The ErrorBoundary's fallback
   contains no Vienna strings, so a page showing "Something went wrong" scores *clean*.
   That is how the homepage crash of `v1.8.81` passed the gate. Assert on the boundary's
   marker text.

Until those are closed, a passing run means less than it looks. Every leak found on 13–15
Aug was found by rendering a page and reading it, not by this script.

---

## 9. Traps that cost real time

- **Never bulk-regex a file.** A tidy rule matched every line's indentation and reformatted
  1,731 lines; a later one broke prose. Work line by line, assert bounds before deleting,
  and check `git diff --numstat` shows equal added/removed.
- **Route shadowing in `server/routes.ts`** (~20k lines). Duplicate registrations for the
  same path; Express matches first-registered and the later handler never runs. Hit four
  times. Suspect it whenever a handler "cannot possibly be doing that".
- **Dev vs production catch-all** — see §8.
- **Code defaults do not rewrite published content.** `manual_page_content` holds snapshots.
  Changing a default has no effect on a studio that already published; use the page's Reset
  or a forced regenerate (`?force=1`, which overwrites their copy — say so before running it).
- **Empty string is a deliberate value.** Several keys are `''` on purpose; truthiness
  checks treat them as missing.
- **Two bindings in two screens is a trap.** The campaign-coupon bug was exactly this: a
  coupon named its landing page, but the discount also required the *page* to name a product
  in a different screen. If a feature needs two things to agree, make one of them enough.
- **A stored value can record the form, not the answer.** `studio_configs.site_language` is
  documented as "the language the studio ACTUALLY CHOSE", and URL localisation is deliberately
  gated on it being NULL — that null is what protects NAF's live German URLs. But the wizard's
  language control is pre-filled `'en'` (`BasicsPhase.tsx:105`) and cannot fail validation, so
  every studio that finishes onboarding has a non-null value whether or not it ever considered
  the question. Non-null means "submitted the form", not "chose". Before gating behaviour on
  "did they choose X", check whether the write path can tell a choice from a default — here it
  cannot, and a German studio that accepted the prefill is indistinguishable from one that
  meant English.
- **Never round-trip a source file through PowerShell text cmdlets.** `Get-Content` reads
  as the system codepage and `Set-Content -Encoding UTF8` writes as UTF-8, so every
  non-ASCII character is encoded twice. A line-range deletion done that way shipped 81
  mangled characters to production in `v1.8.92`: every en dash and umlaut on the About page
  rendered as the three-character Windows-1252 soup, in front of visitors. The render check
  printed it and it was read as a console display artefact rather than the defect. Use Node's `fs` with an explicit `'utf8'`. If it has already happened,
  do **not** reverse the whole file: a corrupted file is a MIX of mangled and intact
  characters, and a blanket reverse damages the good ones. Enumerate the distinct bad
  sequences, map them explicitly, apply longest-first, assert to zero.
- **A JSX comment is not an attribute.** `{/* … */}` between props inside a tag is a parse
  error, not a comment. Twice in one day. Put the note above the tag.
- **An imperative `document.title` beats the declarative one on the same page.** BlogPage
  set title, description and og:title in a `useEffect` that ran after its own `SEOHead` and
  overwrote it — and its cleanup set the origin studio's name as the title of whichever
  page you navigated to next. If a page has `SEOHead`, that is the only thing allowed to
  touch its head.
- **A column inside a conflict key is not a value you can quietly change.**
  `manual_page_content` upserts `ON CONFLICT (studio_id, page_id, language)`. The seeding call
  passes `config?.language`, which is always `undefined` — the column is `siteLanguage` — so
  every studio's generated copy is stored under `'en'`. The obvious one-word fix *forks* the
  rows instead of updating them: `writePage`'s anti-clobber lookup uses the same key, stops
  seeing the studio's own edits, and the next regenerate replaces hand-written copy with
  generated copy. Reverting the code does not revert the rows. Changing what you write into a
  key is a re-key migration, not an edit.

---

## 10. Useful commands

```js
// Wipe to pre-onboarding (DEMO_MODE only; signs you out — you make a new admin in the wizard)
await fetch('/api/setup/reset-demo', { method: 'POST', credentials: 'include' }).then(r => r.json()).then(console.log)

// Re-crawl + regenerate. force=1 OVERWRITES existing copy
await fetch('/api/setup/homepage/generate?force=1', { method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.json()).then(console.log)

// Build + publish pillar pages without a full regenerate
await fetch('/api/authority-map/scaffold', { method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publish: true }) })
  .then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
```

Public GETs, readable from anywhere: `/api/version`, `/api/studio-config`,
`/api/authority-map`, `/api/manual-pages/published/all`, `/sitemap.xml`.

---

## 11. Honest status

The onboarding pipeline works end to end, and a buyer's site carries their own copy,
services, URLs and language. What remains is a tail: three voucher sub-pages, the city
interpolation, and two NAF-line fixes that should be ported.

The riskiest thing is not the code — it is that the two lines have diverged and that `tsc`
cannot currently run to completion. **Build + boot + render** is the verification bar, and
the render step is not optional: every leak found in the last week was invisible to grep.
