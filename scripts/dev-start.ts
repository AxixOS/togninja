import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const ERR_LOG = path.resolve(process.cwd(), 'server.err.log');
function logErr(msg: string) {
  try {
    fs.appendFileSync(ERR_LOG, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
}

process.on('unhandledRejection', (reason: any) => {
  const line = `UNHANDLED REJECTION: ${reason?.message || reason}`;
  console.error(line);
  logErr(line + '\n' + (reason?.stack || ''));
});

process.on('uncaughtException', (err: any) => {
  const line = `UNCAUGHT EXCEPTION: ${err?.message || err}`;
  console.error(line);
  logErr(line + '\n' + (err?.stack || ''));
});

// Start the TS server with better diagnostics
import('../server/index.ts').catch((e) => {
  const msg = 'Top-level import failure: ' + (e?.message || e);
  console.error(msg);
  console.error(e?.stack || 'no stack');
  logErr(msg + '\n' + (e?.stack || ''));
});

// Keep process alive for inspection
setInterval(() => {}, 1 << 30);
