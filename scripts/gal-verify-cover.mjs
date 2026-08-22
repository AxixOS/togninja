// Does the cover the studio designed actually reach the client's screen?
//
// Two separate closed loops:
//
//  1. galleries.cover_template stored 24 templates' worth of choices — overlay, title
//     size, typeface, text position — and GalleryPage.tsx never referenced the column.
//     The client saw a plain image with the title in one hardcoded style
//     (text-6xl / font-light / tracking-[0.3em] uppercase) whichever template was chosen.
//
//  2. ThemeScope applies the studio's nine-preset theme to the public site from Layout.
//     The gallery route is a bare <GalleryPage /> outside Layout, so the theme stopped at
//     the gallery door and every studio delivered the same grey page.
//
// Both were invisible to a build and to any static check: the code compiled, the column
// was written, the component existed. Only rendering the page shows it.
//
// Run: node scripts/gal-verify-cover.mjs [baseUrl]
import 'dotenv/config';
import pg from 'pg';
import puppeteer from 'puppeteer';

const BASE = process.argv[2] || 'http://localhost:5199';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
for (let i = 0; ; i++) {
  try { await db.connect(); break; }
  catch (e) { if (i >= 6) throw e; await new Promise((r) => setTimeout(r, 2500)); }
}

// A template deliberately far from the old hardcoded look: the title should come out
// BOLD and tight, not light and letterspaced, and the overlay cinematic rather than flat.
const TEMPLATE = {
  templateId: 'verify-bold',
  textPosition: 'center',
  textAlignment: 'center',
  overlay: 'cinematic',
  titleSize: 'xxlarge',
  showSubtitle: false,
  showButton: false,
  buttonStyle: 'solid',
  fontStyle: 'bold',
  imageStyle: 'full',
};

let galleryId = null;
let browser = null;
try {
  const r = await db.query(
    `INSERT INTO galleries (title, slug, is_public, is_password_protected, cover_image, cover_template, status)
     VALUES ('Cover Probe', 'cover-probe', false, false, 'https://example.invalid/cover.jpg', $1, 'ACTIVE')
     RETURNING id`,
    [JSON.stringify(TEMPLATE)]);
  galleryId = r.rows[0].id;

  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(`${BASE}/gallery/cover-probe`, { waitUntil: 'networkidle2', timeout: 60000 });
  // The cover renders on the unauthenticated login screen, which is the point: it is the
  // first thing a client sees.
  await page.waitForSelector('h1', { timeout: 20000 });

  const seen = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    return {
      themeScope: Boolean(document.querySelector('.tn-theme')),
      h1Class: h1 ? h1.className : '',
      h1Text: h1 ? h1.textContent.trim() : '',
      // Any element carrying the cinematic overlay's gradient classes.
      overlay: Boolean(document.querySelector('[class*="from-black/80"]')),
      bodyFont: getComputedStyle(document.body).fontFamily,
      themeBg: getComputedStyle(document.documentElement).getPropertyValue('--tn-primary').trim()
        || getComputedStyle(document.querySelector('.tn-theme') || document.body).getPropertyValue('--tn-primary').trim(),
    };
  });

  console.log('\n=== the studio theme reaches the gallery ===');
  check('a .tn-theme scope is present', seen.themeScope);
  check('the theme defines --tn-primary', Boolean(seen.themeBg), seen.themeBg || 'not set');
  check('the body font is not the old Poppins default',
    !/Poppins/i.test(seen.bodyFont), seen.bodyFont.slice(0, 60));

  console.log('\n=== the chosen cover template reaches the gallery ===');
  check('the title renders', seen.h1Text.length > 0, seen.h1Text);
  // fontStyle 'bold' -> "font-bold tracking-tight"; the old hardcoded look was
  // "font-light tracking-[0.3em] uppercase".
  check('the title uses the template typeface (bold)', /font-bold/.test(seen.h1Class), seen.h1Class);
  check('...and not the old hardcoded one', !/font-light/.test(seen.h1Class));
  check('...and not the old hardcoded letterspacing', !/tracking-\[0\.3em\]/.test(seen.h1Class));
  // titleSize 'xxlarge' -> text-6xl on desktop.
  check('the title uses the template size (xxlarge)', /text-6xl/.test(seen.h1Class));
  check('the cinematic overlay is applied', seen.overlay);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (galleryId) await db.query('DELETE FROM galleries WHERE id = $1', [galleryId]).catch(() => {});
  await db.end().catch(() => {});
}

console.log(bad ? `\n  ${bad} CHECK(S) FAILED\n` : '\n  ALL CHECKS PASSED — the designed cover and the studio theme both reach the client\n');
process.exit(bad ? 1 : 0);
