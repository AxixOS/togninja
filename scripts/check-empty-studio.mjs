#!/usr/bin/env node
/**
 * The empty-studio gate.
 *
 * Boots against whatever studio the target server is using and asserts that no page names
 * a business, city or domain that is not that studio's own. Run it against an instance
 * with a BLANK studio_configs and it answers the only question that matters for a
 * product built out of one studio's website: with no data of its own, does this thing
 * still advertise somebody else?
 *
 * Two passes per route, and the second is the point:
 *
 *   1. Hydrated  — what a visitor sees after React runs.
 *   2. JS OFF    — what a crawler sees, and what the prerenderer froze into dist.
 *
 * check-visible-leaks.mjs only ever did the first, which is how a prerendered Vienna
 * pillar grid passed for months: react-helmet-async and the SPA had already replaced it
 * by the time that script looked. It also read only innerText, so a link's href, an
 * image's src and a <link rel=canonical> were invisible to it by construction.
 *
 * Usage:
 *   node scripts/check-empty-studio.mjs                       # http://localhost:5293
 *   BASE=https://togninja.onrender.com node scripts/check-empty-studio.mjs
 *   node scripts/check-empty-studio.mjs --expect "Big Day Productions"
 *
 * Exit code is the number of routes with at least one leak, so CI can gate on it.
 */
import puppeteer from 'puppeteer';

const BASE = (process.env.BASE || 'http://localhost:5293').replace(/\/+$/, '');
const args = process.argv.slice(2);
const expectIdx = args.indexOf('--expect');
// Names the studio IS allowed to use. Anything matching a pattern below but also
// matching this is not a leak — a studio genuinely called "Vienna Portraits" is fine.
const OWN = expectIdx >= 0 ? (args[expectIdx + 1] || '') : '';

const ROUTES = [
  '/', '/about/', '/contact/', '/pricing/', '/reviews/', '/faq/',
  '/sessions/', '/vouchers/', '/blog', '/portfolio', '/waitlist/', '/case-studies',
];

// Every identity the product was built from. Not "bad words" — one specific business.
const PATTERNS = [
  { name: 'origin studio name', re: /new\s*age\s*fotografie|newagefotografie/i },
  { name: 'origin domain', re: /newagefotografie\.(com|at)/i },
  { name: 'origin city', re: /\bwien\b|\bvienna\b|wien-margareten/i },
  { name: 'origin street', re: /wehrgasse/i },
  { name: 'origin postcode', re: /\b1050\s*wien\b/i },
  { name: 'origin phone', re: /\+?43\s*677\s*633\s*99210|0043\s*677/i },
  { name: 'origin GA4 property', re: /G-8W76BVNNW9/ },
  { name: 'origin route slug', re: /\/(familienfotos|babyfotos|neugeborenenfotos|schwangerschaftsfotos|teamfotos|bewerbungsfotos)-wien\//i },
  { name: 'origin “why us” route', re: /warum-new-age-fotografie/i },
  { name: 'hot-linked origin asset', re: /i\.postimg\.cc/i },
  { name: 'origin booking system', re: /sproutstudio\.com/i },
  { name: 'placeholder studio name', re: /\bMy Studio\b|\bPhotography Studio\b(?!\s*—)/ },
];

function scan(haystack) {
  const hits = [];
  for (const p of PATTERNS) {
    const m = haystack.match(p.re);
    if (!m) continue;
    if (OWN && new RegExp(OWN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(m[0])) continue;
    // Show a little context so a hit is actionable rather than just true.
    const at = haystack.indexOf(m[0]);
    hits.push({ pattern: p.name, found: m[0], context: haystack.slice(Math.max(0, at - 60), at + m[0].length + 60).replace(/\s+/g, ' ') });
  }
  return hits;
}

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  args: ['--no-sandbox'],
});

let leakingRoutes = 0;
const summary = [];

for (const route of ROUTES) {
  const found = { hydrated: [], nojs: [] };
  let jsErrors = 0;

  for (const mode of ['hydrated', 'nojs']) {
    const page = await browser.newPage();
    if (mode === 'nojs') await page.setJavaScriptEnabled(false);
    page.on('pageerror', () => { jsErrors++; });
    try {
      await page.goto(BASE + route, { waitUntil: mode === 'nojs' ? 'domcontentloaded' : 'networkidle2', timeout: 60000 });
      if (mode === 'hydrated') await new Promise((r) => setTimeout(r, 2500));
      // Harvest the WHOLE document, not innerText: hrefs, srcs, canonicals, JSON-LD,
      // meta content and inline script payloads all carry identity.
      const html = await page.content();
      found[mode] = scan(html);
    } catch (e) {
      found[mode] = [{ pattern: 'fetch failed', found: String(e.message).slice(0, 80), context: '' }];
    }
    await page.close();
  }

  const all = [...found.hydrated, ...found.nojs];
  const uniq = [...new Map(all.map((h) => [h.pattern + h.found, h])).values()];
  if (uniq.length) leakingRoutes++;

  const tag = uniq.length ? 'LEAK' : ' ok ';
  console.log(`${tag} ${route.padEnd(15)} hydrated:${String(found.hydrated.length).padStart(2)}  js-off:${String(found.nojs.length).padStart(2)}${jsErrors ? `  jsErrors:${jsErrors}` : ''}`);
  for (const h of uniq.slice(0, 4)) {
    const where = found.nojs.some((x) => x.found === h.found) && !found.hydrated.some((x) => x.found === h.found)
      ? ' (js-off only — server-injected or prerendered)'
      : '';
    console.log(`       ${h.pattern}: "${h.found}"${where}`);
    if (h.context) console.log(`         …${h.context.slice(0, 130)}…`);
  }
  summary.push({ route, hits: uniq.length });
}

await browser.close();

console.log(`\n${leakingRoutes}/${ROUTES.length} routes leak.  ${summary.reduce((n, s) => n + s.hits, 0)} distinct hits.`);
if (OWN) console.log(`(allowed as the studio's own: "${OWN}")`);
process.exit(leakingRoutes);
