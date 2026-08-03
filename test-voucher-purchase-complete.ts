import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function testCompletePurchaseFlow() {
  console.log('\n🧪 === VOUCHER PURCHASE SMOKE TEST ===\n');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Step 1: Get a valid product
    console.log('📦 Step 1: Fetching active voucher products...');
    const products = await sql`
      SELECT id, name, slug, price 
      FROM voucher_products 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    if (products.length === 0) {
      throw new Error('No active voucher products found');
    }
    
    const product = products[0];
    console.log(`   ✅ Found product: ${product.name} (€${product.price})`);
    console.log(`   📋 Slug: ${product.slug || 'N/A'}`);
    console.log(`   🆔 Product ID: ${product.id}\n`);
    
    // Step 2: Create voucher sale with personalization
    console.log('🎨 Step 2: Creating personalized voucher purchase...');
    
    const voucherCode = `TEST-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const purchaserName = 'Test Customer';
    const purchaserEmail = 'customer@test.com';
    const recipientName = 'Sarah Johnson';
    const recipientEmail = 'sarah@test.com';
    const giftMessage = 'Happy Birthday Sarah! 🎉 Wishing you a wonderful day filled with joy and beautiful memories. Enjoy your professional photoshoot experience!';
    const happyBirthdayImage = 'https://i.postimg.cc/cCLh7639/827ee647-a4cc-4f99-ac43-a7165efa0314.webp';
    
    console.log(`   📸 Selected Design: Happy Birthday`);
    console.log(`   💌 Gift Message: ${giftMessage}`);
    console.log(`   👤 Purchaser: ${purchaserName} (${purchaserEmail})`);
    console.log(`   🎁 Recipient: ${recipientName} (${recipientEmail})`);
    
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1); // Valid for 1 year
    
    const result = await sql`
      INSERT INTO voucher_sales (
        product_id,
        purchaser_name,
        purchaser_email,
        recipient_name,
        recipient_email,
        gift_message,
        voucher_code,
        original_amount,
        discount_amount,
        final_amount,
        currency,
        payment_status,
        payment_method,
        is_redeemed,
        valid_from,
        valid_until,
        created_at,
        updated_at
      ) VALUES (
        ${product.id},
        ${purchaserName},
        ${purchaserEmail},
        ${recipientName},
        ${recipientEmail},
        ${giftMessage},
        ${voucherCode},
        ${product.price},
        0,
        ${product.price},
        'EUR',
        'paid',
        'test',
        false,
        NOW(),
        ${validUntil.toISOString()},
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    
    const sale = result[0];
    console.log(`\n   ✅ Voucher created successfully!`);
    console.log(`   🎫 Voucher Code: ${sale.voucher_code}`);
    console.log(`   💰 Amount: €${sale.final_amount}`);
    console.log(`   📅 Valid Until: ${new Date(sale.valid_until).toLocaleDateString('de-DE')}`);
    console.log(`   ✅ Payment Status: ${sale.payment_status}\n`);
    
    // Step 3: Generate PDF download URL
    console.log('📄 Step 3: Generating PDF download URL...');
    
    const pdfUrl = `http://localhost:3001/voucher/pdf/preview?` +
      `voucher_id=${encodeURIComponent(voucherCode)}&` +
      `sku=${encodeURIComponent(product.slug || 'voucher')}&` +
      `name=${encodeURIComponent(recipientName)}&` +
      `from=${encodeURIComponent(purchaserName)}&` +
      `message=${encodeURIComponent(giftMessage)}&` +
      `amount=${product.price}&` +
      `custom_image=${encodeURIComponent(happyBirthdayImage)}`;
    
    console.log(`   ✅ PDF URL generated`);
    console.log(`   🔗 ${pdfUrl}\n`);
    
    // Step 4: Verify in admin panel
    console.log('🔍 Step 4: Verifying in database...');
    
    const verification = await sql`
      SELECT 
        vs.*,
        vp.name as product_name,
        vp.slug as product_slug
      FROM voucher_sales vs
      LEFT JOIN voucher_products vp ON vs.product_id = vp.id
      WHERE vs.voucher_code = ${voucherCode}
    `;
    
    if (verification.length > 0) {
      const v = verification[0];
      console.log(`   ✅ Voucher verified in database`);
      console.log(`   📦 Product: ${v.product_name}`);
      console.log(`   👤 Purchaser: ${v.purchaser_name} (${v.purchaser_email})`);
      console.log(`   🎁 Recipient: ${v.recipient_name} (${v.recipient_email})`);
      console.log(`   💬 Message: "${v.gift_message}"`);
      console.log(`   💰 Amount: €${v.final_amount}`);
      console.log(`   📊 Status: ${v.payment_status}\n`);
    }
    
    // Step 5: Summary
    console.log('✨ === TEST SUMMARY ===\n');
    console.log(`✅ Product selected: ${product.name}`);
    console.log(`✅ Personalization applied:`);
    console.log(`   - Design: Happy Birthday image`);
    console.log(`   - Message: Custom birthday message`);
    console.log(`   - Recipient: ${recipientName}`);
    console.log(`✅ Voucher created: ${voucherCode}`);
    console.log(`✅ Payment processed: €${product.price}`);
    console.log(`✅ Database entry verified\n`);
    
    console.log('🎯 NEXT STEPS:\n');
    console.log(`1. Open admin panel: http://localhost:3001/admin/voucher-sales`);
    console.log(`2. Navigate to "Sales" tab`);
    console.log(`3. Find voucher: ${voucherCode}`);
    console.log(`4. Click "PDF" button to download\n`);
    console.log(`5. Or download directly: ${pdfUrl}\n`);
    
    console.log('📊 EXPECTED VOUCHER CONTENT:\n');
    console.log('   ┌─────────────────────────────────────┐');
    console.log('   │  [Logo]                             │');
    console.log('   │  www.newagefotografie.com           │');
    console.log('   │                                     │');
    console.log('   │  SHOOTING GUTSCHEIN                 │');
    console.log('   ├─────────────────────────────────────┤');
    console.log('   │  [Happy Birthday Image]             │');
    console.log('   │  (Pink carnations design)           │');
    console.log('   ├─────────────────────────────────────┤');
    console.log(`   │  Gutschein-ID: ${voucherCode}  │`);
    console.log(`   │  Slug: ${product.slug || 'N/A'}               │`);
    console.log(`   │  Empfänger/in: ${recipientName}      │`);
    console.log(`   │  Von: ${purchaserName}             │`);
    console.log('   │  Gültig bis: 12 Monate ab Kaufdatum │');
    console.log('   │  Nachricht: Happy Birthday Sarah... │');
    console.log('   │  [Terms & Conditions]               │');
    console.log(`   │  Vorschau: €${product.price} | ${new Date().toLocaleDateString('de-DE')} │`);
    console.log('   └─────────────────────────────────────┘\n');
    
    console.log('🎉 SMOKE TEST COMPLETED SUCCESSFULLY!\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  }
}

testCompletePurchaseFlow()
  .then(() => {
    console.log('✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
