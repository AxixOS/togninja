/*
  Direct database import of existing price list data
  Uses the same database connection as the server
*/

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const PRICE_LIST = [
  // DIGITAL Category
  { category: 'DIGITAL', name: '1 Bild', description: '1 Digitales Bild', price: 35, notes: '' },
  { category: 'DIGITAL', name: '10x Paket', description: '10 Digitale Bilder Paket', price: 295, notes: '' },
  { category: 'DIGITAL', name: '15x Paket', description: '15 Digitale Bilder Paket', price: 365, notes: '' },
  { category: 'DIGITAL', name: '20x Paket', description: '20 Digitale Bilder Paket', price: 395, notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis' },
  { category: 'DIGITAL', name: '25x Paket', description: '25 Digitale Bilder Paket', price: 445, notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis' },
  { category: 'DIGITAL', name: '30x Paket', description: '30 Digitale Bilder Paket', price: 490, notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis' },
  { category: 'DIGITAL', name: '35x Paket', description: '35 Digitale Bilder Paket', price: 525, notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis' },
  { category: 'DIGITAL', name: 'Alle Porträts', description: 'Alle Porträts Insgesamt', price: 595, notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis' },

  // CANVAS Category
  { category: 'CANVAS', name: '30 x 20cm (A4)', description: 'Canvas 30 x 20cm (A4 Format)', price: 75, notes: '' },
  { category: 'CANVAS', name: '40 x 30cm (A3)', description: 'Canvas 40 x 30cm (A3 Format)', price: 105, notes: '' },
  { category: 'CANVAS', name: '60 x 40cm (A2)', description: 'Canvas 60 x 40cm (A2 Format)', price: 145, notes: '' },
  { category: 'CANVAS', name: '70 x 50cm', description: 'Canvas 70 x 50cm', price: 185, notes: '' },

  // LUXURY FRAME Category
  { category: 'LUXURY_FRAME', name: 'A2 Leinwand Holzrahmen', description: 'A2 (60 x 40cm) Leinwand in schwarzem Holzrahmen', price: 199, notes: '' },
  { category: 'LUXURY_FRAME', name: '40 x 40cm Bildrahmen', description: '40 x 40cm Bildrahmen', price: 145, notes: '' },

  // PRINT Category
  { category: 'PRINT', name: '15 x 10cm', description: 'Print 15 x 10cm', price: 35, notes: '' },
  { category: 'PRINT', name: '10er 15 x 10cm + Box', description: '10er 15 x 10cm + Geschenkbox', price: 300, notes: '' },
  { category: 'PRINT', name: '20 x 30cm (A4)', description: 'Print 20 x 30cm (A4 Format)', price: 59, notes: '' },
  { category: 'PRINT', name: '30 x 40cm (A3)', description: 'Print 30 x 40cm (A3 Format)', price: 79, notes: '' },

  // EXTRAS Category
  { category: 'EXTRAS', name: 'Shooting ohne Gutschein', description: 'Shooting ohne Gutschein', price: 95, notes: 'Kostenlose Versand' }
];

async function importPriceList() {
  try {
    console.log('📋 Connecting to database...');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL not found in environment variables');
      process.exit(1);
    }
    
    const sql = neon(process.env.DATABASE_URL);
    console.log('✅ Database connection established');
    
    console.log(`📋 Importing ${PRICE_LIST.length} price list items...`);
    
    let imported = 0;
    let skipped = 0;
    
    for (const item of PRICE_LIST) {
      try {
        // Check if item already exists
        const existing = await sql`
          SELECT id FROM price_list_items 
          WHERE name = ${item.name} AND category = ${item.category}
        `;
        
        if (existing.length > 0) {
          console.log(`⏭️ Skipping existing item: ${item.name}`);
          skipped++;
          continue;
        }
        
        // Insert new item
        await sql`
          INSERT INTO price_list_items (
            name, description, category, price, currency, tax_rate, 
            unit, notes, is_active, created_at, updated_at
          ) VALUES (
            ${item.name}, 
            ${item.description}, 
            ${item.category}, 
            ${item.price}, 
            'EUR', 
            19.00, 
            'piece', 
            ${item.notes}, 
            true, 
            NOW(), 
            NOW()
          )
        `;
        
        console.log(`✅ Imported: ${item.name} (${item.category}) - €${item.price}`);
        imported++;
        
      } catch (itemError) {
        console.error(`❌ Failed to import ${item.name}:`, itemError.message);
      }
    }
    
    console.log(`\n🎉 Import completed!`);
    console.log(`✅ Imported: ${imported} items`);
    console.log(`⏭️ Skipped: ${skipped} items`);
    
    // Verify the import
    const totalItems = await sql`SELECT COUNT(*) as count FROM price_list_items WHERE is_active = true`;
    console.log(`📊 Total active price list items in database: ${totalItems[0].count}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

importPriceList();