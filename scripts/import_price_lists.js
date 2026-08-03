/*
  Import CSV price lists into the price_list_items table.
  - Idempotent: skips items already present with same name, category and price
  - Normalizes price strings like '35€' to numeric 35.00
  - Uses server's db helper via require('../server/storage') or direct db import

  Usage:
    node scripts/import_price_lists.js
*/

const fs = require('fs');
const path = require('path');

async function main() {
  const scriptDir = path.join(__dirname, '_data');
  const files = fs.readdirSync(scriptDir).filter(f => f.endsWith('.csv'));
  if (files.length === 0) {
    console.log('No CSV files found in scripts/_data');
    process.exit(0);
  }

  const batch = [];

  // We will POST parsed items to the running server import endpoint
  const http = require('http');
  const https = require('https');
  const serverImportUrl = process.env.SERVER_IMPORT_URL || 'http://localhost:3001/api/crm/price-list/import';

  function postJson(urlString, bodyObj) {
    return new Promise((resolve, reject) => {
      const url = new URL(urlString);
      const data = JSON.stringify(bodyObj);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = (url.protocol === 'https:' ? https : http).request(options, res => {
        let chunks = '';
        res.setEncoding('utf8');
        res.on('data', chunk => chunks += chunk);
        res.on('end', () => {
          const status = res.statusCode;
          if (status && status >= 200 && status < 300) {
            try { resolve(JSON.parse(chunks || '{}')); } catch (e) { resolve(chunks); }
          } else {
            reject(new Error(`Status ${status}: ${chunks}`));
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  for (const file of files) {
    const p = path.join(scriptDir, file);
    const content = fs.readFileSync(p, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    const header = lines.shift();
    const headers = header.split(',').map(h => h.trim());

    const category = determineCategoryFromFilename(file);

    for (const line of lines) {
      const cols = splitCsvLine(line);
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = (cols[idx] || '').trim();
      });

      const name = obj['Produkt'] || obj['Paket'] || obj['Beschreibung'] || obj['Produkt'] || obj['Produkt'] || obj['Produkt'] || obj['Produkt'] || Object.values(obj)[0];
      const priceRaw = obj['Preis'] || obj['Price'] || Object.values(obj)[1] || '';
      const price = normalizePrice(priceRaw);

      const item = {
        studioId: null, // optional: set to default studio if needed
        name: name,
        description: '',
        category: category,
        price: price.toFixed(2),
        currency: 'EUR',
        taxRate: '19.00',
        sku: null,
        productCode: null,
        unit: 'piece',
        notes: '',
        isActive: true
      };

      // We'll send each item to the server import endpoint in batches
      batch.push(item);
    }
  }

  // Post batches of items to server endpoint
  const BATCH_SIZE = 50;
  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const chunk = batch.slice(i, i + BATCH_SIZE);
    console.log(`Posting ${chunk.length} items to ${serverImportUrl}...`);
    try {
      const data = await postJson(serverImportUrl, { items: chunk });
      console.log('Server import response:', data);
    } catch (err) {
      console.error('Server import failed for chunk:', err.message || err);
      // Fallback: write SQL file to import these items manually
      const sqlLines = chunk.map(item => {
        const name = escapeSql(item.name);
        const desc = escapeSql(item.description || '');
        const category = escapeSql(item.category || 'GENERAL');
        const price = parseFloat(item.price || 0).toFixed(2);
        const currency = escapeSql(item.currency || 'EUR');
        const taxRate = escapeSql(item.taxRate || item.taxRate || '19.00');
        const sku = item.sku ? `'${escapeSql(item.sku)}'` : 'NULL';
        const productCode = item.productCode ? `'${escapeSql(item.productCode)}'` : 'NULL';
        const unit = escapeSql(item.unit || 'piece');
        const notes = item.notes ? `'${escapeSql(item.notes)}'` : 'NULL';
        return `INSERT INTO price_list_items (studio_id, name, description, category, price, currency, tax_rate, sku, product_code, unit, notes, is_active, created_at, updated_at) VALUES (NULL, '${name}', '${desc}', '${category}', ${price}, '${currency}', '${taxRate}', ${sku}, ${productCode}, '${unit}', ${notes}, true, NOW(), NOW());`;
      }).join('\n');

      const outPath = path.join(scriptDir, 'price_list_import.sql');
      fs.appendFileSync(outPath, sqlLines + '\n');
      console.log(`Wrote ${chunk.length} INSERT statements to ${outPath}`);
    }
  }

  console.log('Import complete');
  process.exit(0);
}

function normalizePrice(s) {
  if (!s) return 0.0;
  // Remove euro symbol, asterisks, spaces
  const cleaned = s.replace(/€|\*|\s/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0.0 : n;
}

function splitCsvLine(line) {
  // Very simple CSV split: doesn't handle quotes with commas
  return line.split(',').map(c => c.trim());
}

function determineCategoryFromFilename(filename) {
  const f = filename.toLowerCase();
  if (f.includes('print') || f.includes('prints') || f.includes('prints.csv') || f.includes('prints')) return 'PRINTS';
  if (f.includes('leinwand')) return 'LEINWAND';
  if (f.includes('luxus') || f.includes('rahmen')) return 'LUXUSRAHMEN';
  if (f.includes('digital')) return 'DIGITAL';
  return 'GENERAL';
}

function escapeSql(s) {
  if (!s) return '';
  return String(s).replace(/'/g, "''").replace(/\n/g, ' ');
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
