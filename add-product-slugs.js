// Add slugs to all voucher products for SEO-friendly URLs
require('dotenv').config();
const database = require('./database.js');

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function addSlugs() {
  try {
    console.log('📝 Fetching all voucher products...');
    const products = await database.getVoucherProducts();
    
    let updated = 0;
    for (const product of products) {
      if (!product.slug) {
        const slug = generateSlug(product.name);
        
        console.log(`\n📌 Adding slug to: ${product.name}`);
        console.log(`   Slug: ${slug}`);
        
        await database.updateVoucherProduct(product.id, { slug });
        updated++;
      } else {
        console.log(`✓ ${product.name} already has slug: ${product.slug}`);
      }
    }
    
    console.log(`\n✅ Added slugs to ${updated} product(s)`);
    console.log('🌐 Voucher detail pages will now work!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

addSlugs();
