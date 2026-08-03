import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { desc } from 'drizzle-orm';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

const db = drizzle(pool);

async function checkVoucherSales() {
  try {
    console.log('📊 Checking voucher sales and coupon codes...\n');
    
    const { voucherSales } = await import('./shared/schema.js');
    
    // Get all voucher sales
    const sales = await db
      .select()
      .from(voucherSales)
      .orderBy(desc(voucherSales.createdAt))
      .limit(10);
    
    console.log(`Found ${sales.length} recent voucher sales:\n`);
    
    sales.forEach((sale, i) => {
      console.log(`${i + 1}. Sale #${sale.id}`);
      console.log(`   Customer: ${sale.purchaserName} (${sale.purchaserEmail})`);
      console.log(`   Amount: €${sale.finalAmount}`);
      console.log(`   Coupon Code: ${sale.couponCode || 'NONE'}`);
      console.log(`   Payment Status: ${sale.paymentStatus}`);
      console.log(`   Created: ${sale.createdAt}`);
      console.log('');
    });
    
    // Get coupon code statistics
    console.log('\n📈 Coupon Code Statistics:\n');
    
    const couponStats = {};
    const allSales = await db.select().from(voucherSales);
    
    allSales.forEach(sale => {
      const code = sale.couponCode || 'NO_COUPON';
      if (!couponStats[code]) {
        couponStats[code] = { count: 0, totalRevenue: 0, sales: [] };
      }
      couponStats[code].count++;
      couponStats[code].totalRevenue += parseFloat(sale.finalAmount || 0);
      couponStats[code].sales.push({
        id: sale.id,
        customer: sale.purchaserName,
        amount: sale.finalAmount,
        date: sale.createdAt
      });
    });
    
    Object.entries(couponStats)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([code, stats]) => {
        console.log(`${code}:`);
        console.log(`  Uses: ${stats.count}`);
        console.log(`  Total Revenue: €${stats.totalRevenue.toFixed(2)}`);
        console.log(`  Avg Order: €${(stats.totalRevenue / stats.count).toFixed(2)}`);
        console.log('');
      });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkVoucherSales();
