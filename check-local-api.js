const fetch = require('node-fetch');

async function checkAPIs() {
  try {
    console.log('🔍 Checking Local API Data...\n');
    
    // Check vouchers
    const vouchersRes = await fetch('http://localhost:3001/api/vouchers/products');
    const vouchers = await vouchersRes.json();
    console.log(`📦 Voucher Products: ${vouchers.length} items`);
    if (vouchers.length > 0) {
      console.log('\nFirst voucher:');
      console.log('  Name:', vouchers[0].name);
      console.log('  Image URL:', vouchers[0].imageUrl || vouchers[0].image_url || 'NONE');
      console.log('  Hero Image:', vouchers[0].heroImage || vouchers[0].hero_image || 'NONE');
    }
    
    // Check homepage images
    const homepageRes = await fetch('http://localhost:3001/api/homepage/images');
    const homepage = await homepageRes.json();
    console.log(`\n🖼️ Homepage Images: ${homepage.length} items`);
    if (homepage.length > 0) {
      console.log('\nHomepage hero image:');
      const hero = homepage.find(img => img.section === 'hero');
      if (hero) {
        console.log('  URL:', hero.image_url || hero.url);
      }
      console.log('\nAll homepage image URLs:');
      homepage.forEach(img => {
        console.log(`  ${img.section}: ${img.image_url || img.url}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

checkAPIs();
