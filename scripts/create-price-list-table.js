/*
  Create the price_list_items table directly using SQL
*/

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function createPriceListTable() {
  try {
    console.log('📋 Creating price_list_items table...');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL not found in environment variables');
      process.exit(1);
    }
    
    const sql = neon(process.env.DATABASE_URL);
    console.log('✅ Database connection established');
    
    // Create the table
    await sql`
      CREATE TABLE IF NOT EXISTS price_list_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        studio_id UUID,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        currency TEXT DEFAULT 'EUR',
        tax_rate DECIMAL(5,2) DEFAULT 19.00,
        sku TEXT,
        product_code TEXT,
        unit TEXT,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    console.log('✅ price_list_items table created successfully');
    
    // Check if table exists and has any data
    const tableExists = await sql`
      SELECT COUNT(*) as count FROM price_list_items
    `;
    
    console.log(`📊 Current price list items in table: ${tableExists[0].count}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Table creation failed:', error.message);
    process.exit(1);
  }
}

createPriceListTable();