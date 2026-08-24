// Turn the platform's Prodigi pricing sheet into a starter catalogue that ships in the image.
//
// WHY THIS EXISTS. print_products has been empty since the feature shipped, and it was
// always going to be: a photographer will not create a Prodigi account, export a pricing
// sheet and import it before they have seen a single print product. The catalogue has to
// be there on day one or it will never be there at all.
//
// WHY IT CANNOT BE FETCHED LIVE. Prodigi has no endpoint that lists the catalogue. Their
// v4 API offers GET /products/{sku} — which needs a SKU you already know — and a photobook
// spine calculator. The catalogue is a download under "Pricing sheets" in the dashboard.
// So there is nothing to call at boot.
//
// WHY THE SKUs ARE NOT WRITTEN INTO THIS FILE. Inventing plausible-looking SKUs would be
// worse than an empty shop: each one would 404 at Prodigi the moment a studio tried to
// order, and they would find out at the checkout rather than at the catalogue. Every SKU
// here comes from a real exported sheet.
//
// ── USAGE (the platform owner, once, and again whenever Prodigi reprices) ──────
//
//   PRODIGI_PLATFORM_API_KEY=... node scripts/build-starter-catalogue.mjs path/to/sheet.csv
//
// Writes server/data/starter-print-catalogue.json, which is COMMITTED and therefore
// present in every instance built from this image. New studios get a populated shop with
// no key, no upload and no setup; connecting their own Prodigi account is then required
// only to SELL (see server/lib/prodigiAccount.ts for why that split exists).
import fs from 'fs';
import path from 'path';

const sheetPath = process.argv[2];
if (!sheetPath) {
  console.error('\n  Usage: node scripts/build-starter-catalogue.mjs <pricing-sheet.csv>\n');
  console.error('  Export it from the Prodigi dashboard under "Pricing sheets".\n');
  process.exit(1);
}
if (!fs.existsSync(sheetPath)) {
  console.error(`\n  No such file: ${sheetPath}\n`);
  process.exit(1);
}

const { parseProdigiSheet } = await import('../server/lib/prodigiSheet.js').catch(async () => {
  // The lib is TypeScript; run through tsx when called directly.
  console.error('\n  Run this with tsx so the TypeScript parser can be imported:\n');
  console.error('    npx tsx scripts/build-starter-catalogue.mjs <sheet.csv>\n');
  process.exit(1);
});

const raw = fs.readFileSync(sheetPath, 'utf8');
const parsed = parseProdigiSheet(raw);

if (!parsed.rows.length) {
  console.error('\n  The sheet parsed to zero rows. Check it is the pricing sheet export,');
  console.error('  not the product catalogue page.\n');
  if (parsed.problems?.length) for (const p of parsed.problems) console.error('    ' + p);
  process.exit(1);
}

const apiKey = (process.env.PRODIGI_PLATFORM_API_KEY || '').trim();
if (!apiKey) {
  console.log('\n  No PRODIGI_PLATFORM_API_KEY set — writing names and prices from the sheet');
  console.log('  alone, without Prodigi product details (dimensions, description).\n');
}

const baseUrl = (process.env.PRODIGI_PLATFORM_ENV || 'production') === 'production'
  ? 'https://api.prodigi.com/v4.0'
  : 'https://api.sandbox.prodigi.com/v4.0';

// Sequential, deliberately. Prodigi rate-limits, and a burst of concurrent lookups is how
// building a starter catalogue turns into a temporary ban on the platform's own account.
const products = [];
const failed = [];
for (const row of parsed.rows) {
  let detail = { name: row.label || row.sku, description: '', widthInches: null, heightInches: null, attributes: {} };
  if (apiKey) {
    try {
      const r = await fetch(`${baseUrl}/products/${encodeURIComponent(row.sku)}`, {
        headers: { 'X-API-Key': apiKey },
      });
      if (r.ok) {
        const j = await r.json();
        const p = j?.product || j;
        detail = {
          name: p?.description || detail.name,
          description: p?.productDimensions ? `${p.description || ''}`.trim() : '',
          widthInches: p?.productDimensions?.width ?? null,
          heightInches: p?.productDimensions?.height ?? null,
          attributes: p?.attributes || {},
        };
      } else {
        failed.push(`${row.sku} — Prodigi returned ${r.status}`);
        continue;
      }
    } catch (e) {
      failed.push(`${row.sku} — ${e?.message || 'lookup failed'}`);
      continue;
    }
  }

  products.push({
    sku: row.sku,
    name: detail.name,
    description: detail.description || null,
    category: row.category || null,
    // COST, not a sell price. The markup is applied per studio at seed time, so one
    // studio's margin never ships inside another studio's catalogue.
    cost: row.cost ?? null,
    currency: row.currency || 'GBP',
    widthInches: detail.widthInches,
    heightInches: detail.heightInches,
    attributes: detail.attributes || {},
  });
}

const out = {
  // Stamped so an instance can tell whether its catalogue predates a Prodigi reprice.
  // Passed in rather than read from the clock, because this file is committed and a
  // rebuild that only changes a timestamp is noise in every diff.
  builtFrom: path.basename(sheetPath),
  enriched: !!apiKey,
  count: products.length,
  products,
};

const dir = 'server/data';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const target = path.join(dir, 'starter-print-catalogue.json');
fs.writeFileSync(target, JSON.stringify(out, null, 2));

console.log(`\n  ${products.length} product(s) written to ${target}`);
if (parsed.problems?.length) {
  console.log(`  ${parsed.problems.length} row(s) the parser could not read:`);
  for (const p of parsed.problems.slice(0, 5)) console.log('    ' + p);
}
if (failed.length) {
  console.log(`\n  ${failed.length} SKU(s) Prodigi did not recognise and were LEFT OUT:`);
  for (const f of failed.slice(0, 8)) console.log('    ' + f);
  console.log('  A SKU that 404s here would 404 at checkout, which is a worse place to find out.');
}
console.log('\n  Commit this file. Every instance built from the image ships with it.\n');
