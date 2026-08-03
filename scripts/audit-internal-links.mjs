#!/usr/bin/env node
/**
 * IA-Compliance Audit
 * For every page, count inbound + outbound internal links
 * and verify blueprint requirements:
 *  - links to pillar
 *  - links to 2-3 siblings
 *  - links to /preise/
 *  - links to /warteliste/
 *  - has inline in-text links
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// All tracked pages
const PAGES = [
  // Homepage
  '/',
  // Pillars
  '/familienfotos-wien/',
  '/neugeborenenfotos-wien/',
  '/business-portrait-wien/',
  '/hochzeitsfotografie-wien/',
  '/studio-fotografie-wien/',
  // Family cluster
  '/babyfotos-wien/',
  '/baby-fotografie-wien/',
  '/schwangerschaftsfotos-wien/',
  '/kinder-fotografie-wien/',
  '/familien-fotoshooting-wien/',
  // Business cluster
  '/bewerbungsfotos-wien/',
  '/teamfotos-wien/',
  // Event cluster
  '/eventfotografie-wien/',
  // Other
  '/portrait-fotografie-wien/',
  '/produkt-fotografie-wien/',
  '/immobilien-fotografie-wien/',
  // Conversion
  '/preise/',
  '/warteliste/',
  '/portfolio/',
  '/gutschein/',
  '/vouchers/',
  // Support
  '/ueber-uns/',
  '/kundenstimmen/',
  '/faq/',
  '/kontakt/',
  '/blog/',
];

// Pillar → cluster children mapping
const PILLARS = {
  '/familienfotos-wien/': [
    '/babyfotos-wien/',
    '/baby-fotografie-wien/',
    '/schwangerschaftsfotos-wien/',
    '/kinder-fotografie-wien/',
    '/familien-fotoshooting-wien/',
    '/neugeborenenfotos-wien/',
  ],
  '/neugeborenenfotos-wien/': [
    '/babyfotos-wien/',
    '/familienfotos-wien/',
    '/schwangerschaftsfotos-wien/',
  ],
  '/business-portrait-wien/': [
    '/bewerbungsfotos-wien/',
    '/teamfotos-wien/',
    '/portrait-fotografie-wien/',
  ],
  '/hochzeitsfotografie-wien/': [
    '/eventfotografie-wien/',
    '/portrait-fotografie-wien/',
    '/familienfotos-wien/',
  ],
  '/studio-fotografie-wien/': [
    '/familienfotos-wien/',
    '/business-portrait-wien/',
    '/portrait-fotografie-wien/',
    '/produkt-fotografie-wien/',
    '/immobilien-fotografie-wien/',
    '/baby-fotografie-wien/',
    '/eventfotografie-wien/',
  ],
};

// Find pillar for a given cluster page
function findPillar(page) {
  for (const [pillar, clusters] of Object.entries(PILLARS)) {
    if (clusters.includes(page)) return pillar;
  }
  return null;
}

// Source files we scan (page components + shared SEO components)
function collectSources() {
  const patterns = [
    'client/src/pages/**/*.tsx',
    'client/src/components/SEO/*.tsx',
    'client/src/components/layout/Layout.tsx',
  ];
  const files = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (name.endsWith('.tsx')) files.push(full);
    }
  }
  walk(path.join(repoRoot, 'client/src/pages'));
  walk(path.join(repoRoot, 'client/src/components/SEO'));
  files.push(path.join(repoRoot, 'client/src/components/layout/Layout.tsx'));
  return files;
}

