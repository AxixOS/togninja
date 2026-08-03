// Fetch Heroku's products and insert them into local database
require('dotenv').config();
const https = require('https');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('Step 1: Fetching products from Heroku...');

const options = {
  hostname: 'workingnewage-2eecd723a444.herokuapp.com',
  path: '/api/vouchers/products',
  method: 'GET'
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', async () => {
    try {
      const herokuProducts = JSON.parse(data);
      console.log(`✓ Fetched ${herokuProducts.length} products from Heroku\n`);
      
      console.log('Step 2: Clearing old products from local database...');
      await pool.query('DELETE FROM voucher_products WHERE is_active = true');
      console.log('✓ Cleared old products\n');
      
      console.log('Step 3: Inserting Heroku products into local database...');
      
      for (const product of herokuProducts) {
        try {
          await pool.query(`
            INSERT INTO voucher_products (
              id, name, description, price, category, 
              image_url, is_active, display_order, 
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              price = EXCLUDED.price,
              category = EXCLUDED.category,
              image_url = EXCLUDED.image_url,
              is_active = EXCLUDED.is_active,
              display_order = EXCLUDED.display_order,
              updated_at = NOW()
          `, [
            product.id,
            product.name,
            product.description || '',
            product.price,
            product.category || 'other',
            product.imageUrl,
            true,
            product.displayOrder || 0
          ]);
          console.log(`  ✓ Inserted: ${product.name}`);
        } catch (e) {
          console.error(`  ✗ Failed to insert ${product.name}:`, e.message);
        }
      }
      
      console.log(`\n✓ Successfully synced ${herokuProducts.length} products!`);
      console.log('\nVerifying...');
      
      const result = await pool.query('SELECT COUNT(*) FROM voucher_products WHERE is_active = true');
      console.log(`Local database now has ${result.rows[0].count} active products\n`);
      
      await pool.end();
      process.exit(0);
      
    } catch (e) {
      console.error('Error:', e.message);
      await pool.end();
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
  process.exit(1);
});

req.end();
