// Read (and optionally set) the studio's site_theme_preset. Lives in the repo so `pg`
// resolves. `node scripts/theme-preset.mjs` reads; `... null` or `... aurora` writes.
import pg from 'pg';
import fs from 'fs';

const line = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
const pool = new pg.Pool({
  connectionString: line.slice(13).trim().replace(/^["']|["']$/g, ''),
  max: 2,
  ssl: { rejectUnauthorized: false },
});

const read = async () => (await pool.query('SELECT site_theme_preset FROM studio_configs LIMIT 1')).rows[0]?.site_theme_preset;

console.log('before =', JSON.stringify(await read()));
if (process.argv[2]) {
  await pool.query('UPDATE studio_configs SET site_theme_preset = $1 WHERE TRUE',
    [process.argv[2] === 'null' ? null : process.argv[2]]);
  console.log('after  =', JSON.stringify(await read()));
}
await pool.end();
