// Schedulers offering the studio's working day in somebody else's timezone.
//
// A Shreveport studio set America/New_York in the setup wizard and their first scheduler
// was created as Europe/Vienna, because the two halves of the config chain never meet:
//
//   studio_configs.timezone is in config-reader's DB_FIELD_MAP but has NO entry in the
//   env map, so it never becomes an env var;
//
//   DEFAULT_CAL_TZ is in the env map but has NO DB source, so nothing populates it.
//
// The code reads DEFAULT_CAL_TZ, nothing fills it, and every read falls through to
// 'Europe/Vienna' — which is also the schedulers.timezone COLUMN default and the literal
// the create form posts.
//
// It is not cosmetic. Availability is computed in the scheduler's timezone and the
// confirmation email renders the appointment in it, so a 9am-5pm working day was being
// offered to clients as 2am-10am, and the email told them so.
//
//   node scripts/gal-repair-scheduler-timezone.mjs           report only
//   node scripts/gal-repair-scheduler-timezone.mjs --apply   align them with the studio
import 'dotenv/config';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
for (let i = 0; ; i++) {
  try { await db.connect(); break; }
  catch (e) { if (i >= 6) throw e; await new Promise((r) => setTimeout(r, 2500)); }
}

const valid = (tz) => {
  if (!tz) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
};

const cfg = (await db.query(`SELECT studio_name, city, country, timezone FROM studio_configs LIMIT 1`)).rows[0] || {};
const studioTz = String(cfg.timezone || '').trim();

console.log(`\n  ${cfg.studio_name || '(unnamed studio)'}${cfg.city ? ', ' + cfg.city : ''}`);
console.log(`  studio_configs.timezone: ${studioTz || '(not set)'}`);

if (!studioTz || !valid(studioTz)) {
  console.log('\n  The studio has no valid timezone set, so there is nothing to align against.');
  console.log('  Set it in Settings before repairing — rewriting every scheduler to a guess\n  would be worse than leaving them wrong.\n');
  await db.end();
  process.exit(1);
}

const rows = (await db.query(
  `SELECT id, name, slug, timezone, is_active FROM schedulers ORDER BY created_at`)).rows;

if (!rows.length) { console.log('\n  No schedulers exist.\n'); await db.end(); process.exit(0); }

// How far apart are the two, right now? A studio reading "6 hours" understands the
// problem immediately; "timezone mismatch" does not land the same way.
const offsetHours = (a, b) => {
  const t = Date.UTC(2026, 6, 15, 12, 0);
  const read = (tz) => {
    const p = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date(t)).reduce((o, x) => (o[x.type] = x.value, o), {});
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  };
  return Math.round((read(a) - read(b)) / 3600000);
};

const wrong = rows.filter((r) => String(r.timezone || '').trim() !== studioTz);
console.log(`\n  ${rows.length} scheduler(s), ${wrong.length} not in the studio's timezone:\n`);
for (const r of rows) {
  const tz = String(r.timezone || '(none)').trim();
  const ok = tz === studioTz;
  let note = '';
  if (!ok && valid(tz)) {
    const h = offsetHours(tz, studioTz);
    note = `  — slots land ${Math.abs(h)}h ${h > 0 ? 'ahead of' : 'behind'} the studio`;
  }
  console.log(`    ${ok ? 'ok     ' : 'WRONG  '} ${String(r.name).padEnd(24)} ${tz}${note}`);
}

if (!wrong.length) { console.log('\n  Every scheduler matches the studio.\n'); await db.end(); process.exit(0); }
if (!APPLY) { console.log(`\n  Re-run with --apply to set ${wrong.length} scheduler(s) to ${studioTz}.\n`); await db.end(); process.exit(0); }

const upd = await db.query(
  `UPDATE schedulers SET timezone = $1, updated_at = now()
    WHERE coalesce(trim(timezone), '') <> $1 RETURNING id`, [studioTz]);
console.log(`\n  ${upd.rowCount} scheduler(s) set to ${studioTz}.`);

// The column default is the origin studio's too, so the next scheduler created by any
// path that omits the field would land back on Vienna.
const def = (await db.query(
  `SELECT column_default FROM information_schema.columns
    WHERE table_name = 'schedulers' AND column_name = 'timezone'`)).rows[0]?.column_default || '';
if (/Vienna/i.test(def)) {
  await db.query(`ALTER TABLE schedulers ALTER COLUMN timezone DROP DEFAULT`).catch((e) =>
    console.log(`  (could not drop the column default: ${e.message})`));
  console.log(`  Column default was ${def} — dropped, so the application must state it.`);
}

const left = (await db.query(
  `SELECT count(*)::int n FROM schedulers WHERE coalesce(trim(timezone), '') <> $1`, [studioTz])).rows[0].n;
console.log(left === 0
  ? `\n  Verified: every scheduler now offers the studio's own hours.\n`
  : `\n  STILL WRONG: ${left}\n`);
await db.end();
process.exit(left === 0 ? 0 : 1);
