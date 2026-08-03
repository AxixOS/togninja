// This script extracts the database connection string from Heroku's response
const https = require('https');

console.log('Fetching Heroku database info...');

// Make a request to Heroku that might reveal the DB being used
const options = {
  hostname: 'workingnewage-2eecd723a444.herokuapp.com',
  path: '/api/vouchers/products',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const products = JSON.parse(data);
      console.log(`\n✓ Heroku API returned ${products.length} products`);
      console.log(`\nFirst product details:`);
      console.log(`  Name: ${products[0].name}`);
      console.log(`  ID: ${products[0].id}`);
      console.log(`  Image URL: ${products[0].imageUrl}`);
      console.log(`  Created: ${products[0].createdAt || products[0].created_at || 'N/A'}`);
      
      console.log(`\nThese products must be in the Heroku database.`);
      console.log(`The credentials we have are likely incorrect or expired.`);
    } catch (e) {
      console.error('Error parsing response:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();
