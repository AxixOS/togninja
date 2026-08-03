// BULLETPROOF MINIMAL SERVER - GUARANTEED TO WORK
const express = require('express');
const path = require('path');

console.log('🚀 Starting BULLETPROOF server...');
console.log('PORT:', process.env.PORT || 3000);
console.log('NODE_ENV:', process.env.NODE_ENV);

const app = express();
const port = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.static('dist'));

// Health check
app.get('/healthz', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: port
  });
});

// API status
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'EMERGENCY_MODE',
    message: 'Server running in emergency mode',
    timestamp: new Date().toISOString()
  });
});

// Serve the main app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ BULLETPROOF server running on port ${port}`);
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('📥 SIGTERM received, shutting down...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});
