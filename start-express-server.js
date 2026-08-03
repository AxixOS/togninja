// Keepalive wrapper for the Express TypeScript server
require('dotenv').config();

console.log('🔄 Starting Express server with keepalive...');

// Spawn tsx to run the TypeScript server
const { spawn } = require('child_process');
const path = require('path');

const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env }
});

serverProcess.on('error', (error) => {
    console.error('❌ Server process error:', error);
});

serverProcess.on('exit', (code, signal) => {
    console.log(`📛 Server process exited with code ${code} and signal ${signal}`);
    process.exit(code || 0);
});

// Keep the wrapper alive
process.on('SIGTERM', () => {
    console.log('📛 SIGTERM received, stopping server...');
    serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
    console.log('📛 SIGINT received, stopping server...');
    serverProcess.kill('SIGINT');
});

console.log('✅ Express server wrapper active - press Ctrl+C to stop');
