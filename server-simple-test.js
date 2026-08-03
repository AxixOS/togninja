// Ultra-simple test to verify Express works
const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  res.json({ message: 'Simple server works!' });
});

const server = app.listen(5555, '127.0.0.1', () => {
  console.log('✅ Simple server listening on 127.0.0.1:5555');
  console.log('Address:', server.address());
  console.log('Listening:', server.listening);
});

server.on('error', (err) => {
  console.error('❌ Error:', err);
});

setInterval(() => {
  console.log('[KEEPALIVE] Server alive:', server.listening, server.address());
}, 5000);

console.log('Server setup complete, process should stay alive');
