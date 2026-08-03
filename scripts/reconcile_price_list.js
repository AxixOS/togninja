/*
  Reconcile price list items against legacy authoritative list.
  - Normalizes category names (PRINT -> PRINTS, CANVAS -> LEINWAND, LUXURY_FRAME -> LUXUSRAHMEN)
  - Adds any missing legacy items
  - Updates category of existing items that are misclassified
  - Skips duplicates (matching name + normalized category + price)
  - Supports DRY_RUN=1 environment variable for preview only

  Usage (PowerShell):
    $env:DRY_RUN="1"; node scripts/reconcile_price_list.js   # preview
    Remove-Item Env:DRY_RUN; node scripts/reconcile_price_list.js  # apply
*/

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const LEGACY_URL = SERVER_URL + '/api/crm/price-list/legacy';
const CURRENT_URL = SERVER_URL + '/api/crm/price-list';
const IMPORT_URL = SERVER_URL + '/api/crm/price-list/import';
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

async function main() {
  console.log(`\n🔄 Reconciling price list (DRY_RUN=${DRY_RUN})`);
  const legacy = await fetchJson(LEGACY_URL);
  const current = await fetchJson(CURRENT_URL);

  console.log(`📜 Legacy items: ${legacy.length}`);
  console.log(`🗄️ Current items: ${current.length}`);

  const normalizeCategory = c => {
    if (!c) return 'GENERAL';
    const u = c.toUpperCase();
    switch (u) {
      case 'PRINT': return 'PRINTS';
      case 'CANVAS': return 'LEINWAND';
      case 'LUXURY_FRAME': return 'LUXUSRAHMEN';
      case 'EXTRA': return 'EXTRAS';
      default: return u; // already expected form
    }
  };

  // Build lookup of current items by (name|normalizedCategory)
  const currentMap = new Map();
  current.forEach(item => {
    const key = keyFor(item.name, normalizeCategory(item.category));
    currentMap.set(key, item);
  });

  const toImport = []; // new items
  const toUpdate = []; // {id, patch}

  for (const li of legacy) {
    const normalizedCat = normalizeCategory(li.category);
    const key = keyFor(li.name, normalizedCat);
    const existing = currentMap.get(key);

    if (!existing) {
      // Missing entirely -> add
      toImport.push({
        name: li.name,
        description: li.description || '',
        category: normalizedCat,
        price: Number(li.price).toFixed(2),
        currency: li.currency || 'EUR',
        taxRate: '19.00',
        sku: '',
        productCode: '',
        unit: 'piece',
        notes: li.notes || '',
        isActive: li.is_active !== false
      });
      continue;
    }

    // Exists: check if category needs correction (legacy category mapping mismatches import-existing script)
    const existingCatNorm = normalizeCategory(existing.category);
    if (existingCatNorm !== normalizedCat) {
      toUpdate.push({ id: existing.id, patch: { category: normalizedCat } });
    }
  }

  console.log(`➕ Will import ${toImport.length} new items.`);
  console.log(`🛠️ Will update category for ${toUpdate.length} existing items.`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN REPORT ---');
    if (toImport.length) {
      console.log('\nNew Items Preview:');
      toImport.forEach(i => console.log(`  [NEW] ${i.category} | ${i.name} => €${i.price}`));
    }
    if (toUpdate.length) {
      console.log('\nUpdates Preview:');
      toUpdate.forEach(u => console.log(`  [UPDATE] id=${u.id} set category=${u.patch.category}`));
    }
    console.log('\nNo changes applied (DRY_RUN enabled).');
    return;
  }

  // Perform updates first (to stabilize categories)
  for (const upd of toUpdate) {
    try {
      const res = await fetch(CURRENT_URL + '/' + upd.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(upd.patch)
      });
      if (!res.ok) {
        console.warn(`  ⚠️ Failed update id=${upd.id} status=${res.status}`);
      } else {
        const data = await res.json();
        console.log(`  ✅ Updated category for ${data.name} -> ${data.category}`);
      }
    } catch (e) {
      console.warn(`  ❌ Update error id=${upd.id}: ${e.message}`);
    }
  }

  // Import new items in a single batch
  if (toImport.length) {
    try {
      const res = await fetch(IMPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: toImport })
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      console.log(`\n✅ Imported ${data.imported || toImport.length} new items.`);
    } catch (e) {
      console.error('❌ Import failed:', e.message);
    }
  }

  // Final listing count
  const final = await fetchJson(CURRENT_URL);
  console.log(`\n📦 Final active items count: ${final.length}`);
}

function keyFor(name, category) {
  return `${category}||${name}`.toLowerCase();
}

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`Failed to fetch ${url}: ${e.message}`);
    return [];
  }
}

// Polyfill fetch if needed
if (typeof fetch === 'undefined') {
  global.fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
