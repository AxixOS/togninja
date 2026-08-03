import { db } from '../lib/db';

async function checkProducts() {
  try {
    console.log('Checking for product-related tables...\n');
    
    const tablesResult = await db(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%product%' OR table_name LIKE '%price%' OR table_name LIKE '%invoice%')
      ORDER BY table_name
    `);
    
    console.log('Found tables:', JSON.stringify(tablesResult.rows, null, 2));
    
    // Check if we have invoice_items table with products
    const invoiceItemsCheck = await db(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'invoice_items'
    `);
    
    if (invoiceItemsCheck.rows.length > 0) {
      console.log('\nChecking invoice_items structure...');
      const columnsResult = await db(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoice_items'
        ORDER BY ordinal_position
      `);
      console.log('Columns:', JSON.stringify(columnsResult.rows, null, 2));
      
      // Check sample data
      const sampleData = await db(`
        SELECT description, quantity, unit_price 
        FROM invoice_items 
        LIMIT 5
      `);
      console.log('\nSample invoice items:', JSON.stringify(sampleData.rows, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

checkProducts();
