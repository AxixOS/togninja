// Check and fix mismatched voucher product slugs
require('dotenv').config();
const db = require('./database.js');

function generateSlug(name) {
  return name.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/&/g, 'und')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fixSlugs() {
  const products = await db.getVoucherProducts();
  const mismatched = [];
  
  for (const p of products) {
    const correctSlug = generateSlug(p.name);
    if (p.slug !== correctSlug) {
      console.log('MISMATCH: "' + p.name + '" has slug="' + p.slug + '" should be="' + correctSlug + '"');
      mismatched.push({ id: p.id, name: p.name, currentSlug: p.slug, correctSlug });
    } else {
      console.log('OK: "' + p.name + '" => "' + p.slug + '"');
    }
  }

  if (mismatched.length === 0) {
    console.log('\n✅ All slugs are correct!');
    return;
  }

  console.log('\n📝 Fixing ' + mismatched.length + ' mismatched slug(s)...');
  
  // Check for uniqueness conflicts before updating
  const allSlugs = products.map(p => p.slug);
  for (const m of mismatched) {
    let candidate = m.correctSlug;
    let i = 1;
    // Check against existing slugs (excluding the product being updated)
    while (products.some(p => p.id !== m.id && (p.slug === candidate || mismatched.some(mm => mm.id !== m.id && mm.correctSlug === candidate)))) {
      candidate = m.correctSlug + '-' + i++;
    }
    m.correctSlug = candidate;
    
    await db.updateVoucherProduct(m.id, { slug: m.correctSlug });
    console.log('  ✅ Updated "' + m.name + '" slug: "' + m.currentSlug + '" → "' + m.correctSlug + '"');
  }
  
  console.log('\n✅ All slugs fixed!');
}

fixSlugs().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
