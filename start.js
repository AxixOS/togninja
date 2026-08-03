#!/usr/bin/env node

// Production startup script for Render deployment
console.log('🚀 Starting Clean CRM server...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT || 'default');
console.log('Demo Mode:', process.env.DEMO_MODE || 'default');

// Import the main server
import './server/index.js';
