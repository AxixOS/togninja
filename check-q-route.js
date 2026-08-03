const https = require('https');
https.get('https://www.newagefotografie.com/q/12b3293ae73a9cbf', { headers: { 'Accept': '*/*' } }, (r) => {
  const chunks = [];
  r.on('data', (c) => chunks.push(c));
  r.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    console.log('Status:', r.statusCode);
    console.log('Body length:', body.length);
    console.log('Body:', JSON.stringify(body));
  });
}).on('error', (e) => console.error(e));
