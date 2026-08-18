// Finds CTAs whose text colour equals their own background — the "solid block with no
// label" bug. Reports every button/link with its computed pair and contrast ratio.
import puppeteer from 'puppeteer';

const URL = process.argv[2] || 'http://localhost:5199/';
const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 });
await new Promise((r) => setTimeout(r, 2500));

const rows = await page.evaluate(() => {
  const lum = (c) => {
    const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  // Walk up for the first painted background. A gradient lives in background-IMAGE and
  // leaves background-color transparent, so colour-only walking reports the page behind
  // it — which made every gradient CTA look like white-on-white. Report those separately
  // rather than scoring them: a two-stop gradient has no single background colour.
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return { gradient: true };
      const b = cs.backgroundColor;
      if (b && !/rgba\(.*,\s*0\)/.test(b) && b !== 'transparent') return { color: b };
      n = n.parentElement;
    }
    return { color: 'rgb(255,255,255)' };
  };
  const out = [];
  for (const el of document.querySelectorAll('a, button')) {
    const text = (el.textContent || '').trim();
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    const bg = bgOf(el);
    if (bg.gradient) { out.push({ text: text.slice(0, 32) || '(NO TEXT)', fg: cs.color, bg: 'gradient', ratio: null }); continue; }
    let ratio = null;
    try {
      const [l1, l2] = [lum(cs.color), lum(bg.color)].sort((a, b) => b - a);
      ratio = Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
    } catch { /* non-rgb */ }
    out.push({
      text: text.slice(0, 32) || '(NO TEXT)',
      fg: cs.color, bg: bg.color, ratio,
      where: `${el.tagName.toLowerCase()}.${String(el.className || '').split(/\s+/).slice(0, 3).join('.')}`,
    });
  }
  return out;
});

const bad = rows.filter((r) => r.ratio !== null && r.ratio < 1.6);
console.log(`\n${URL}\n${rows.length} links/buttons examined.\n`);
console.log(`INVISIBLE OR NEAR-INVISIBLE (contrast < 1.6:1): ${bad.length}\n`);
for (const b of bad) console.log(`  ${String(b.ratio).padStart(5)}:1  ${JSON.stringify(b.text)}  fg=${b.fg} bg=${b.bg}`);
const empty = rows.filter((r) => r.text === '(NO TEXT)');
console.log(`\nRENDERING WITH NO TEXT AT ALL: ${empty.length}`);
for (const e of empty) console.log(`     ${e.where || '?'}  bg=${e.bg}`);
const grad = rows.filter((r) => r.bg === 'gradient');
console.log(`\nON A GRADIENT (not scored — no single background colour): ${grad.length}`);
for (const g of grad) console.log(`     ${JSON.stringify(g.text)}  fg=${g.fg}`);
await browser.close();
process.exit(bad.length ? 1 : 0);
