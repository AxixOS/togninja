const http = require('http');

function req(path, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const r = http.request({
      host: 'localhost',
      port: 3001,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    }, resp => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => resolve({ status: resp.statusCode, body: data }));
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

(async () => {
  const tests = [
    { name: 'HEALTH', path: '/healthz' },
    { name: 'MESSAGES', path: '/api/crm/messages' },
    { name: 'SENT_EMAILS', path: '/api/emails/sent' },
    { name: 'CLIENTS', path: '/api/crm/clients' },
  ];

  for (const t of tests) {
    try {
      const res = await req(t.path);
      console.log(`${t.name} ${res.status}`, (res.body || '').slice(0, 200));
      if (t.name === 'MESSAGES') {
        try {
          const arr = JSON.parse(res.body);
          if (Array.isArray(arr) && arr.length > 0 && arr[0].id) {
            const id = arr[0].id;
            const put = await req(`/api/crm/messages/${id}`, 'PUT', { status: 'read' });
            console.log('PUT MESSAGE', put.status, (put.body || '').slice(0, 200));
            const del = await req(`/api/crm/messages/${id}`, 'DELETE');
            console.log('DEL MESSAGE', del.status, (del.body || '').slice(0, 200));
          }
        } catch (e) {
          // ignore parse errors silently
        }
      }
    } catch (e) {
      console.error(`${t.name} ERROR`, e && (e.message || e.code || String(e)));
    }
  }
})();
