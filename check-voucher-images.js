require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkVoucherImages() {
  console.log('🔍 Checking voucher product images...\n');
  
  const vouchers = await sql`
    SELECT id, name, category, session_type, image_url, thumbnail_url, promo_image_url
    FROM voucher_products
    ORDER BY category, name
  `;
  
  console.log(`Found ${vouchers.length} voucher products:\n`);
  
  vouchers.forEach((v, i) => {
    console.log(`${i + 1}. ${v.name}`);
    console.log(`   Category: ${v.category || 'none'}`);
    console.log(`   Session Type: ${v.session_type || 'none'}`);
    console.log(`   Image URL: ${v.image_url || '❌ NO IMAGE'}`);
    console.log(`   Thumbnail: ${v.thumbnail_url || '❌ NO THUMBNAIL'}`);
    console.log(`   Promo Image: ${v.promo_image_url || '❌ NO PROMO IMAGE'}`);
    console.log('');
  });
  
  const withImages = vouchers.filter(v => v.image_url);
  const withoutImages = vouchers.filter(v => !v.image_url);
  
  console.log('\n📊 SUMMARY:');
  console.log(`✅ Products WITH images: ${withImages.length}`);
  console.log(`❌ Products WITHOUT images: ${withoutImages.length}`);
  
  if (withImages.length > 0) {
    console.log('\n✅ Products that have images:');
    withImages.forEach(v => {
      console.log(`   - ${v.name}: ${v.image_url}`);
    });
  }
  
  if (withoutImages.length > 0) {
    console.log('\n❌ Products missing images:');
    withoutImages.forEach(v => {
      console.log(`   - ${v.name} (${v.category})`);
    });
  }
}

checkVoucherImages().catch(console.error);
