import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

async function removePlaceholderImages() {
  console.log('🗑️  Removing placeholder images from voucher_products...');
  
  try {
    // List of placeholder image domains to remove
    const placeholderDomains = [
      'i.imgur.com',
      'i.postimg.cc',
      'postimg.cc',
      'imgur.com',
      'via.placeholder.com',
      'placehold.co',
      'unsplash.com/photos' // Only remove direct unsplash links, not CDN
    ];
    
    // Build SQL to check for any of these domains
    const domainChecks = placeholderDomains.map(domain => 
      `image_url LIKE '%${domain}%' OR thumbnail_url LIKE '%${domain}%' OR promo_image_url LIKE '%${domain}%'`
    ).join(' OR ');
    
    // First, show what will be deleted
    const checkQuery = `
      SELECT id, name, image_url, thumbnail_url, promo_image_url 
      FROM voucher_products 
      WHERE ${domainChecks}
    `;
    
    const checkResult = await pool.query(checkQuery);
    
    if (checkResult.rows.length === 0) {
      console.log('✅ No placeholder images found in database');
      return;
    }
    
    console.log(`📋 Found ${checkResult.rows.length} vouchers with placeholder images:`);
    checkResult.rows.forEach((row: any) => {
      console.log(`  - ${row.name}`);
      if (row.image_url) console.log(`    imageUrl: ${row.image_url}`);
      if (row.thumbnail_url) console.log(`    thumbnailUrl: ${row.thumbnail_url}`);
      if (row.promo_image_url) console.log(`    promoImageUrl: ${row.promo_image_url}`);
    });
    
    // Remove placeholder images (set to NULL) - simpler approach
    const updateQuery = `
      UPDATE voucher_products 
      SET 
        image_url = NULL,
        thumbnail_url = NULL,
        promo_image_url = NULL,
        updated_at = NOW()
      WHERE ${domainChecks}
      RETURNING id, name
    `;
    
    const updateResult = await pool.query(updateQuery);
    
    console.log(`✅ Removed placeholder images from ${updateResult.rows.length} vouchers:`);
    updateResult.rows.forEach((row: any) => {
      console.log(`  - ${row.name}`);
    });
    
    console.log('🎉 Cleanup completed successfully!');
    console.log('ℹ️  You can now upload proper images through the admin panel');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

removePlaceholderImages().catch(console.error);

