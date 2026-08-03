// Simple wrapper to start the server and keep it alive
require('./full-server.js');

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

console.log('✅ Server wrapper active - press Ctrl+C to stop');
