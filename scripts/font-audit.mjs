// Walks every visible text-bearing element on a live page and groups them by the
// font-family the browser actually resolved. Computed style, not source — the whole
// point is to see past the cascade rather than reason about it.
import puppeteer from 'puppeteer';

const URL = process.argv[2] || 'https://togninja.onrender.com/';

// No puppeteer-managed Chrome on this machine; use the installed one.
const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 });
await new Promise((r) => setTimeout(r, 2500));

const report = await page.evaluate(() => {
  const groups = new Map();
  const els = document.querySelectorAll('body *');
  for (const el of els) {
    // Only elements that themselves render text, not containers.
    const own = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3 && n.textContent.trim())
      .map((n) => n.textContent.trim())
      .join(' ');
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || !el.getClientRects().length) continue;
    const fam = cs.fontFamily;
    if (!groups.has(fam)) groups.set(fam, []);
    groups.get(fam).push({
      tag: el.tagName.toLowerCase(),
      cls: (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 70),
      text: own.slice(0, 60),
    });
  }
  return {
    htmlFont: getComputedStyle(document.documentElement).fontFamily,
    bodyFont: getComputedStyle(document.body).fontFamily,
    themeScoped: !!document.querySelector('.tn-theme'),
    groups: Array.from(groups.entries())
      .map(([fam, items]) => ({ fam, count: items.length, sample: items.slice(0, 6) }))
      .sort((a, b) => b.count - a.count),
  };
});

console.log(`\nURL            : ${URL}`);
console.log(`html font-family: ${report.htmlFont}`);
console.log(`body font-family: ${report.bodyFont}`);
console.log(`.tn-theme present: ${report.themeScoped}`);
console.log(`\nDISTINCT RESOLVED FONT STACKS: ${report.groups.length}\n`);
for (const g of report.groups) {
  console.log(`  [${String(g.count).padStart(3)} els] ${g.fam}`);
  for (const s of g.sample) console.log(`         <${s.tag}${s.cls ? ` class="${s.cls}"` : ''}> ${JSON.stringify(s.text)}`);
  console.log('');
}

await browser.close();
