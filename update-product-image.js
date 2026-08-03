// Update Shooting Experience Gutschein with E7014014.jpg from Digital Files
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function updateProductImage() {
  try {
    console.log('🔍 Finding Shooting Experience Gutschein product...');
    
    // Find the product
    const products = await sql`
      SELECT id, name, image_url, thumbnail_url 
      FROM voucher_products 
      WHERE name ILIKE '%Shooting Experience%' 
      LIMIT 1
    `;
    
    if (!products || products.length === 0) {
      console.error('❌ Product not found');
      return;
    }
    
    const product = products[0];
    console.log('✅ Found product:', product.name, 'ID:', product.id);
    console.log('📷 Current image_url:', product.image_url);
    console.log('📷 Current thumbnail_url:', product.thumbnail_url);
    
    // Find the digital file
    console.log('\n🔍 Looking for E7014014.jpg in digital_files table...');
    const files = await sql`
      SELECT id, file_name, file_path, category, folder_name
      FROM digital_files 
      WHERE file_name ILIKE '%E7014014%'
      LIMIT 1
    `;
    
    if (!files || files.length === 0) {
      console.error('❌ E7014014.jpg not found in digital_files');
      console.log('\n💡 Using direct URL instead...');
      
      // Construct URL from your domain
      const imageUrl = 'https://workingnewage-2eecd723a444.herokuapp.com/uploads/E7014014.jpg';
      
      console.log('\n📝 Updating product with image URL:', imageUrl);
      
      const updated = await sql`
        UPDATE voucher_products 
        SET 
          image_url = ${imageUrl},
          thumbnail_url = ${imageUrl},
          updated_at = NOW()
        WHERE id = ${product.id}
        RETURNING *
      `;
      
      console.log('\n✅ Product updated successfully!');
      console.log('📷 New image_url:', updated[0].image_url);
      console.log('📷 New thumbnail_url:', updated[0].thumbnail_url);
      console.log('\n🌐 Product URL: https://workingnewage-2eecd723a444.herokuapp.com/admin/voucher-sales');
      
      return;
    }
    
    const file = files[0];
    console.log('✅ Found file:', file.file_name);
    console.log('📁 File path:', file.file_path);
    console.log('📂 Folder:', file.folder_name);
    console.log('🏷️ Category:', file.category);
    
    // Construct full URL
    let imageUrl;
    if (file.file_path && file.file_path.startsWith('http')) {
      imageUrl = file.file_path;
    } else if (file.file_path) {
      imageUrl = `https://workingnewage-2eecd723a444.herokuapp.com${file.file_path.startsWith('/') ? '' : '/'}${file.file_path}`;
    } else {
      imageUrl = `https://workingnewage-2eecd723a444.herokuapp.com/uploads/${file.file_name}`;
    }
    
    console.log('\n📝 Updating product with image URL:', imageUrl);
    
    const updated = await sql`
      UPDATE voucher_products 
      SET 
        image_url = ${imageUrl},
        thumbnail_url = ${imageUrl},
        updated_at = NOW()
      WHERE id = ${product.id}
      RETURNING *
    `;
    
    console.log('\n✅ Product updated successfully!');
    console.log('📷 New image_url:', updated[0].image_url);
    console.log('📷 New thumbnail_url:', updated[0].thumbnail_url);
    console.log('\n🌐 Product URL: https://workingnewage-2eecd723a444.herokuapp.com/admin/voucher-sales');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

updateProductImage();
