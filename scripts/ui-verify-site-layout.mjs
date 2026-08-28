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
const eolOf = (src) => (src.includes('\r\n') ? '\r\n' : '\n');
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

// ── Words the page supplies itself ──────────────────────────────────────────
//
// Almost everything on a landing page is the studio's own copy. Four strings were not, and
// all four were German, shipped to every studio on every instance:
//
//     "Häufige Fragen"                       the FAQ heading
//     "Jetzt buchen"                         the DEFAULT call to action
//     "Alle Bewertungen auf Google ansehen"  the reviews link
//
// The CTA one was the worst: being the fallback, it appeared precisely when a studio had
// not customised the page — which is every page on the day they launch. So a Brighton
// photographer's main button said "Jetzt buchen".
//
// Assert the property rather than the three phrases: no section may carry a hardcoded
// string in a language, whichever language it happens to be.
const GERMAN = /[ÄÖÜäöüß]|\b(Jetzt|Häufige|Alle|Bewertungen|Fragen|Leistungen|Angebot|Unsere|Über)\b/;
const germanIn = [];
if (existsSync(SECTION_DIR)) {
  for (const f of readdirSync(SECTION_DIR).filter((n) => n.endsWith('.tsx'))) {
    const src = read(`${SECTION_DIR}/${f}`);
    // Comments are allowed to quote the strings — that is how the bug gets documented, and
    // this file is full of quoted German for exactly that reason. Line-prefix filtering was
    // not enough: it missed the CONTINUATION lines of a block comment, which is where a
    // quoted string usually sits. Strip the comments as comments.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, ' ')   // block comments, including JSX {/* ... */}
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1'); // line comments, without eating a URL's //
    if (GERMAN.test(code)) germanIn.push(f);
  }
}
check('no section hardcodes copy in one language',
  germanIn.length === 0,
  germanIn.length ? germanIn.join(', ') : `${readdirSync(SECTION_DIR).length} files scanned`);

check('the labels come from one map keyed by language',
  existsSync('client/src/features/landing-pages/utils/publicLabels.ts')
  && /LABELS\[key\] \|\| LABELS\.en/.test(read('client/src/features/landing-pages/utils/publicLabels.ts')));

// ── Coverage ────────────────────────────────────────────────────────────────
//
// A layout is only a layout if every section honours it. One section left on the classic
// bones while everything around it changed is worse than not offering the choice — it reads
// as a rendering bug rather than as a design.
//
// Named individually rather than counted, so adding a section forces a decision here rather
// than silently lowering the bar.
const MUST_RESPOND = [
  'PublicLandingPageHero',
  'PublicLandingPageTrustBar',
  'PublicLandingPageProblemSection',
  'PublicLandingPageBenefitsSection',
  'PublicLandingPageOfferSection',
  'PublicLandingPageInclusionsSection',
  'PublicLandingPageWhyChooseUsSection',
  'PublicLandingPageTestimonialsSection',
  'PublicLandingPageFaqSection',
  'PublicLandingPageVideoSection',
  'PublicLandingPageFinalCta',
  'PublicLandingPageSectionWrapper',
];

const notResponding = MUST_RESPOND.filter((name) => {
  const p = `${SECTION_DIR}/${name}.tsx`;
  if (!existsSync(p)) return true;
  return !/useIsEditorial\(\)/.test(read(p));
});

check('every section responds to the layout',
  notResponding.length === 0,
  notResponding.length ? notResponding.join(', ') : `${MUST_RESPOND.length} sections`);

// Each variant must keep the classic one intact beside it — the choice is additive, and a
// studio on the default must see exactly what they saw yesterday.
const missingClassic = MUST_RESPOND.filter((name) => {
  const p = `${SECTION_DIR}/${name}.tsx`;
  if (!existsSync(p)) return false;
  const src = read(p);
  // The wrapper branches on a lookup table rather than on markup, so it is exempt from the
  // two-branch shape while still being required to consult the layout above.
  if (name === 'PublicLandingPageSectionWrapper') return false;
  return !/Classic/.test(src);
});

check('every variant keeps the classic arrangement beside it',
  missingClassic.length === 0,
  missingClassic.length ? missingClassic.join(', ') : 'all branch both ways');

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

// ── The studio's identity is on the page at FIRST paint ────────────────────
//
// ThemeScope fetched /api/studio-config from the browser. Until it landed, getThemePreset()
// returned THEME_PRESETS[0] — 'atelier', a rust-red accent — and a null layout fell through
// to 'classic'. Both are right for a section rendered outside a provider; neither is right
// for a visitor. So every public page painted in full, in ANOTHER studio's identity, and
// then swapped.
//
// Caught on video on the live demo: ~2s of red nav and buttons, classic instead of
// editorial, no logo, and a headline set as dark centred type over a photograph chosen for
// editorial's left-aligned treatment — barely legible.
//
// This is the third time this exact shape has been fixed in this file's neighbourhood. The
// homepage BODY flash and the language-guess both have comments explaining why guessing is
// worse than waiting. The brand did not get the same treatment.
const viteShell = read('server/vite.ts');
const themeScopeSrc = read('client/src/components/public/ThemeScope.tsx');

check('the shell stamps the studio theme and layout',
  /window\.__SITE_CHROME__=/.test(viteShell) && /getSiteLayoutForStudio\(\)/.test(viteShell),
  'so the first paint is already the studio\'s, with no round trip');

// Injecting it is useless if a send path forgets to carry it. Every HTML response from the
// catch-all must go through withChrome — the prerendered branch included, which is the one
// serving most pillar pages.
const chromeSends = (viteShell.match(/type\("html"\)\.send\(/g) || []).length;
const chromeWrapped = (viteShell.match(/type\("html"\)\.send\(\s*withChrome\(/g) || []).length
  + (viteShell.match(/send\(\n\s*withChrome\(/g) || []).length;
check('and every HTML response carries it',
  chromeWrapped >= chromeSends,
  `${chromeWrapped}/${chromeSends} send paths wrapped`);

check('the client prefers the stamp over its own fetch',
  /__SITE_CHROME__/.test(themeScopeSrc) && /enabled: !preset && !injected/.test(themeScopeSrc),
  'otherwise the round trip stays and so does the flash');

// The fetch must SURVIVE as the fallback: the dev server does not stamp, and neither does
// the last-resort sendFile. Deleting it would trade a flash for a permanently wrong theme.
check('but keeps the fetch for shells that carry no stamp',
  /\/api\/studio-config/.test(themeScopeSrc),
  'dev server and the fatal-catch sendFile both serve an unstamped shell');

console.log(`\n  ${failed === 0 ? 'all checks passed' : failed + ' FAILED'}\n`);
process.exit(failed === 0 ? 0 : 1);
