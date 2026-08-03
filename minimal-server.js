// ABSOLUTE MINIMAL SERVER - CANNOT FAIL
const http = require('http');

console.log('🚀 Starting ABSOLUTE MINIMAL server...');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  console.log('Request:', req.method, req.url);
  
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  
  if (req.url === '/healthz') {
    res.end(JSON.stringify({
      status: 'ABSOLUTE_MINIMAL_OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      port: port
    }));
  } else {
    res.end(JSON.stringify({
      status: 'MINIMAL_SERVER_RUNNING',
      message: 'Basic server is working',
      timestamp: new Date().toISOString(),
      url: req.url
    }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`✅ MINIMAL server listening on port ${port}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

console.log('Server setup complete, waiting for connections...');
