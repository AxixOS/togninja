// Ultra-minimal HTTP server using only Node.js built-in modules
const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ok', 
    message: 'Direct HTTP server works!',
    url: req.url,
    timestamp: new Date().toISOString()
  }));
});

const PORT = 3001;
const HOST = '127.0.0.1';

server.listen(PORT, HOST, () => {
  const addr = server.address();
  console.log('✅ Direct HTTP server listening on:', addr);
  console.log(`🌐 Test: http://localhost:${PORT}/`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

server.on('listening', () => {
  console.log('✅ "listening" event fired');
  console.log('Server object listening property:', server.listening);
  console.log('Server address:', server.address());
});

// Keepalive
setInterval(() => {
  const addr = server.address();
  console.log(`[KEEPALIVE] Server alive - listening: ${server.listening}, port: ${addr ? addr.port : 'none'}`);
}, 5000);

console.log('🚀 Starting HTTP server...');
