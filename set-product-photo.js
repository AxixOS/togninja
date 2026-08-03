// Direct update with E7014014.jpg URL
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function updateProductImage() {
  try {
    // Direct URL to the file from your uploads
    const imageUrl = 'https://workingnewage-2eecd723a444.herokuapp.com/my-archive/E7014014.jpg';
    
    console.log('📝 Updating Shooting Experience Gutschein with image:', imageUrl);
    
    const updated = await sql`
      UPDATE voucher_products 
      SET 
        image_url = ${imageUrl},
        thumbnail_url = ${imageUrl},
        updated_at = NOW()
      WHERE name ILIKE '%Shooting Experience%'
      RETURNING id, name, image_url, thumbnail_url
    `;
    
    if (updated.length > 0) {
      console.log('\n✅ Product updated successfully!');
      console.log('🆔 Product ID:', updated[0].id);
      console.log('📦 Product name:', updated[0].name);
      console.log('📷 Image URL:', updated[0].image_url);
      console.log('\n🌐 View at: https://workingnewage-2eecd723a444.herokuapp.com/admin/voucher-sales');
    } else {
      console.log('❌ No product found matching "Shooting Experience"');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateProductImage();
