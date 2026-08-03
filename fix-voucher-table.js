// Fix voucher_products table to ensure all columns exist
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function fixVoucherTable() {
  console.log('🔧 Fixing voucher_products table...');
  
  try {
    // Check current table structure
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'voucher_products'
      ORDER BY ordinal_position;
    `;
    
    console.log('\n📋 Current columns:');
    columns.forEach(col => console.log(`  - ${col.column_name} (${col.data_type})`));
    
    // Add missing columns if they don't exist
    console.log('\n🔨 Adding any missing columns...');
    
    // These are the columns that should exist based on schema.ts
    const columnsToAdd = [
      { name: 'session_type', type: 'TEXT', check: false },
      { name: 'category', type: 'TEXT', check: false },
      { name: 'session_duration', type: 'INTEGER DEFAULT 60', check: false },
      { name: 'validity_period', type: 'INTEGER DEFAULT 1460', check: false },
      { name: 'redemption_instructions', type: 'TEXT', check: false },
      { name: 'terms_and_conditions', type: 'TEXT', check: false },
      { name: 'image_url', type: 'TEXT', check: false },
      { name: 'display_order', type: 'INTEGER DEFAULT 0', check: false },
      { name: 'featured', type: 'BOOLEAN DEFAULT false', check: false },
      { name: 'badge', type: 'TEXT', check: false },
      { name: 'is_active', type: 'BOOLEAN DEFAULT true', check: false },
      { name: 'stock_limit', type: 'INTEGER', check: false },
      { name: 'max_per_customer', type: 'INTEGER DEFAULT 5', check: false },
      { name: 'slug', type: 'TEXT', check: false },
      { name: 'meta_title', type: 'TEXT', check: false },
      { name: 'meta_description', type: 'TEXT', check: false },
      { name: 'original_price', type: 'DECIMAL(10,2)', check: false }
    ];
    
    for (const col of columnsToAdd) {
      try {
        await sql`
          ALTER TABLE voucher_products 
          ADD COLUMN IF NOT EXISTS ${sql(col.name)} ${sql.unsafe(col.type)}
        `;
        console.log(`  ✅ Added/verified column: ${col.name}`);
      } catch (err) {
        console.log(`  ⚠️  Column ${col.name}: ${err.message}`);
      }
    }
    
    // Check final structure
    const finalColumns = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'voucher_products'
      ORDER BY ordinal_position;
    `;
    
    console.log('\n✅ Final table structure:');
    finalColumns.forEach(col => {
      const defaultVal = col.column_default ? ` (default: ${col.column_default})` : '';
      console.log(`  - ${col.column_name}: ${col.data_type}${defaultVal}`);
    });
    
    console.log('\n🎉 Voucher table fix complete!');
    
  } catch (error) {
    console.error('❌ Error fixing table:', error);
    throw error;
  }
}

fixVoucherTable()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
