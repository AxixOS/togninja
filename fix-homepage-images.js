require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function updateHomepageImages() {
  console.log('🔄 Updating homepage images with correct Backblaze URLs...\n');
  
  // Use the actual working URLs from Heroku
  const updates = [
    { section: 'hero', url: 'https://i.postimg.cc/wTdZVLdC/photo-grid.jpg' },
    { section: 'content-1', url: 'https://togninja.s3.eu-central-003.backblazeb2.com/homepage/content-1-1764947641192-8ywalp.jpg' },
    { section: 'content-2', url: 'https://togninja.s3.eu-central-003.backblazeb2.com/homepage/content-2-1764947369435-h6tr4.jpg' },
    { section: 'services-family', url: 'https://i.postimg.cc/J7bDNtGx/Familienportrat-Wien-Krchnavy-Stolz-0105-1024x683-1.jpg' },
    { section: 'services-pregnancy', url: 'https://togninja.s3.eu-central-003.backblazeb2.com/homepage/services-pregnancy-1764943379324-ev1z3j.jpg' },
    { section: 'services-newborn', url: 'https://togninja.s3.eu-central-003.backblazeb2.com/homepage/services-newborn-1764943463578-2yyhnf.jpg' },
    { section: 'services-business', url: 'https://togninja.s3.eu-central-003.backblazeb2.com/homepage/services-business-1764943499509-yykfd.jpg' },
    { section: 'services-event', url: 'https://togninja.s3.eu-central-003.backblazeb2.com/homepage/services-event-1764943521508-d1jkro.jpg' },
    { section: 'services-product', url: 'https://togninja.s3.eu-central-003.backblazeb2.com/homepage/services-product-1764948167283-cd8xqj.jpg' }
  ];
  
  for (const { section, url } of updates) {
    await sql`
      UPDATE homepage_images 
      SET image_url = ${url}
      WHERE section = ${section}
    `;
    console.log(`✅ Updated ${section}: ${url.substring(0, 60)}...`);
  }
  
  console.log('\n✨ All images updated successfully!');
  process.exit(0);
}

updateHomepageImages();
