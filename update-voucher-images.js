const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

const imageMap = {
  // Event packages
  'Event Basic': 'https://i.postimg.cc/6QbV9Xhm/F-HRER-70x50-L.jpg',
  'Event Premium': 'https://i.postimg.cc/tRwx77yy/00009094.jpg',
  'Half-Day Event': 'https://i.postimg.cc/6QbV9Xhm/F-HRER-70x50-L.jpg',
  'Full-Day Event': 'https://i.postimg.cc/tRwx77yy/00009094.jpg',
  'Plus Team Event': 'https://i.postimg.cc/tRwx77yy/00009094.jpg',
  
  // Wedding packages
  'Hochzeit Basic': 'https://i.postimg.cc/tRwx77yy/00009094.jpg',
  'Hochzeit Premium': 'https://i.postimg.cc/tRwx77yy/00009094.jpg',
  'Standesamt Mini Hochzeit': 'https://i.postimg.cc/tRwx77yy/00009094.jpg',
  'Classic Hochzeit': 'https://i.postimg.cc/tRwx77yy/00009094.jpg',
  'Premium Day Hochzeit': 'https://i.postimg.cc/tRwx77yy/00009094.jpg',
  
  // Real Estate packages
  'Immobilien Basic': 'https://i.postimg.cc/BZK5GRPm/JAGSCHTITZ-A2-L.jpg',
  'Immobilien Premium': 'https://i.postimg.cc/BZK5GRPm/JAGSCHTITZ-A2-L.jpg',
  'Basic Immobilien': 'https://i.postimg.cc/BZK5GRPm/JAGSCHTITZ-A2-L.jpg',
  'Classic Immobilien': 'https://i.postimg.cc/BZK5GRPm/JAGSCHTITZ-A2-L.jpg',
  'Premium Immobilien': 'https://i.postimg.cc/BZK5GRPm/JAGSCHTITZ-A2-L.jpg',
  
  // Family packages
  'Family Basic': 'https://i.postimg.cc/bw7ZyvPK/Familienfotoshooting-im-Fotostudio-Wien-Krexner-2777.jpg',
  'Family Premium': 'https://i.postimg.cc/qRZCsv3s/00007581.jpg',
  'Family Deluxe': 'https://i.postimg.cc/hvdhVbgn/00480020.jpg',
  
  // Baby/Newborn packages
  'Mini Baby': 'https://i.postimg.cc/mDPBzYWS/0a9a256b76eacc28798f22b9d58219e5.jpg',
  'Klassik Baby': 'https://i.postimg.cc/SsHqWnyb/E70I3814.jpg',
  'Family & Baby Plus': 'https://i.postimg.cc/bw7ZyvPK/Familienfotoshooting-im-Fotostudio-Wien-Krexner-2777.jpg',
  'Newborn Basic': 'https://i.postimg.cc/mDPBzYWS/0a9a256b76eacc28798f22b9d58219e5.jpg',
  'Newborn Premium': 'https://i.postimg.cc/mDPBzYWS/0a9a256b76eacc28798f22b9d58219e5.jpg',
  'Newborn Deluxe': 'https://i.postimg.cc/SsHqWnyb/E70I3814.jpg',
  
  // Maternity packages
  'Maternity Studio': 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg',
  'Maternity Premium': 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg',
  'Maternity Outdoor': 'https://i.postimg.cc/VLdVWs9J/DSC00059.jpg',
  
  // Business packages
  'Express Headshot': 'https://i.postimg.cc/7LZM86Sz/expo-image.jpg',
  'Solo Pro': 'https://i.postimg.cc/7LZM86Sz/expo-image.jpg',
  'Brand Upgrade': 'https://i.postimg.cc/BZK5GRPm/JAGSCHTITZ-A2-L.jpg',
  
  // Portrait packages
  'Portrait Einzelperson': 'https://i.postimg.cc/7LZM86Sz/expo-image.jpg',
  'Portrait Premium': 'https://i.postimg.cc/7LZM86Sz/expo-image.jpg',
  'Headshot Mini Portrait': 'https://i.postimg.cc/7LZM86Sz/expo-image.jpg',
  'Portrait Classic': 'https://i.postimg.cc/7LZM86Sz/expo-image.jpg',
  'Editorial Session Portrait': 'https://i.postimg.cc/7LZM86Sz/expo-image.jpg'
};

async function updateVoucherImages() {
  console.log('🖼️  Starting voucher image update...\n');
  
  let updated = 0;
  let notFound = 0;
  
  for (const [productName, imageUrl] of Object.entries(imageMap)) {
    try {
      const result = await sql`
        UPDATE voucher_products 
        SET image_url = ${imageUrl}
        WHERE name = ${productName}
        RETURNING id, name
      `;
      
      if (result.length > 0) {
        console.log(`✅ Updated: ${productName}`);
        updated++;
      } else {
        console.log(`⏭️  Not found: ${productName}`);
        notFound++;
      }
    } catch (error) {
      console.error(`❌ Error updating ${productName}:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Update Summary:`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Not found: ${notFound}`);
  console.log('='.repeat(50));
}

updateVoucherImages().catch(console.error);