// Map page path → source file path (heuristic: filename match)
const PAGE_FILE_MAP = {
  '/': 'client/src/pages/HomePage.tsx',
  '/familienfotos-wien/': 'client/src/pages/fotoshootings/FamilienfotosWienPage.tsx',
  '/neugeborenenfotos-wien/': 'client/src/pages/fotoshootings/NeugeborenenfotosWienPage.tsx',
  '/business-portrait-wien/': 'client/src/pages/fotoshootings/BusinessPortraitWienPage.tsx',
  '/hochzeitsfotografie-wien/': 'client/src/pages/fotoshootings/HochzeitsfotografieWienPage.tsx',
  '/studio-fotografie-wien/': 'client/src/pages/fotoshootings/StudioFotografieWienPage.tsx',
  '/babyfotos-wien/': 'client/src/pages/fotoshootings/BabyfotosWienPage.tsx',
  '/baby-fotografie-wien/': 'client/src/pages/fotoshootings/BabyFotografieWienPage.tsx',
  '/schwangerschaftsfotos-wien/': 'client/src/pages/fotoshootings/SchwangerschaftsfotosWienPage.tsx',
  '/kinder-fotografie-wien/': 'client/src/pages/fotoshootings/KinderFotografieWienPage.tsx',
  '/familien-fotoshooting-wien/': 'client/src/pages/fotoshootings/FamilienFotoshootingWienPage.tsx',
  '/bewerbungsfotos-wien/': 'client/src/pages/fotoshootings/BewerbungsfotosWienPage.tsx',
  '/teamfotos-wien/': 'client/src/pages/fotoshootings/TeamfotosWienPage.tsx',
  '/eventfotografie-wien/': 'client/src/pages/fotoshootings/EventfotografieWienPage.tsx',
  '/portrait-fotografie-wien/': 'client/src/pages/fotoshootings/PortraitfotografieWienPage.tsx',
  '/produkt-fotografie-wien/': 'client/src/pages/fotoshootings/ProduktfotografieWienPage.tsx',
  '/immobilien-fotografie-wien/': 'client/src/pages/fotoshootings/ImmobilienfotografieWienPage.tsx',
  '/preise/': 'client/src/pages/support/PreisePage.tsx',
  '/warteliste/': 'client/src/pages/WartelistePage.tsx',
  '/portfolio/': 'client/src/pages/PortfolioPage.tsx',
  '/gutschein/': 'client/src/pages/GutscheinPage.tsx',
  '/ueber-uns/': 'client/src/pages/support/UeberUnsPage.tsx',
  '/kundenstimmen/': 'client/src/pages/support/KundenstimmenPage.tsx',
  '/faq/': 'client/src/pages/support/FAQPage.tsx',
};

// Gather outbound links from each page by reading its source file + shared SEO components
// We treat RelatedPages, RelatedServices, PillarLinksBlock, ContextualLinks as shared contributors
function getSharedLinks() {
  const sharedFiles = [
    'client/src/components/SEO/RelatedPages.tsx',
    'client/src/components/SEO/RelatedServices.tsx',
    'client/src/components/SEO/PillarLinksBlock.tsx',
    'client/src/components/SEO/ContextualLinks.tsx',
  ];
  const result = {};
  for (const rel of sharedFiles) {
    const full = path.join(repoRoot, rel);
    if (fs.existsSync(full)) result[rel] = fs.readFileSync(full, 'utf8');
  }
  return result;
}

const shared = getSharedLinks();

function extractLinksFromText(text) {
  // Match to="/path/", href="/path/", or object props to: '/x/', href: '/x/', path: '/x/'
  const re = /(?:to|href|path)\s*[=:]\s*["']([^"'#?]+?)["']/g;
  const links = new Set();
  let m;
  while ((m = re.exec(text)) !== null) {
    let p = m[1];
    if (!p.startsWith('/')) continue;
    // Normalize trailing slash
    if (!p.endsWith('/')) p = p + '/';
    links.add(p);
  }
  return links;
}

// For a page, outbound = (links in its own file) ∪ (its bucket from SITE_LINKS / CONTEXTS) ∪ always-footer
// We approximate: links from own source file + links from any CONTEXTS/SITE_LINKS section tagged with its path
function getPageOutbound(page) {
  const out = new Set();
  const rel = PAGE_FILE_MAP[page];
  if (rel) {
    const full = path.join(repoRoot, rel);
    if (fs.existsSync(full)) {
      const text = fs.readFileSync(full, 'utf8');
      for (const l of extractLinksFromText(text)) out.add(l);
    }
  }
  // Extract that page's bucket. Handles both array-literal and object-literal buckets.
  const extractBucket = (source, key) => {
    // Find key, then grab everything up to the matching closing bracket
    const startRe = new RegExp(`['"]${key.replace(/[/\-]/g, '\\$&')}['"]\\s*:\\s*([\\[{])`);
    const m = source.match(startRe);
    if (!m) return '';
    const opener = m[1];
    const closer = opener === '[' ? ']' : '}';
    let depth = 0;
    let i = m.index + m[0].length - 1;
    const start = i;
    for (; i < source.length; i++) {
      const c = source[i];
      if (c === opener) depth++;
      else if (c === closer) {
        depth--;
        if (depth === 0) return source.slice(start, i + 1);
      }
    }
    return '';
  };
  for (const file of ['RelatedPages.tsx', 'ContextualLinks.tsx', 'RelatedServices.tsx']) {
    const key = `client/src/components/SEO/${file}`;
    const src = shared[key] || '';
    const bucket = extractBucket(src, page);
    if (bucket) {
      for (const l of extractLinksFromText(bucket)) out.add(l);
    }
  }
  // PillarLinksBlock always shows all pillar/cluster links – if page imports it, add them
  if (rel && fs.existsSync(path.join(repoRoot, rel))) {
    const src = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
    if (src.includes('PillarLinksBlock')) {
      const pb = shared['client/src/components/SEO/PillarLinksBlock.tsx'] || '';
      for (const l of extractLinksFromText(pb)) out.add(l);
    }
  }
  // Layout footer/header navigation (shared across ALL pages)
  const layout = fs.existsSync(path.join(repoRoot, 'client/src/components/layout/Layout.tsx'))
    ? fs.readFileSync(path.join(repoRoot, 'client/src/components/layout/Layout.tsx'), 'utf8')
    : '';
  for (const l of extractLinksFromText(layout)) out.add(l);
  // Remove self-links
  out.delete(page);
  return out;
}

