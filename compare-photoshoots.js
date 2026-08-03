const https = require('https');
const http = require('http');

async function fetchData(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function compare() {
  console.log('Fetching local photoshoot data...');
  const local = await fetchData('http://localhost:3001/api/photoshoots');
  
  console.log('Fetching Heroku photoshoot data...');
  const heroku = await fetchData('https://workingnewage-2eecd723a444.herokuapp.com/api/photoshoots');
  
  console.log('\n=== COMPARISON ===');
  console.log(`Local: ${local.length} photoshoot(s)`);
  console.log(`Heroku: ${heroku.length} photoshoot(s)`);
  
  if (local.length > 0) {
    console.log('\n--- LOCAL DATA ---');
    console.log('Title:', local[0].title);
    console.log('Slug:', local[0].slug);
    console.log('Featured Image:', local[0].featuredImage);
    console.log('Hero Image:', local[0].heroImage);
    console.log('Images count:', local[0].images?.length || 0);
    if (local[0].images?.length > 0) {
      console.log('First image:', local[0].images[0].url);
    }
  }
  
  if (heroku.length > 0) {
    console.log('\n--- HEROKU DATA ---');
    console.log('Title:', heroku[0].title);
    console.log('Slug:', heroku[0].slug);
    console.log('Featured Image:', heroku[0].featuredImage);
    console.log('Hero Image:', heroku[0].heroImage);
    console.log('Images count:', heroku[0].images?.length || 0);
    if (heroku[0].images?.length > 0) {
      console.log('First image:', heroku[0].images[0].url);
    }
  }
  
  console.log('\n--- DIFFERENCES ---');
  if (local.length > 0 && heroku.length > 0) {
    if (local[0].featuredImage !== heroku[0].featuredImage) {
      console.log('❌ Featured images differ!');
    }
    if (local[0].heroImage !== heroku[0].heroImage) {
      console.log('❌ Hero images differ!');
    }
    if ((local[0].images?.length || 0) !== (heroku[0].images?.length || 0)) {
      console.log(`❌ Image counts differ: ${local[0].images?.length || 0} vs ${heroku[0].images?.length || 0}`);
    }
  }
}

compare().catch(console.error);
