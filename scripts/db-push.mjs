#!/usr/bin/env node
// Portable `drizzle-kit push` wrapper.
//
// This repo pins drizzle-kit 0.20.x, whose command is `push:pg` (not `push`) and which
// requires --schema/--driver/--connectionString as flags (it does not read defineConfig
// for those). This wrapper reads DATABASE_URL, enables TLS for hosted Postgres, and runs
// the push with an args ARRAY (no shell) so passwords/URLs with special chars are safe on
// any OS. Used by `npm run db:push` and the tenant bootstrap.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

let url = process.env.DATABASE_URL;
if (!url) { console.error('✖ DATABASE_URL is not set.'); process.exit(1); }

// Hosted Postgres (Supabase/Neon) needs TLS; accept the provider cert (no CA bundle).
const isLocal = /(^|@)(localhost|127\.0\.0\.1|::1)(:|\/)/.test(url);
if (!isLocal && !/sslmode=/.test(url)) url += (url.includes('?') ? '&' : '?') + 'sslmode=no-verify';

// drizzle-kit 0.20's package `exports` hides the bin, so reference it by path.
const bin = path.resolve(process.cwd(), 'node_modules', 'drizzle-kit', 'bin.cjs');
if (!existsSync(bin)) { console.error('✖ drizzle-kit bin not found at ' + bin); process.exit(1); }

console.log('▶ drizzle-kit push:pg (schema → database)');
try {
  execFileSync(
    process.execPath,
    [bin, 'push:pg', '--schema=./shared/schema.ts', '--driver=pg', `--connectionString=${url}`],
    { stdio: 'inherit', env: process.env },
  );
} catch (e) {
  console.error('✖ db:push failed:', e?.message || e);
  process.exit(1);
}
