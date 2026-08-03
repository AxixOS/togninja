import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function createPortfolioImagesTable() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);

  console.log('Creating portfolio_images table...');

  // Create the portfolio_images table
  await sql`
    CREATE TABLE IF NOT EXISTS portfolio_images (
      id SERIAL PRIMARY KEY,
      category VARCHAR(50) NOT NULL,
      url TEXT NOT NULL,
      alt TEXT,
      title TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  console.log('✅ portfolio_images table created successfully');

  // Create index on category for faster lookups
  await sql`
    CREATE INDEX IF NOT EXISTS idx_portfolio_images_category ON portfolio_images(category)
  `;

  console.log('✅ Index on category created');

  // Seed initial data from the hardcoded portfolioCategories
  const portfolioImages = [
    // Family
    { category: 'family', url: 'https://i.postimg.cc/gcKwDrqv/Baby-Pink-Bubbles-20x20.jpg', title: 'Family Joy', sort_order: 1 },
    { category: 'family', url: 'https://i.postimg.cc/J7bDNtGx/Familienportrat-Wien-Krchnavy-Stolz-0105-1024x683-1.jpg', title: 'Vienna Portraits', sort_order: 2 },
    { category: 'family', url: 'https://i.postimg.cc/wTdZVLdC/photo-grid.jpg', title: 'Family Grid', sort_order: 3 },
    { category: 'family', url: 'https://i.postimg.cc/gcKwDrqv/Baby-Pink-Bubbles-20x20.jpg', title: 'Playful Moments', sort_order: 4 },
    
    // Newborn
    { category: 'newborn', url: 'https://i.postimg.cc/43YQ9VD4/4-S8-A4770-105-1024x683-Copy.jpg', title: 'Newborn Dreams', sort_order: 1 },
    { category: 'newborn', url: 'https://i.postimg.cc/gcKwDrqv/Baby-Pink-Bubbles-20x20.jpg', title: 'Baby Bliss', sort_order: 2 },
    { category: 'newborn', url: 'https://i.postimg.cc/43YQ9VD4/4-S8-A4770-105-1024x683-Copy.jpg', title: 'Tiny Fingers', sort_order: 3 },
    { category: 'newborn', url: 'https://i.postimg.cc/gcKwDrqv/Baby-Pink-Bubbles-20x20.jpg', title: 'Sweet Slumber', sort_order: 4 },
    
    // Maternity
    { category: 'maternity', url: 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg', title: 'Expecting Beauty', sort_order: 1 },
    { category: 'maternity', url: 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg', title: 'Bump Love', sort_order: 2 },
    { category: 'maternity', url: 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg', title: 'Glowing Mom', sort_order: 3 },
    { category: 'maternity', url: 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg', title: 'Journey', sort_order: 4 },
    
    // Wedding
    { category: 'wedding', url: 'https://i.postimg.cc/j50XzC6p/4S8A7207.jpg', title: 'Wedding Day', sort_order: 1 },
    { category: 'wedding', url: 'https://i.postimg.cc/pTPJr4J8/TN-Post-wedding-portraits-168.jpg', title: 'Portrait Session', sort_order: 2 },
    { category: 'wedding', url: 'https://i.postimg.cc/bvxRzpkp/KULHAVY13032020-194-of-671-ddd.jpg', title: 'Candid Moments', sort_order: 3 },
    { category: 'wedding', url: 'https://i.postimg.cc/Gt2PJDNm/Villa-Antoinette-Gl-serstra-e-9-2680-Semmering-Kurort-Austria.jpg', title: 'Venue Magic', sort_order: 4 },
    { category: 'wedding', url: 'https://i.postimg.cc/4yS68dkb/Pic-9.jpg', title: 'Celebrations', sort_order: 5 },
    { category: 'wedding', url: 'https://i.postimg.cc/vBxS7p6K/DSC-0318-01299.jpg', title: 'First Look', sort_order: 6 },
    
    // Business
    { category: 'business', url: 'https://i.postimg.cc/RZjf8FsX/Whats-App-Image-2025-05-24-at-2-38-45-PM-1.jpg', title: 'Corporate Headshots', sort_order: 1 },
    { category: 'business', url: 'https://i.postimg.cc/76dTLg7r/business-portrait.jpg', title: 'Professional Portraits', sort_order: 2 },
    { category: 'business', url: 'https://i.postimg.cc/RZjf8FsX/Whats-App-Image-2025-05-24-at-2-38-45-PM-1.jpg', title: 'Team Photos', sort_order: 3 },
    { category: 'business', url: 'https://i.postimg.cc/76dTLg7r/business-portrait.jpg', title: 'LinkedIn Ready', sort_order: 4 },
    
    // Event
    { category: 'event', url: 'https://i.postimg.cc/907tz7nR/21469528-10155302675513124-226449768-n.jpg', title: 'Event Coverage', sort_order: 1 },
    { category: 'event', url: 'https://i.postimg.cc/907tz7nR/21469528-10155302675513124-226449768-n.jpg', title: 'Live Moments', sort_order: 2 },
    { category: 'event', url: 'https://i.postimg.cc/907tz7nR/21469528-10155302675513124-226449768-n.jpg', title: 'Celebrations', sort_order: 3 },
    { category: 'event', url: 'https://i.postimg.cc/907tz7nR/21469528-10155302675513124-226449768-n.jpg', title: 'Corporate Events', sort_order: 4 },
    
    // Featured (for the featured grid section)
    { category: 'featured', url: 'https://i.postimg.cc/J7bDNtGx/Familienportrat-Wien-Krchnavy-Stolz-0105-1024x683-1.jpg', title: 'Featured Family', sort_order: 1 },
    { category: 'featured', url: 'https://i.postimg.cc/43YQ9VD4/4-S8-A4770-105-1024x683-Copy.jpg', title: 'Featured Newborn', sort_order: 2 },
    { category: 'featured', url: 'https://i.postimg.cc/j50XzC6p/4S8A7207.jpg', title: 'Featured Wedding', sort_order: 3 },
    { category: 'featured', url: 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg', title: 'Featured Maternity', sort_order: 4 },
    { category: 'featured', url: 'https://i.postimg.cc/RZjf8FsX/Whats-App-Image-2025-05-24-at-2-38-45-PM-1.jpg', title: 'Featured Business', sort_order: 5 },
    { category: 'featured', url: 'https://i.postimg.cc/907tz7nR/21469528-10155302675513124-226449768-n.jpg', title: 'Featured Event', sort_order: 6 },
  ];

  // Check if data already exists
  const existingData = await sql`SELECT COUNT(*) as count FROM portfolio_images`;
  if (existingData[0].count > 0) {
    console.log(`ℹ️ portfolio_images table already has ${existingData[0].count} records, skipping seed`);
    return;
  }

  console.log('Seeding initial portfolio images...');
  
  for (const img of portfolioImages) {
    await sql`
      INSERT INTO portfolio_images (category, url, title, sort_order)
      VALUES (${img.category}, ${img.url}, ${img.title}, ${img.sort_order})
    `;
  }

  console.log(`✅ Seeded ${portfolioImages.length} portfolio images`);
}

createPortfolioImagesTable()
  .then(() => {
    console.log('✅ Portfolio images table setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error setting up portfolio images table:', error);
    process.exit(1);
  });
