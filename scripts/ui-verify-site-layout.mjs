// Layout is a separate axis from colour, and every section must honour both.
//
// Eight theme presets all rendered through one arrangement — a centred headline, three cards
// in a row, an image inside a rounded box — so changing preset re-skinned that arrangement
// and could never change it. Eight distinct palettes still produced eight pages that looked
// like the same page. Layout is now its own choice.
//
// The check that matters most here is the phantom-variable one. A section written against
// `var(--tn-text)` or `var(--tn-font-heading)` compiles, builds, passes review and renders
// with no colour at all, because a CSS variable that was never emitted simply resolves to
// nothing. The editorial hero reached for both on its first draft.

import { readFileSync, readdirSync, existsSync } from 'fs';

const read = (p) => readFileSync(p, 'utf8');
const SECTION_DIR = 'client/src/features/landing-pages/components/public';

const themeScope = read('client/src/components/public/ThemeScope.tsx');
const layouts = read('shared/siteLayouts.ts');
const resolver = read('server/lib/site-layout.ts');
const routes = read('server/routes.ts');
const panel = read('client/src/components/admin/ThemesPanel.tsx');
const boot = read('server/index.ts');
const ctx = read('client/src/components/public/SiteLayoutContext.tsx');

let failed = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!ok) failed++;
};

console.log('\nSite layout\n');

// ── The axis exists end to end ──────────────────────────────────────────────
check('layouts are declared once, shared by both sides', /export const SITE_LAYOUTS/.test(layouts));
check('an unknown id cannot reach the database', /normalizeLayoutId\(id\)/.test(resolver));
check('the column is created at boot', /ADD COLUMN IF NOT EXISTS site_layout/.test(boot));
check('the public config carries it', /studioConfig\.siteLayout = await getSiteLayoutForStudio/.test(routes));
check('it can be saved', /api\/admin\/site-layout/.test(routes));
check('the studio can choose it', /SITE_LAYOUTS\.map/.test(panel));

check('choosing a layout does not reset the palette',
  /site-layout/.test(panel) && /site-theme/.test(panel)
  && !/saveSiteTheme[\s\S]{0,200}site_layout/.test(resolver));

// ── Sections can find out which layout they are in ──────────────────────────
check('the layout reaches sections without prop-drilling', /useIsEditorial|useSiteLayout/.test(ctx));
check('a section outside the provider gets the classic arrangement',
  /createContext<LayoutId>\(DEFAULT_LAYOUT_ID\)/.test(ctx));
check('the theme scope provides it', /<SiteLayoutProvider/.test(themeScope));

// ── Phantom CSS variables ───────────────────────────────────────────────────
//
// Collect every --tn-* the theme actually emits, then every --tn-* any section consumes.
// Anything consumed but not emitted resolves to nothing at runtime, silently.
const emitted = new Set([...themeScope.matchAll(/--tn-[a-z-]+(?=:)/g)].map((m) => m[0]));

const consumed = new Map();
if (existsSync(SECTION_DIR)) {
  for (const f of readdirSync(SECTION_DIR).filter((n) => n.endsWith('.tsx'))) {
    const src = read(`${SECTION_DIR}/${f}`);
    for (const m of src.matchAll(/var\((--tn-[a-z-]+)/g)) {
      if (!consumed.has(m[1])) consumed.set(m[1], new Set());
      consumed.get(m[1]).add(f);
    }
  }
}

const phantom = [...consumed.keys()].filter((v) => !emitted.has(v));
check('every theme variable a section uses is actually emitted',
  phantom.length === 0,
  phantom.length
    ? phantom.map((v) => `${v} (in ${[...consumed.get(v)].join(', ')})`).join('; ')
    : `${emitted.size} emitted, ${consumed.size} consumed`);

// ── Brand classes that ignore the theme ─────────────────────────────────────
//
// This is most of why eight distinct palettes produced eight pages that looked like the
// same page. The hero band, the final CTA and the section wrapper all used
//
//     bg-gradient-to-br from-purple-700 via-purple-600 to-pink-600
//
// and of those three stops only to-pink-600 was in the override map. from-purple-700 was
// never listed (500 and 600 were) and there was no via-* rule at all — so the largest colour
// surface on every landing page rendered literal violet on all eight presets. Atelier is
// bone and ember; its hero was violet.
//
// A class like this is invisible in review: it is a perfectly ordinary Tailwind utility, it
// compiles, and it looks deliberate. Only comparing the two lists finds it.
const mapped = new Set(
  [...themeScope.matchAll(/\.((?:from|via|to|text|bg|border|ring)-[a-z]+-?[0-9]*)/g)].map((m) => m[1]),
);

const BRAND = /\b((?:from|via|to|text|bg|border|ring)-(?:purple|pink|violet|fuchsia|indigo)-[0-9]{2,3})\b/g;
const unthemed = new Map();
if (existsSync(SECTION_DIR)) {
  for (const f of readdirSync(SECTION_DIR).filter((n) => n.endsWith('.tsx'))) {
    for (const m of read(`${SECTION_DIR}/${f}`).matchAll(BRAND)) {
      if (mapped.has(m[1])) continue;
      if (!unthemed.has(m[1])) unthemed.set(m[1], new Set());
      unthemed.get(m[1]).add(f);
    }
  }
}

check('every brand colour in every section follows the theme',
  unthemed.size === 0,
  unthemed.size
    ? [...unthemed.entries()].map(([c, fs2]) => `${c} in ${[...fs2].join(', ')}`).join('; ')
    : `${mapped.size} classes mapped`);

// The three stops of the gradient that matters most, named individually so a partial
// regression cannot hide behind the aggregate check above.
for (const stop of ['from-purple-700', 'via-purple-600', 'to-pink-600']) {
  check(`${stop} is themed`, mapped.has(stop));
}

// ── The editorial variants stay honest ──────────────────────────────────────
const hero = read(`${SECTION_DIR}/PublicLandingPageHero.tsx`);

check('the editorial hero exists', /useIsEditorial\(\)/.test(hero) && /if \(editorial\)/.test(hero));

// Studios onboard with empty sites. A hero that assumes a photograph renders light text on a
// light ground — unreadable, and on the very first page they ever see.
check('the editorial hero handles having no photograph',
  /hasMedia \?/.test(hero) && /min-h-\[52vh\]/.test(hero));

check('light text is only used when there is media behind it',
  !/color: '#ffffff'(?![\s\S]{0,80}hasMedia)/.test(hero));

check('the classic arrangement is untouched',
  /\/\/ ── Classic/.test(hero) && /from-purple-700 via-purple-600 to-pink-600/.test(hero));

console.log(`\n  ${failed === 0 ? 'all checks passed' : failed + ' FAILED'}\n`);
process.exit(failed === 0 ? 0 : 1);
