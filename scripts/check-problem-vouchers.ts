import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkProblemVouchers() {
  console.log('🔍 Checking problem vouchers in database...\n');
  try {
    const { rows } = await pool.query(`
      SELECT id, name, image_url, thumbnail_url, promo_image_url, updated_at
      FROM voucher_products
      WHERE name IN ('Family Deluxe', 'Newborn Basic', 'Klassik Baby')
      ORDER BY name;
    `);

    if (rows.length === 0) {
      console.log('❌ No matching vouchers found.');
      return;
    }

    console.log(`✅ Found ${rows.length} vouchers:\n`);
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.name} (ID: ${row.id})`);
      console.log(`   image_url: ${row.image_url || 'NULL'}`);
      console.log(`   thumbnail_url: ${row.thumbnail_url || 'NULL'}`);
      console.log(`   promo_image_url: ${row.promo_image_url || 'NULL'}`);
      console.log(`   updated_at: ${row.updated_at}\n`);
    });

  } catch (error) {
    console.error('❌ Query failed:', error);
  } finally {
    await pool.end();
  }
}

checkProblemVouchers().catch(console.error);