// Compute outbound map
const outboundMap = {};
for (const p of PAGES) outboundMap[p] = getPageOutbound(p);

// Compute inbound map
const inboundMap = {};
for (const p of PAGES) inboundMap[p] = new Set();
for (const [src, outs] of Object.entries(outboundMap)) {
  for (const dst of outs) {
    if (inboundMap[dst]) inboundMap[dst].add(src);
  }
}

// ===== Blueprint checks =====
let totalFail = 0;
console.log('\n=== IA-Compliance Audit ===\n');
console.log(`${'Page'.padEnd(35)} OUT  IN  Pillar Sibs Preise Warte Status`);
console.log('-'.repeat(90));

for (const p of PAGES) {
  const out = outboundMap[p];
  const inb = inboundMap[p];
  const pillar = findPillar(p);
  const isPillar = Object.keys(PILLARS).includes(p);

  const pillarOK = !pillar || out.has(pillar);
  const siblingCount = pillar
    ? PILLARS[pillar].filter((s) => s !== p && out.has(s)).length
    : (isPillar ? PILLARS[p].filter((c) => out.has(c)).length : 0);
  const preiseOK = p === '/preise/' || out.has('/preise/');
  const wartelisteOK = p === '/warteliste/' || out.has('/warteliste/');

  // Cluster pages: must link to pillar + 2+ siblings + preise + warteliste
  // Support/conversion pages: just need outbound + inbound thresholds + preise/warteliste
  const isClusterChild = Boolean(pillar);
  const sibsRequired = isClusterChild || isPillar ? 2 : 0;
  const inRequired = isClusterChild || isPillar ? 5 : 1;

  const meetsOut = out.size >= 5;
  const meetsIn = inb.size >= inRequired;
  const meetsSibs = siblingCount >= sibsRequired;

  // Homepage exemption: nothing inbounds to homepage except Layout logo (handled outside)
  const skipInCheck = p === '/';

  const pass = meetsOut && (skipInCheck || meetsIn) && pillarOK && meetsSibs && preiseOK && wartelisteOK;
  if (!pass) totalFail++;

  console.log(
    `${p.padEnd(35)} ${String(out.size).padStart(3)}  ${String(inb.size).padStart(3)}  ` +
      `${pillarOK ? '  ✓  ' : '  ✗  '}  ${String(siblingCount).padStart(2)}   ` +
      `${preiseOK ? '  ✓ ' : '  ✗ '}  ${wartelisteOK ? '  ✓ ' : '  ✗ '}  ${pass ? 'PASS' : 'FAIL'}`
  );
}

console.log('\n' + '='.repeat(90));
console.log(totalFail === 0 ? '✅ ALL PAGES PASS' : `❌ ${totalFail} page(s) failed`);
console.log('='.repeat(90) + '\n');

// Print "Rome" pages specifically
console.log('=== High-authority ("Rome") pages — should receive the most links ===\n');
const romes = ['/familienfotos-wien/', '/business-portrait-wien/', '/preise/', '/warteliste/', '/portfolio/'];
for (const r of romes) {
  console.log(`${r.padEnd(35)} inbound: ${inboundMap[r]?.size || 0}`);
}
console.log();

process.exit(totalFail === 0 ? 0 : 1);
