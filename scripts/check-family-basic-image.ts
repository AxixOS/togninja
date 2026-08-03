import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkFamilyBasic() {
  console.log('🔍 Checking Family Basic voucher in database...\n');
  
  try {
    const { rows } = await pool.query(`
      SELECT id, name, image_url, thumbnail_url, promo_image_url
      FROM voucher_products
      WHERE name ILIKE '%Family Basic%'
      ORDER BY name;
    `);

    if (rows.length === 0) {
      console.log('❌ No "Family Basic" vouchers found');
      return;
    }

    console.log(`✅ Found ${rows.length} matching vouchers:\n`);
    rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.name} (ID: ${row.id})`);
      console.log(`   image_url: ${row.image_url || 'NULL'}`);
      console.log(`   thumbnail_url: ${row.thumbnail_url || 'NULL'}`);
      console.log(`   promo_image_url: ${row.promo_image_url || 'NULL'}`);
      console.log('');
    });

    // Show the latest updated row
    const { rows: latest } = await pool.query(`
      SELECT id, name, image_url, updated_at
      FROM voucher_products
      WHERE name ILIKE '%Family Basic%'
      ORDER BY updated_at DESC
      LIMIT 1;
    `);

    if (latest.length > 0) {
      console.log(`\n📅 Most recently updated "Family Basic":`);
      console.log(`   Name: ${latest[0].name}`);
      console.log(`   ID: ${latest[0].id}`);
      console.log(`   image_url: ${latest[0].image_url || 'NULL'}`);
      console.log(`   updated_at: ${latest[0].updated_at}`);
    }

  } catch (error) {
    console.error('❌ Query failed:', error);
  } finally {
    await pool.end();
  }
}

checkFamilyBasic().catch(console.error);

