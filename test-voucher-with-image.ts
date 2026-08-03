import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

async function testVoucherWithImage() {
  console.log('\n🎨 === VOUCHER SYSTEM IMAGE TEST ===\n');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Get product
    const products = await sql`
      SELECT id, name, slug, price 
      FROM voucher_products 
      WHERE is_active = true 
      LIMIT 1
    `;
    
    if (products.length === 0) {
      throw new Error('No products found');
    }
    
    const product = products[0];
    const voucherCode = `IMAGE-TEST-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const happyBirthdayImage = 'https://i.postimg.cc/cCLh7639/827ee647-a4cc-4f99-ac43-a7165efa0314.webp';
    
    console.log('📦 Product:', product.name);
    console.log('💰 Price: €' + product.price);
    console.log('🎫 Voucher Code:', voucherCode);
    console.log('🖼️  Image URL:', happyBirthdayImage);
    console.log('');
    
    // Create voucher with image reference
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);
    
    await sql`
      INSERT INTO voucher_sales (
        product_id, purchaser_name, purchaser_email,
        recipient_name, recipient_email, gift_message,
        voucher_code, original_amount, discount_amount, final_amount,
        payment_status, valid_until, created_at, updated_at
      ) VALUES (
        ${product.id}, 'Image Test User', 'imagetest@test.com',
        'Birthday Person', 'birthday@test.com',
        'Happy Birthday! 🎉 Hope you have an amazing day filled with love and laughter!',
        ${voucherCode}, ${product.price}, 0, ${product.price},
        'paid', ${validUntil.toISOString()}, NOW(), NOW()
      )
    `;
    
    console.log('✅ Voucher created in database\n');
    
    // Test PDF generation with image
    console.log('📄 Testing PDF Generation with Image...\n');
    
    const pdfUrl = `http://localhost:3001/voucher/pdf/preview?` +
      `voucher_id=${encodeURIComponent(voucherCode)}&` +
      `sku=${encodeURIComponent(product.slug || 'voucher')}&` +
      `name=${encodeURIComponent('Birthday Person')}&` +
      `from=${encodeURIComponent('Image Test User')}&` +
      `message=${encodeURIComponent('Happy Birthday! 🎉 Hope you have an amazing day filled with love and laughter!')}&` +
      `amount=${product.price}&` +
      `custom_image=${encodeURIComponent(happyBirthdayImage)}`;
    
    console.log('🔗 PDF URL (with image):');
    console.log(pdfUrl);
    console.log('');
    
    // Test if image is accessible
    console.log('🧪 Testing if Happy Birthday image is accessible...');
    try {
      const imgResponse = await fetch(happyBirthdayImage);
      if (imgResponse.ok) {
        const contentType = imgResponse.headers.get('content-type');
        const contentLength = imgResponse.headers.get('content-length');
        console.log(`✅ Image accessible`);
        console.log(`   Type: ${contentType}`);
        console.log(`   Size: ${(parseInt(contentLength || '0') / 1024).toFixed(2)} KB`);
      } else {
        console.log(`❌ Image not accessible: ${imgResponse.status}`);
      }
    } catch (err) {
      console.log(`❌ Image fetch failed:`, err.message);
    }
    console.log('');
    
    // Test PDF endpoint
    console.log('🧪 Testing PDF generation endpoint...');
    try {
      const pdfResponse = await fetch(pdfUrl);
      if (pdfResponse.ok) {
        const contentType = pdfResponse.headers.get('content-type');
        console.log(`✅ PDF generates successfully`);
        console.log(`   Content-Type: ${contentType}`);
      } else {
        console.log(`❌ PDF generation failed: ${pdfResponse.status}`);
        const text = await pdfResponse.text();
        console.log(`   Error: ${text.substring(0, 200)}`);
      }
    } catch (err) {
      console.log(`❌ PDF request failed:`, err.message);
    }
    console.log('');
    
    console.log('✨ === TEST RESULTS ===\n');
    console.log(`✅ Voucher Code: ${voucherCode}`);
    console.log(`✅ Database record created`);
    console.log(`✅ Image URL configured: ${happyBirthdayImage}`);
    console.log(`✅ PDF URL generated with custom_image parameter`);
    console.log('');
    
    console.log('🎯 VERIFICATION STEPS:\n');
    console.log('1. Admin Panel Check:');
    console.log(`   → Open: http://localhost:3001/admin/voucher-sales`);
    console.log(`   → Find voucher: ${voucherCode}`);
    console.log(`   → Click PDF button`);
    console.log('');
    console.log('2. Expected PDF Content:');
    console.log('   ┌─────────────────────────────────────┐');
    console.log('   │  [Logo centered]                    │');
    console.log('   │  www.newagefotografie.com           │');
    console.log('   │  SHOOTING GUTSCHEIN                 │');
    console.log('   ├─────────────────────────────────────┤');
    console.log('   │  [HAPPY BIRTHDAY IMAGE HERE]        │');
    console.log('   │  Pink carnations with greeting      │');
    console.log('   │  (Should occupy top 50% of page)    │');
    console.log('   ├─────────────────────────────────────┤');
    console.log(`   │  Gutschein-ID: ${voucherCode}       │`);
    console.log('   │  Empfänger/in: Birthday Person      │');
    console.log('   │  Von: Image Test User               │');
    console.log('   │  Nachricht: Happy Birthday! 🎉...   │');
    console.log('   │  [Terms & Conditions]               │');
    console.log('   └─────────────────────────────────────┘');
    console.log('');
    console.log('3. Direct PDF Download:');
    console.log(`   → ${pdfUrl}`);
    console.log('');
    
    console.log('⚠️  CRITICAL CHECK:\n');
    console.log('□ PDF should display the Happy Birthday image at the top');
    console.log('□ Image should be centered and properly sized');
    console.log('□ Image should appear BEFORE the voucher details');
    console.log('□ All text should be readable below the image');
    console.log('');
    
    console.log('🎉 IMAGE TEST COMPLETE!\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  }
}

testVoucherWithImage()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
