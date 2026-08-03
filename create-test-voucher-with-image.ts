import axios from 'axios';

const API_BASE = 'http://localhost:3001';

async function createTestVoucher() {
  try {
    console.log('🎂 Creating demo voucher with Birthday cake image...\n');

    const response = await axios.post(`${API_BASE}/api/test/create-demo-voucher-purchase`, {
      purchaserEmail: 'test@example.com',
      purchaserName: 'Test Customer',
      recipientEmail: 'recipient@example.com',
      recipientName: 'Lucky Recipient',
      giftMessage: 'Happy Birthday! Enjoy your photo shoot! 🎉',
      amount: 399,
      productId: null,
      customImage: 'https://i.postimg.cc/cCLh7639/827ee647-a4cc-4f99-ac43-a7165efa0314.webp',
      designImage: null
    });

    console.log('✅ Voucher Created Successfully!\n');
    console.log('📋 Details:');
    console.log(`   Voucher Code: ${response.data.voucherCode}`);
    console.log(`   Amount: €${response.data.amount}`);
    console.log(`   Custom Image: ${response.data.customImage}`);
    console.log(`   Message: ${response.data.giftMessage}`);
    console.log('\n🔗 Test the PDF:');
    console.log(`   http://localhost:3001/api/vouchers/${response.data.voucherCode}/pdf`);
    console.log('\n✨ Image should appear in the top 50% of the voucher PDF!');

  } catch (error: any) {
    console.error('❌ Error creating test voucher:', error.response?.data || error.message);
  }
}

createTestVoucher();
