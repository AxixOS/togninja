import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});

async function addPdfUrlColumn() {
  console.log('\n🔨 Adding pdf_url column to voucher_sales table...\n');

  try {
    // Stores the public S3 URL of the exact personalized voucher PDF generated at
    // purchase time, so admins can download/print the precise voucher for hard-copy shipping.
    await pool.query(`
      ALTER TABLE voucher_sales
      ADD COLUMN IF NOT EXISTS pdf_url TEXT
    `);
    console.log('✅ Added pdf_url column');

    console.log('\n🎉 pdf_url column added successfully!\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

addPdfUrlColumn();
