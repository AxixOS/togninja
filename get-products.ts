import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function getProducts() {
  try {
    const products = await sql`SELECT id, name, price FROM voucher_products LIMIT 5`;
    console.log('\n📦 Available Voucher Products:\n');
    products.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} - €${p.price}`);
      console.log(`   ID: ${p.id}\n`);
    });
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

getProducts();
