// Fix Backblaze B2 URLs to use friendly format
require('dotenv').config();
const database = require('./database.js');

// Convert S3-style URL to friendly URL
function convertToFriendlyUrl(url) {
  if (!url || !url.includes('backblazeb2.com')) return url;
  
  // Match pattern: https://BUCKET.s3.REGION.backblazeb2.com/KEY
  const match = url.match(/https:\/\/([^.]+)\.s3\.[^.]+\.backblazeb2\.com\/(.+)/);
  if (match) {
    const bucket = match[1];
    const key = match[2];
    return `https://f003.backblazeb2.com/file/${bucket}/${key}`;
  }
  
  return url;
}

async function fixUrls() {
  try {
    console.log('🔧 Fetching all voucher products...');
    const products = await database.getVoucherProducts();
    
    let updated = 0;
    for (const product of products) {
      const needsUpdate = (product.image_url && product.image_url.includes('.s3.')) || 
                          (product.thumbnail_url && product.thumbnail_url.includes('.s3.'));
      
      if (needsUpdate) {
        const newImageUrl = convertToFriendlyUrl(product.image_url);
        const newThumbnailUrl = convertToFriendlyUrl(product.thumbnail_url);
        
        console.log(`\n📝 Updating: ${product.name}`);
        console.log(`   Old Image: ${product.image_url}`);
        console.log(`   New Image: ${newImageUrl}`);
        if (product.thumbnail_url) {
          console.log(`   Old Thumb: ${product.thumbnail_url}`);
          console.log(`   New Thumb: ${newThumbnailUrl}`);
        }
        
        await database.updateVoucherProduct(product.id, {
          image_url: newImageUrl,
          thumbnail_url: newThumbnailUrl
        });
        
        updated++;
      }
    }
    
    console.log(`\n✅ Updated ${updated} product(s) with friendly URLs`);
    console.log('🌐 Images are now accessible from public bucket!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

fixUrls();
