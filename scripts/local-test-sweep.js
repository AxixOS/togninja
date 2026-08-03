// Boots the full server on an ephemeral port and runs endpoint checks
process.env.PORT = '0';
process.env.EMAIL_TRANSPORT = process.env.EMAIL_TRANSPORT || 'json';
process.env.APP_URL = process.env.APP_URL || 'http://localhost';

const http = require('http');

function req(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: '127.0.0.1',
      port: global.__PORT,
      path: urlPath,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request(opts, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(buf); } catch { json = buf; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  const server = require('../full-server.js');
  await new Promise(resolve => {
    if (server.listening) return resolve();
    server.on('listening', resolve);
  });
  const addr = server.address();
  global.__PORT = addr.port;
  console.log('Server listening on', addr);

  const results = {};
  try {
    results.health = await req('GET', '/healthz');
    // Forms
    results.newsletter = await req('POST', '/api/newsletter/signup', { email: `qa+${Date.now()}@example.com`, consent: true });
    results.contact = await req('POST', '/api/contact', { fullName: 'QA Tester', email: `qa+${Date.now()}@example.com`, phone: '123', message: 'Hello', consent: true });
    results.waitlist = await req('POST', '/api/waitlist', { fullName: 'QA Wait', email: `qa+${Date.now()}@example.com`, preferredDate: '2025-10-10', message: 'pls', consent: true });

    // Gallery
    const slug = 'qa-gallery-' + Math.random().toString(36).slice(2,7);
    const gCreate = await req('POST', '/api/galleries', { title: 'QA Gallery', slug, description: 'Test', is_public: true });
    results.galleryCreate = gCreate;
    const gAuth = await req('POST', `/api/galleries/${slug}/auth`, { email: 'client@example.com' });
    results.galleryAuth = gAuth;
    const token = gAuth.body && gAuth.body.token;
    const gImages = await new Promise((resolve) => {
      const opts = { hostname: '127.0.0.1', port: global.__PORT, path: `/api/galleries/${slug}/images`, method: 'GET', headers: { Authorization: token ? `Bearer ${token}` : '' } };
      const r = http.request(opts, res => { let buf=''; res.on('data', c => buf += c); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); } catch { resolve({ status: res.statusCode, body: buf }); } }); });
      r.on('error', e => resolve({ status: 0, error: e.message }));
      r.end();
    });
    results.galleryImages = gImages;

    // Questionnaire
    const qCreate = await req('POST', '/api/admin/create-questionnaire-link', { client_id: 'test-client-123' });
    results.qCreate = qCreate;
    const tokenQ = qCreate.body && qCreate.body.token;
    const qGet = await req('GET', `/api/questionnaire/${tokenQ}`);
    results.qGet = qGet;
    const qSubmit = await req('POST', '/api/email-questionnaire', { token: tokenQ, clientName: 'QA User', clientEmail: 'qa@example.com', answers: { note: 'OK' } });
    results.qSubmit = qSubmit;
  } catch (e) {
    results.error = e.stack || e.message;
  } finally {
    try { server.close(); } catch {}
  }

  console.log(JSON.stringify(results, null, 2));
})();
