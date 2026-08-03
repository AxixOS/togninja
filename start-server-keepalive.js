// Simple keepalive wrapper to prevent Node from exiting
require('dotenv').config();

console.log('🔄 Starting server with keepalive wrapper...');

// Start the server
require('./server/index.ts');

// Keep the process alive with an interval
const keepAlive = setInterval(() => {
  // This prevents Node from exiting
}, 1000000);

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('📛 SIGTERM received, shutting down...');
  clearInterval(keepAlive);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📛 SIGINT received, shutting down...');
  clearInterval(keepAlive);
  process.exit(0);
});

console.log('✅ Keepalive wrapper active - server will stay running');
