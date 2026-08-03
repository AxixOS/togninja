import { db } from '../lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function createProductsTable() {
  try {
    console.log('Creating products table...\n');
    
    // Read and execute the SQL file
    const sql = readFileSync(join(__dirname, 'create-products-table.sql'), 'utf-8');
    
    await db(sql);
    
    console.log('✅ Products table created successfully!');
    console.log('✅ Default products inserted!');
    
    // Verify the products
    const result = await db('SELECT id, name, category, price FROM products ORDER BY category, sort_order');
    
    console.log('\nInserted products:');
    console.log(JSON.stringify(result.rows, null, 2));
    
  } catch (error) {
    console.error('Error creating products table:', error);
  } finally {
    process.exit();
  }
}

createProductsTable();
