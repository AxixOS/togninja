/**
 * UPDATE A SINGLE VOUCHER IMAGE
 * 
 * Usage: node update-single-voucher-image.js "Voucher Name" "https://your-image-url.com/image.jpg"
 * 
 * Example: node update-single-voucher-image.js "Familie Basic" "https://unsplash.com/photos/abc123"
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function updateVoucherImage() {
  const voucherName = process.argv[2];
  const imageUrl = process.argv[3];
  
  if (!voucherName || !imageUrl) {
    console.log('❌ Error: Please provide both voucher name and image URL');
    console.log('\nUsage:');
    console.log('  node update-single-voucher-image.js "Voucher Name" "https://image-url.com/image.jpg"');
    console.log('\nExample:');
    console.log('  node update-single-voucher-image.js "Familie Basic" "https://images.unsplash.com/photo-123"');
    process.exit(1);
  }
  
  console.log(`\n🔍 Looking for voucher: "${voucherName}"`);
  
  // First, find the voucher
  const vouchers = await sql`
    SELECT id, name, category FROM voucher_products
    WHERE name ILIKE ${`%${voucherName}%`}
  `;
  
  if (vouchers.length === 0) {
    console.log(`❌ No voucher found matching "${voucherName}"`);
    console.log('\n📋 Available vouchers:');
    
    const all = await sql`
      SELECT name, category FROM voucher_products
      ORDER BY category, name
    `;
    
    all.forEach(v => {
      console.log(`   - ${v.name} (${v.category})`);
    });
    
    process.exit(1);
  }
  
  if (vouchers.length > 1) {
    console.log(`⚠️  Multiple vouchers found matching "${voucherName}":`);
    vouchers.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.name} (${v.category})`);
    });
    console.log('\n💡 Please be more specific with the voucher name');
    process.exit(1);
  }
  
  const voucher = vouchers[0];
  console.log(`✅ Found: ${voucher.name} (${voucher.category})`);
  console.log(`📸 Setting image to: ${imageUrl}`);
  
  // Update the image
  await sql`
    UPDATE voucher_products
    SET image_url = ${imageUrl},
        updated_at = NOW()
    WHERE id = ${voucher.id}
  `;
  
  console.log('✅ Image updated successfully!');
  console.log(`\n🌐 Visit http://localhost:3001/vouchers to see the change`);
}

updateVoucherImage().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
