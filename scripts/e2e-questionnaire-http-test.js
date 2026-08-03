require('dotenv').config();
const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body });
      });
    });
    req.on('error', (e) => reject(e));
    if (postData) req.write(postData);
    req.end();
  });
}

(async () => {
  try {
    console.log('1) Creating questionnaire link...');
    const r1 = await makeRequest('POST', '/api/admin/create-questionnaire-link', { client_id: 'test-client-123' });
    console.log('create response status:', r1.statusCode);
    const res1 = JSON.parse(r1.body);
    console.log('create response body:', res1);

    if (!res1 || !res1.token) throw new Error('No token returned');

    console.log('2) Fetching questionnaire via token...');
    const r2 = await makeRequest('GET', `/api/questionnaire/${res1.token}`);
    console.log('get status:', r2.statusCode);
    let questionnaire;
    try { questionnaire = JSON.parse(r2.body); } catch (e) { questionnaire = r2.body; }
    console.log('questionnaire response:', questionnaire);

    console.log('3) Submitting questionnaire...');
    const payload = {
      token: res1.token,
      clientName: 'Test User',
      clientEmail: 'test.user@example.com',
      answers: { note: 'This is a test' }
    };
    const r3 = await makeRequest('POST', '/api/email-questionnaire', payload);
    console.log('submit status:', r3.statusCode);
    console.log('submit body:', r3.body);

    console.log('E2E test finished');
  } catch (e) {
    console.error('E2E test failed:', e);
    process.exit(1);
  }
})();