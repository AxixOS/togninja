const srv = require('../full-server.js');
if (srv && typeof srv.listen === 'function') {
  try {
    srv.listen(3001, '0.0.0.0', () => console.log('forced listen on 3001'));
  } catch (e) {
    console.error('listen error:', e.message);
  }
} else {
  console.error('server export is not a http.Server');
}
