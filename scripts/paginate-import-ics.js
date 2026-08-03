#!/usr/bin/env node
/**
 * Paginated ICS Import Script
 * Sequentially imports Google Calendar events month-by-month to avoid server timeouts.
 *
 * Usage:
 *   node scripts/paginate-import-ics.js --year 2025 --dry-run
 *   node scripts/paginate-import-ics.js --year 2025 --real
 *   ICS_URL=https://calendar.google.com/calendar/ical/....private-xxxx/basic.ics node scripts/paginate-import-ics.js --year 2025 --real
 *
 * Flags:
 *   --year <YYYY>    Required target year
 *   --dry-run        Use dryRun=true (no DB writes)
 *   --real           Perform real import (mutually exclusive with --dry-run)
 *   --start-month N  Start from month N (1-12) (default 1)
 *   --end-month N    End at month N (1-12) (default 12)
 *   --delay ms       Delay between months (default 1000)
 *   --base-url URL   Override base URL (default http://127.0.0.1:3001)
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: false, real: false, year: null, startMonth: 1, endMonth: 12, delay: 1000, baseUrl: 'http://127.0.0.1:3001' };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--real') opts.real = true;
    else if (a === '--year') { opts.year = parseInt(args[++i], 10); }
    else if (a === '--start-month') { opts.startMonth = parseInt(args[++i], 10); }
    else if (a === '--end-month') { opts.endMonth = parseInt(args[++i], 10); }
    else if (a === '--delay') { opts.delay = parseInt(args[++i], 10); }
    else if (a === '--base-url') { opts.baseUrl = args[++i]; }
  }
  return opts;
}

function endOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)); // month is 1-based; day 0 gives last day previous month
}

async function run() {
  const opts = parseArgs();
  if (!opts.year || opts.year < 1970 || opts.year > 2100) {
    console.error('Error: --year <YYYY> is required and must be reasonable.');
    process.exit(1);
  }
  if (opts.dryRun && opts.real) {
    console.error('Error: Use either --dry-run or --real, not both.');
    process.exit(1);
  }
  const icsUrl = process.env.ICS_URL || 'https://calendar.google.com/calendar/ical/newagefotografen%40gmail.com/private-08da3063a40ffdd19da69b7f3264baf6/basic.ics';
  console.log('Paginated ICS Import');
  console.log('Year:', opts.year, 'Range:', opts.startMonth, '->', opts.endMonth);
  console.log('Mode:', opts.dryRun ? 'DRY-RUN' : 'REAL');
  console.log('Base URL:', opts.baseUrl);
  console.log('ICS URL:', icsUrl);

  const summary = [];

  for (let m = opts.startMonth; m <= opts.endMonth; m++) {
    const from = `${opts.year}-${String(m).padStart(2,'0')}-01`;
    const lastDay = endOfMonth(opts.year, m);
    const to = `${lastDay.getUTCFullYear()}-${String(lastDay.getUTCMonth()+1).padStart(2,'0')}-${String(lastDay.getUTCDate()).padStart(2,'0')}`;
    const params = new URLSearchParams();
    params.set('from', from);
    params.set('to', to);
    if (opts.dryRun) params.set('dryRun', 'true');
    params.set('includePast', 'true');
    params.set('debug', '1'); // keep debug for visibility; remove later

    const url = `${opts.baseUrl}/api/calendar/import/ics-url?${params.toString()}`;
    console.log(`\n▶ Month ${m}/${opts.year} Import: ${url}`);
    const payload = { icsUrl };
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (!resp.ok) {
        console.error('  ✖ Failed:', resp.status, resp.statusText, json);
      } else {
        const imported = json.imported ?? json.filtered ?? 0;
        const filtered = json.filtered ?? 0;
        const reasons = json.debug?.reasonCounts;
        console.log(`  ✔ Result: parsed=${json.parsed} filtered=${filtered} imported=${imported}`);
        if (reasons) console.log('    Reasons:', reasons);
        summary.push({ month: m, parsed: json.parsed, filtered, imported });
      }
    } catch (e) {
      console.error('  💥 Error month', m, e.message);
      summary.push({ month: m, error: e.message });
    }
    if (m < opts.endMonth) {
      await new Promise(r => setTimeout(r, opts.delay));
    }
  }

  console.log('\n=== Pagination Summary ===');
  summary.forEach(r => {
    if (r.error) console.log(`Month ${r.month}: ERROR ${r.error}`);
    else console.log(`Month ${r.month}: parsed=${r.parsed} filtered=${r.filtered} imported=${r.imported}`);
  });

  if (opts.dryRun) {
    console.log('\nDry-run complete. Re-run with --real to persist sessions.');
  } else {
    console.log('\nReal import complete.');
  }
}

run().catch(e => { console.error('Fatal error:', e); process.exit(1); });
