// Direct JavaScript server - no tsx, just require the compiled modules
require('dotenv/config');

const express = require('express');
const app = express();

// Basic middleware
app.use(express.json({ limit: '5mb' }));

// Health check
app.get('/api/healthz', (req, res) => {
  res.json({ status: 'ok', message: 'Direct JS server works!' });
});

// Start server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Direct JS server listening on 127.0.0.1:${PORT}`);
  console.log('Server address:', server.address());
  console.log('Server listening:', server.listening);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

// Keepalive
setInterval(() => {
  const addr = server.address();
  console.log(`[KEEPALIVE] Server alive on ${addr ? addr.port : 'unknown'}`);
}, 15000);

console.log('✅ Server setup complete');
