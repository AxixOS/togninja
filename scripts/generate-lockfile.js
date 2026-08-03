#!/usr/bin/env node

// Generate package-lock.json to force npm usage instead of yarn
console.log('Generating package-lock.json to ensure npm is used...');

import { spawn } from 'child_process';

const npmInstall = spawn('npm', ['install', '--package-lock-only'], {
  stdio: 'inherit',
  shell: true
});

npmInstall.on('close', (code) => {
  if (code === 0) {
    console.log('✅ package-lock.json generated successfully');
  } else {
    console.error('❌ Failed to generate package-lock.json');
    process.exit(1);
  }
});
