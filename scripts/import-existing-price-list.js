/*
  Import the existing price list data from client/src/data/priceList.ts into the database
  This script will populate the price_list_items table with the current data
*/

const fetch = require('node-fetch');

// Import the existing price list data
const PRICE_LIST = [
  // DIGITAL Category
  {
    id: 'digital-1',
    category: 'DIGITAL',
    name: '1 Bild',
    description: '1 Digitales Bild',
    price: 35,
    currency: 'EUR'
  },
  {
    id: 'digital-10',
    category: 'DIGITAL',
    name: '10x Paket',
    description: '10 Digitale Bilder Paket',
    price: 295,
    currency: 'EUR'
  },
  {
    id: 'digital-15',
    category: 'DIGITAL',
    name: '15x Paket',
    description: '15 Digitale Bilder Paket',
    price: 365,
    currency: 'EUR'
  },
  {
    id: 'digital-20',
    category: 'DIGITAL',
    name: '20x Paket',
    description: '20 Digitale Bilder Paket',
    price: 395,
    currency: 'EUR',
    notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis'
  },
  {
    id: 'digital-25',
    category: 'DIGITAL',
    name: '25x Paket',
    description: '25 Digitale Bilder Paket',
    price: 445,
    currency: 'EUR',
    notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis'
  },
  {
    id: 'digital-30',
    category: 'DIGITAL',
    name: '30x Paket',
    description: '30 Digitale Bilder Paket',
    price: 490,
    currency: 'EUR',
    notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis'
  },
  {
    id: 'digital-35',
    category: 'DIGITAL',
    name: '35x Paket',
    description: '35 Digitale Bilder Paket',
    price: 525,
    currency: 'EUR',
    notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis'
  },
  {
    id: 'digital-all',
    category: 'DIGITAL',
    name: 'Alle Porträts',
    description: 'Alle Porträts Insgesamt',
    price: 595,
    currency: 'EUR',
    notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis'
  },

  // CANVAS Category
  {
    id: 'canvas-a4',
    category: 'CANVAS',
    name: '30 x 20cm (A4)',
    description: 'Canvas 30 x 20cm (A4 Format)',
    price: 75,
    currency: 'EUR'
  },
  {
    id: 'canvas-a3',
    category: 'CANVAS',
    name: '40 x 30cm (A3)',
    description: 'Canvas 40 x 30cm (A3 Format)',
    price: 105,
    currency: 'EUR'
  },
  {
    id: 'canvas-a2',
    category: 'CANVAS',
    name: '60 x 40cm (A2)',
    description: 'Canvas 60 x 40cm (A2 Format)',
    price: 145,
    currency: 'EUR'
  },
  {
    id: 'canvas-70x50',
    category: 'CANVAS',
    name: '70 x 50cm',
    description: 'Canvas 70 x 50cm',
    price: 185,
    currency: 'EUR'
  },

  // LUXURY FRAME Category
  {
    id: 'luxury-a2',
    category: 'LUXURY_FRAME',
    name: 'A2 Leinwand Holzrahmen',
    description: 'A2 (60 x 40cm) Leinwand in schwarzem Holzrahmen',
    price: 199,
    currency: 'EUR'
  },
  {
    id: 'luxury-40x40',
    category: 'LUXURY_FRAME',
    name: '40 x 40cm Bildrahmen',
    description: '40 x 40cm Bildrahmen',
    price: 145,
    currency: 'EUR'
  },

  // PRINT Category
  {
    id: 'print-15x10',
    category: 'PRINT',
    name: '15 x 10cm',
    description: 'Print 15 x 10cm',
    price: 35,
    currency: 'EUR'
  },
  {
    id: 'print-10er-box',
    category: 'PRINT',
    name: '10er 15 x 10cm + Box',
    description: '10er 15 x 10cm + Geschenkbox',
    price: 300,
    currency: 'EUR'
  },
  {
    id: 'print-a4',
    category: 'PRINT',
    name: '20 x 30cm (A4)',
    description: 'Print 20 x 30cm (A4 Format)',
    price: 59,
    currency: 'EUR'
  },
  {
    id: 'print-a3',
    category: 'PRINT',
    name: '30 x 40cm (A3)',
    description: 'Print 30 x 40cm (A3 Format)',
    price: 79,
    currency: 'EUR'
  },

  // EXTRAS Category
  {
    id: 'extras-shooting',
    category: 'EXTRAS',
    name: 'Shooting ohne Gutschein',
    description: 'Shooting ohne Gutschein',
    price: 95,
    currency: 'EUR',
    notes: 'Kostenlose Versand'
  }
];

async function importPriceList() {
  const serverUrl = process.env.SERVER_URL || 'http://localhost:3001';
  const importUrl = `${serverUrl}/api/crm/price-list/import`;
  
  console.log('📋 Importing existing price list data to database...');
  console.log(`Server URL: ${importUrl}`);
  
  // Transform the data to match the database schema
  const items = PRICE_LIST.map(item => ({
    name: item.name,
    description: item.description,
    category: item.category,
    price: item.price.toString(),
    currency: item.currency,
    taxRate: '19.00',
    unit: 'piece',
    notes: item.notes || '',
    isActive: true
  }));
  
  try {
    const response = await fetch(importUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Price list imported successfully!');
    console.log(`Imported ${items.length} items`);
    console.log('Response:', result);
    
  } catch (error) {
    console.error('❌ Failed to import price list:', error.message);
    console.log('\n💡 Make sure the server is running on port 3001');
    console.log('Start the server with: npm run dev or node full-server.js');
    process.exit(1);
  }
}

importPriceList();