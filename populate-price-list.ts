import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Unified price guide population script
// Enhancements:
// 1. Ensures price_list_items table exists (idempotent)
// 2. Aligns "Shooting ohne Gutschein" category with legacy API (EXTRAS instead of SERVICES)
// 3. Adds savings notes for Christmas packages exactly as shown in provided price guide images
// 4. Skips insertion if SKU already exists (idempotent re-run safe)
// 5. Future: Could extend to update price changes automatically when price differs

const priceListProducts = [
  // PRINTS Category
  {
    name: '15 x 10cm Print',
    description: 'Professional photo print 15x10cm',
    category: 'PRINTS',
    price: '35.00',
    sku: 'PRINT-15X10',
    unit: 'piece'
  },
  {
    name: '10er 15 x 10cm + Gift Box',
    description: '10 prints 15x10cm with gift box',
    category: 'PRINTS',
    price: '300.00',
    sku: 'PRINT-15X10-10BOX',
    unit: 'set'
  },
  {
    name: '20 x 30cm Print (A4)',
    description: 'Professional photo print A4 size',
    category: 'PRINTS',
    price: '59.00',
    sku: 'PRINT-A4',
    unit: 'piece'
  },
  {
    name: '30 x 40cm Print (A3)',
    description: 'Professional photo print A3 size',
    category: 'PRINTS',
    price: '79.00',
    sku: 'PRINT-A3',
    unit: 'piece'
  },

  // LEINWAND (Canvas) Category
  {
    name: 'Leinwand 30 x 20cm (A4)',
    description: 'Canvas print A4 size',
    category: 'LEINWAND',
    price: '75.00',
    sku: 'CANVAS-A4',
    unit: 'piece'
  },
  {
    name: 'Leinwand 40 x 30cm (A3)',
    description: 'Canvas print A3 size',
    category: 'LEINWAND',
    price: '105.00',
    sku: 'CANVAS-A3',
    unit: 'piece'
  },
  {
    name: 'Leinwand 60 x 40cm (A2)',
    description: 'Canvas print A2 size',
    category: 'LEINWAND',
    price: '145.00',
    sku: 'CANVAS-A2',
    unit: 'piece'
  },
  {
    name: 'Leinwand 70 x 50cm',
    description: 'Large canvas print 70x50cm',
    category: 'LEINWAND',
    price: '185.00',
    sku: 'CANVAS-70X50',
    unit: 'piece'
  },

  // LUXUSRAHMEN (Luxury Frames) Category
  {
    name: 'A2 Leinwand in schwarzem Holzrahmen',
    description: 'A2 60x40cm canvas in black wooden frame',
    category: 'LUXUSRAHMEN',
    price: '199.00',
    sku: 'FRAME-A2-BLACK',
    unit: 'piece'
  },
  {
    name: '40 x 40cm Bildrahmen',
    description: '40x40cm picture frame',
    category: 'LUXUSRAHMEN',
    price: '145.00',
    sku: 'FRAME-40X40',
    unit: 'piece'
  },

  // DIGITAL Category
  {
    name: '1 Digital Image',
    description: 'Single high-resolution digital image',
    category: 'DIGITAL',
    price: '35.00',
    sku: 'DIGITAL-1',
    unit: 'image'
  },
  {
    name: '10x Digital Images Package',
    description: '10 high-resolution digital images',
    category: 'DIGITAL',
    price: '295.00',
    sku: 'DIGITAL-10',
    unit: 'package'
  },
  {
    name: '15x Digital Images Package',
    description: '15 high-resolution digital images',
    category: 'DIGITAL',
    price: '365.00',
    sku: 'DIGITAL-15',
    unit: 'package'
  },
  {
    name: '20x Digital Images Package',
    description: '20 high-resolution digital images',
    category: 'DIGITAL',
    price: '395.00',
    sku: 'DIGITAL-20',
    unit: 'package'
  },
  {
    name: '25x Digital Images Package',
    description: '25 high-resolution digital images',
    category: 'DIGITAL',
    price: '445.00',
    sku: 'DIGITAL-25',
    unit: 'package'
  },
  {
    name: '30x Digital Images Package',
    description: '30 high-resolution digital images',
    category: 'DIGITAL',
    price: '490.00',
    sku: 'DIGITAL-30',
    unit: 'package'
  },
  {
    name: '35x Digital Images Package',
    description: '35 high-resolution digital images',
    category: 'DIGITAL',
    price: '525.00',
    sku: 'DIGITAL-35',
    unit: 'package'
  },
  {
    name: 'Alle Porträts Insgesamt',
    description: 'All portraits from the session',
    category: 'DIGITAL',
    price: '595.00',
    sku: 'DIGITAL-ALL',
    unit: 'package'
  },

  // WEIHNACHTSSPECIALS (Christmas Specials / Gift Packages) Category
  {
    name: 'Weihnachtsspecial Paket 1',
    description: '10x 15cm x 10cm Prints, A4 (30cm x 20cm) Leinwand, A2 (60cm x 40cm) Leinwand',
    category: 'PACKAGES',
    price: '195.00',
    sku: 'XMAS-PKG-1',
    unit: 'package',
    notes: 'Einsparung berechnet aus einzeln bewerteten Elementen: 570€'
  },
  {
    name: 'Weihnachtsspecial Paket 2',
    description: 'A3 (40cm x 30cm) Leinwand, A2 (60cm x 40cm) Leinwand, 70cm x 50cm Leinwand',
    category: 'PACKAGES',
    price: '250.00',
    sku: 'XMAS-PKG-2',
    unit: 'package',
    notes: 'Einsparung berechnet aus einzeln bewerteten Elementen: 435€'
  },
  {
    name: 'Weihnachtsspecial Paket 3',
    description: '4x A3 (40cm x 30cm) Leinwände',
    category: 'PACKAGES',
    price: '295.00',
    sku: 'XMAS-PKG-3',
    unit: 'package',
    notes: 'Einsparung berechnet aus einzeln bewerteten Elementen: 420€'
  },

  // EXTRAS / SERVICES Category (align with legacy: category 'EXTRAS')
  {
    name: 'Shooting ohne Gutschein',
    description: 'Photo session without voucher',
    category: 'EXTRAS',
    price: '95.00',
    sku: 'SESSION-NO-VOUCHER',
    unit: 'session'
  }
];

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS price_list_items (
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
  )`;
}

async function populatePriceList() {
  try {
    console.log('\n🎨 Populating New Age Fotografie Price List...\n');
    await ensureTable();
    
    // First, check if items already exist
    const existing = await sql`SELECT COUNT(*) as count FROM price_list_items`;
    console.log(`📋 Current items in database: ${existing[0].count}`);
    
    let inserted = 0;
    let skipped = 0;
    
    for (const product of priceListProducts) {
      try {
        // Check if product with this SKU already exists
        const existingProduct = await sql`
          SELECT id FROM price_list_items 
          WHERE sku = ${product.sku}
        `;
        
        if (existingProduct.length > 0) {
          console.log(`⏭️  Skipped: ${product.name} (already exists)`);
          skipped++;
          continue;
        }
        
        // Insert new product (explicitly coerce numeric fields)
        await sql`
          INSERT INTO price_list_items (
            name, description, category, price, currency, 
            tax_rate, sku, unit, notes, is_active
          ) VALUES (
            ${product.name},
            ${product.description},
            ${product.category},
            ${product.price},
            'EUR',
            '19.00',
            ${product.sku},
            ${product.unit},
            ${product.notes || null},
            true
          )
        `;
        
        console.log(`✅ Added: ${product.name} - €${product.price}`);
        inserted++;
        
      } catch (error: any) {
        console.error(`❌ Error adding ${product.name}:`, error.message);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Added: ${inserted} products`);
    console.log(`   ⏭️  Skipped: ${skipped} products (already existed)`);
    console.log(`   📦 Total products: ${inserted + skipped}`);
    
    // Show category breakdown
    const categoryCount = await sql`
      SELECT category, COUNT(*) as count 
      FROM price_list_items 
      WHERE is_active = true
      GROUP BY category 
      ORDER BY category
    `;
    
    console.log('\n📂 Products by Category:');
    categoryCount.forEach((cat: any) => {
      console.log(`   ${cat.category}: ${cat.count} items`);
    });
    
    console.log('\n✅ Price list population complete!');
    console.log('🎯 These products are now available in your invoice creation interface.\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Failed to populate price list:', error);
    process.exit(1);
  }
}

populatePriceList();
