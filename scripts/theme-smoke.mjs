// Smoke every theme preset end to end: write it to the DB, let the server's 30s
// site-theme cache expire, render in a FRESH browser context with HTTP caching off,
// and read the computed pixels back.
//
// Three caches have each produced a false "the themes do nothing" before:
//   server/lib/site-theme.ts   30s in-process TTL
//   React Query                5min staleTime  -> new context per preset
//   the browser HTTP cache     -> setCacheEnabled(false) + new context
// And comparing fonts alone is not enough: six of the eight presets share one sans
// stack, so a font-only check reports "identical" for presets that differ in every
// colour. Compare the whole token set.
import pg from 'pg';
import fs from 'fs';
import puppeteer from 'puppeteer';
// Read the ids straight out of the source rather than importing a .ts module — the
// point is to smoke whatever presets the file actually declares, and a regex over the
// literal cannot drift from it.
const THEME_PRESETS = [...fs.readFileSync('shared/themePresets.ts','utf8')
  .matchAll(/^[ ]*id:[ ]*'([a-z0-9-]+)',/gm)].map((m) => ({ id: m[1] }));

const URL = process.argv[2] || 'http://localhost:5199/';
const line = fs.readFileSync('.env', 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
const pool = new pg.Pool({ connectionString: line.slice(13).trim().replace(/^["']|["']$/g, ''), max: 2, ssl: { rejectUnauthorized: false } });

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox'],
});

const before = (await pool.query('SELECT site_theme_preset FROM studio_configs LIMIT 1')).rows[0]?.site_theme_preset;
const rows = [];

for (const preset of THEME_PRESETS) {
  await pool.query('UPDATE studio_configs SET site_theme_preset = $1 WHERE TRUE', [preset.id]);
  await new Promise((r) => setTimeout(r, 34000)); // outlast the 30s server cache

  const ctx = await browser.createBrowserContext();      // fresh cookie/cache jar
  const page = await ctx.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise((r) => setTimeout(r, 3000));

  const m = await page.evaluate(() => {
    const cs = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e) : null; };
    const h1 = cs('h1');
    const scope = cs('.tn-theme');
    const btn = [...document.querySelectorAll('a,button')].find((e) => /bg-gradient|bg-purple/.test(e.className || ''));
    const card = [...document.querySelectorAll('.bg-white')].find((e) => e.getClientRects().length && e.clientWidth < 700);
    return {
      themeApplied: !!document.querySelector('.tn-theme'),
      h1Font: h1 ? h1.fontFamily.split(',')[0].replace(/["']/g, '') : null,
      h1Size: h1 ? h1.fontSize : null,
      h1Weight: h1 ? h1.fontWeight : null,
      h1Color: h1 ? h1.color : null,
      pageBg: scope ? scope.backgroundColor : null,
      primary: scope ? scope.getPropertyValue('--tn-primary').trim() : null,
      surface: scope ? scope.getPropertyValue('--tn-surface').trim() : null,
      raised: scope ? scope.getPropertyValue('--tn-raised').trim() : null,
      btnBg: btn ? (getComputedStyle(btn).backgroundImage !== 'none' ? 'gradient' : getComputedStyle(btn).backgroundColor) : null,
      cardBg: card ? getComputedStyle(card).backgroundColor : null,
      cardShadow: card ? (getComputedStyle(card).boxShadow || 'none').slice(0, 34) : null,
    };
  });
  await page.screenshot({ path: `./theme-${preset.id}.png` });
  await ctx.close();

  rows.push({ preset: preset.id, ...m });
  console.log(`  ${preset.id.padEnd(10)} bg=${String(m.pageBg).padEnd(20)} primary=${String(m.primary).padEnd(9)} h1=${m.h1Size}/${m.h1Weight} ${m.h1Font}`);
}

await pool.query('UPDATE studio_configs SET site_theme_preset = $1 WHERE TRUE', [before]);
await browser.close();
await pool.end();

// Distinctness: how many presets share an identical rendered fingerprint?
const fp = (r) => [r.pageBg, r.primary, r.surface, r.h1Font, r.h1Color].join('|');
const seen = new Map();
for (const r of rows) { const k = fp(r); seen.set(k, [...(seen.get(k) || []), r.preset]); }
console.log(`\n  ${rows.length} presets rendered, ${seen.size} visually distinct.`);
for (const [, group] of seen) if (group.length > 1) console.log(`    IDENTICAL: ${group.join(', ')}`);
console.log(`\n  theme scope present on every render: ${rows.every((r) => r.themeApplied)}`);
console.log(`  restored site_theme_preset to: ${JSON.stringify(before)}`);
