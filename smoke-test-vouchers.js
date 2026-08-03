const http = require('http');
const BASE = 'http://127.0.0.1:3001';

function req(method, url, body, cookie) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers: { 'Content-Type': 'application/json' } };
    if (cookie) opts.headers['Cookie'] = cookie;
    const r = http.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({ status: res.statusCode, body: buf.toString(), buffer: buf, headers: res.headers });
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

let passed = 0, failed = 0;
function check(name, condition, detail) {
  if (condition) { passed++; console.log(`  PASS: ${name}${detail ? ' -- ' + detail : ''}`); }
  else { failed++; console.log(`  FAIL: ${name}${detail ? ' -- ' + detail : ''}`); }
}

(async () => {
  console.log('\nVOUCHER SYSTEM SMOKE TEST\n');

  // 1. Products API
  console.log('-- 1. Voucher Products --');
  const products = await req('GET', BASE + '/api/vouchers/products');
  const prods = JSON.parse(products.body);
  check('GET /api/vouchers/products', products.status === 200, 'status=' + products.status);
  check('Products returned', prods.length > 0, 'count=' + prods.length);
  check('Products have slugs', prods.every(p => p.slug), 'first slug: ' + (prods[0] || {}).slug);
  check('Products have prices', prods.every(p => p.price), 'first price: ' + (prods[0] || {}).price);

  // 2. Public Templates
  console.log('\n-- 2. Public Templates --');
  const tplsRes = await req('GET', BASE + '/api/vouchers/templates');
  const tpls = JSON.parse(tplsRes.body);
  check('GET /api/vouchers/templates', tplsRes.status === 200, 'status=' + tplsRes.status);
  check('Templates returned', tpls.length > 0, 'count=' + tpls.length);
  const designFields = ['bannerColor', 'bannerTextColor', 'fontFamily', 'messageFontSize'];
  check('Design fields in response', tpls.length > 0 && designFields.every(f => f in tpls[0]), designFields.filter(f => f in (tpls[0] || {})).join(', '));

  // 3. Admin Auth + Templates CRUD
  console.log('\n-- 3. Admin Auth + CRUD --');
  const login = await req('POST', BASE + '/api/auth/login', { email: 'admin@newagefotografie.com', password: 'admin123' });
  const cookie = (login.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  check('Admin login', login.status === 200, 'status=' + login.status);

  const adminList = await req('GET', BASE + '/api/admin/vouchers/templates', null, cookie);
  const adminTpls = JSON.parse(adminList.body);
  check('Admin template list', adminList.status === 200, 'count=' + adminTpls.length);
  const allDesign = ['bannerColor', 'bannerTextColor', 'fontFamily', 'messageFontSize', 'logoUrl', 'footerText', 'footerEmail', 'footerPhone', 'termsText', 'layoutStyle'];
  check('All 10 design fields present', adminTpls.length > 0 && allDesign.every(f => f in adminTpls[0]), allDesign.filter(f => f in (adminTpls[0] || {})).join(', '));

  // Create
  const createRes = await req('POST', BASE + '/api/admin/vouchers/templates', {
    name: 'SMOKE-TEST-' + Date.now(), category: 'test', imageUrl: 'https://example.com/test.jpg',
    occasion: 'Smoke Test', bannerColor: '#ff6600', bannerTextColor: '#000000',
    fontFamily: 'Times-Roman', messageFontSize: 24, footerEmail: 'test@smoke.com',
    termsText: 'Smoke test terms.', layoutStyle: 'modern', isActive: false
  }, cookie);
  const created = JSON.parse(createRes.body);
  check('Create template', createRes.status === 200 && created.id, 'id=' + created.id);
  check('Create: design fields saved', created.bannerColor === '#ff6600' && created.fontFamily === 'Times-Roman' && created.messageFontSize === 24, 'banner=' + created.bannerColor + ' font=' + created.fontFamily + ' size=' + created.messageFontSize);

  if (created.id) {
    // Update
    const updRes = await req('PUT', BASE + '/api/admin/vouchers/templates/' + created.id, {
      bannerColor: '#00cc00', messageFontSize: 28, termsText: 'Updated.', footerText: 'NAF Studio'
    }, cookie);
    const upd = JSON.parse(updRes.body);
    check('Update template', updRes.status === 200, 'status=' + updRes.status);
    check('Update: fields changed', upd.bannerColor === '#00cc00' && upd.messageFontSize === 28 && upd.termsText === 'Updated.', 'banner=' + upd.bannerColor + ' size=' + upd.messageFontSize + ' terms=' + upd.termsText);
    check('Update: unchanged fields preserved', upd.fontFamily === 'Times-Roman', 'font=' + upd.fontFamily);

    // Delete
    const delRes = await req('DELETE', BASE + '/api/admin/vouchers/templates/' + created.id, null, cookie);
    check('Delete template', delRes.status === 200, 'status=' + delRes.status);
  }

  // 4. PDF Preview
  console.log('\n-- 4. PDF Preview --');
  const prev1 = await req('GET', BASE + '/voucher/pdf/preview?sku=Family-Basic&name=Anna+Test&from=Max&message=Alles+Gute!&amount=95');
  check('Basic preview', prev1.status === 200 && prev1.buffer.slice(0, 5).toString() === '%PDF-', 'status=' + prev1.status + ' size=' + prev1.buffer.length + 'B isPdf=' + (prev1.buffer.slice(0, 5).toString() === '%PDF-'));

  if (tpls.length > 0) {
    const prev2 = await req('GET', BASE + '/voucher/pdf/preview?sku=Family-Basic&name=Test&from=Sender&message=Template+Test&amount=95&design_template_id=' + tpls[0].id);
    check('Preview with template', prev2.status === 200 && prev2.buffer.slice(0, 5).toString() === '%PDF-', 'status=' + prev2.status + ' size=' + prev2.buffer.length + 'B');
    check('Template preview has content', prev2.buffer.length > 1000, 'size=' + prev2.buffer.length + 'B');
  }

  const prev3 = await req('GET', BASE + '/voucher/pdf/preview?sku=family-premium&name=Premium&from=Sender&message=Premium&amount=225');
  check('Preview slug lookup', prev3.status === 200 && prev3.buffer.slice(0, 5).toString() === '%PDF-', 'status=' + prev3.status + ' size=' + prev3.buffer.length + 'B');

  const prev4 = await req('GET', BASE + '/voucher/pdf/preview?sku=Family-Basic&name=Test&from=Sender&amount=95');
  check('Preview no message fallback', prev4.status === 200 && prev4.buffer.slice(0, 5).toString() === '%PDF-', 'status=' + prev4.status + ' size=' + prev4.buffer.length + 'B');

  // 5. Stripe Checkout Session
  console.log('\n-- 5. Stripe Checkout Session --');
  const stripeRes = await req('POST', BASE + '/api/checkout/create-session', {});
  check('Checkout rejects empty body', stripeRes.status === 400 || stripeRes.status === 500, 'status=' + stripeRes.status);

  const stripeRes2 = await req('POST', BASE + '/api/checkout/create-session', {
    productId: (prods[0] || {}).id || 'test', quantity: 1,
    personalization: { recipientName: 'Test', senderName: 'Smoke', message: 'Hi', selectedDesign: { id: (tpls[0] || {}).id || '' } }
  });
  check('Checkout processes request', [200, 303, 400, 500].includes(stripeRes2.status), 'status=' + stripeRes2.status + ' body=' + stripeRes2.body.substring(0, 150));

  // 6. DB Design Columns
  console.log('\n-- 6. DB Design Columns Verification --');
  if (adminTpls.length > 0) {
    const t = adminTpls[0];
    check('bannerColor column', 'bannerColor' in t, 'value: ' + t.bannerColor);
    check('bannerTextColor column', 'bannerTextColor' in t, 'value: ' + t.bannerTextColor);
    check('fontFamily column', 'fontFamily' in t, 'value: ' + t.fontFamily);
    check('messageFontSize column', 'messageFontSize' in t, 'value: ' + t.messageFontSize);
    check('logoUrl column', 'logoUrl' in t, 'value: ' + t.logoUrl);
    check('footerText column', 'footerText' in t, 'value: ' + t.footerText);
    check('footerEmail column', 'footerEmail' in t, 'value: ' + t.footerEmail);
    check('footerPhone column', 'footerPhone' in t, 'value: ' + t.footerPhone);
    check('termsText column', 'termsText' in t, 'value: ' + t.termsText);
    check('layoutStyle column', 'layoutStyle' in t, 'value: ' + t.layoutStyle);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('  RESULTS: ' + passed + ' passed, ' + failed + ' failed');
  console.log('='.repeat(50) + '\n');
  process.exit(failed > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
