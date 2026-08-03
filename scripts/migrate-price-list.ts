import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { priceListItems } from '../shared/schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = neon(connectionString);
const db = drizzle({ client: sql } as any);

async function main() {
  console.log('🔄 Creating price_list_items table...');
  
  // The table creation will be handled by Drizzle schema auto-generation
  // But let's seed with some initial data from the current hardcoded list
  
  const initialPriceListItems = [
    // PRINTS Section
    {
      name: '15 x 10cm',
      description: 'Print 15 x 10cm',
      category: 'PRINTS',
      price: '35.00',
      currency: 'EUR',
      productCode: 'print-15x10',
      isActive: true
    },
    {
      name: '10er 15 x 10cm + Gift Box',
      description: '10er 15 x 10cm + Geschenkbox',
      category: 'PRINTS',
      price: '300.00',
      currency: 'EUR',
      productCode: 'print-10er-box',
      isActive: true
    },
    {
      name: '20 x 30cm (A4)',
      description: 'Print 20 x 30cm (A4 Format)',
      category: 'PRINTS',
      price: '59.00',
      currency: 'EUR',
      productCode: 'print-20x30-a4',
      isActive: true
    },
    {
      name: '30 x 40cm (A3)',
      description: 'Print 30 x 40cm (A3 Format)',
      category: 'PRINTS',
      price: '79.00',
      currency: 'EUR',
      productCode: 'print-30x40-a3',
      isActive: true
    },

    // LEINWAND Section
    {
      name: '30 x 20cm (A4)',
      description: 'Leinwand 30 x 20cm (A4 Format)',
      category: 'LEINWAND',
      price: '75.00',
      currency: 'EUR',
      productCode: 'canvas-30x20-a4',
      isActive: true
    },
    {
      name: '40 x 30cm (A3)',
      description: 'Leinwand 40 x 30cm (A3 Format)',
      category: 'LEINWAND',
      price: '105.00',
      currency: 'EUR',
      productCode: 'canvas-40x30-a3',
      isActive: true
    },
    {
      name: '60 x 40cm (A2)',
      description: 'Leinwand 60 x 40cm (A2 Format)',
      category: 'LEINWAND',
      price: '145.00',
      currency: 'EUR',
      productCode: 'canvas-60x40-a2',
      isActive: true
    },
    {
      name: '70 x 50cm',
      description: 'Leinwand 70 x 50cm',
      category: 'LEINWAND',
      price: '185.00',
      currency: 'EUR',
      productCode: 'canvas-70x50',
      isActive: true
    },

    // DIGITAL Section
    {
      name: '1 Bild',
      description: '1 Digitales Bild',
      category: 'DIGITAL',
      price: '35.00',
      currency: 'EUR',
      productCode: 'digital-1-bild',
      isActive: true
    },
    {
      name: '10x Paket',
      description: '10 Digitale Bilder Paket',
      category: 'DIGITAL',
      price: '295.00',
      currency: 'EUR',
      productCode: 'digital-10x-paket',
      isActive: true
    },
    {
      name: '15x Paket',
      description: '15 Digitale Bilder Paket',
      category: 'DIGITAL',
      price: '365.00',
      currency: 'EUR',
      productCode: 'digital-15x-paket',
      isActive: true
    },
    {
      name: '20x Paket',
      description: '20 Digitale Bilder Paket',
      category: 'DIGITAL',
      price: '395.00',
      currency: 'EUR',
      productCode: 'digital-20x-paket',
      notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis',
      isActive: true
    }
  ];

  try {
    // Check if table has data already
    const existingItems = await db.select().from(priceListItems).limit(1);
    
    if (existingItems.length === 0) {
      console.log('📦 Seeding initial price list items...');
      await db.insert(priceListItems).values(initialPriceListItems);
      console.log(`✅ Successfully seeded ${initialPriceListItems.length} price list items`);
    } else {
      console.log('✅ Price list items already exist, skipping seeding');
    }
    
  } catch (error) {
    console.error('❌ Error migrating price list:', error);
    throw error;
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Price list migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Price list migration failed:', error);
      process.exit(1);
    });
}

export { main as migratePriceList };