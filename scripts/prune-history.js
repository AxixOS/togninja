// Admin helper to prune historical sessions before a cutoff
// Usage (PowerShell examples):
//   $env:BASE_URL="https://www.newagefotografie.com"; node scripts/prune-history.js --dry
//   $env:BASE_URL="https://www.newagefotografie.com"; node scripts/prune-history.js --execute --before 2024-01-01
//   $env:BASE_URL="https://www.newagefotografie.com"; node scripts/prune-history.js --execute --include-non-imported
// Flags:
//   --before YYYY-MM-DD  Vienna-local cutoff date (defaults to today)
//   --execute            Perform deletion; by default runs as dry-run
//   --include-non-imported  Also delete rows without ical_uid

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { dryRun: true, includeNonImported: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--execute') out.dryRun = false;
    else if (a === '--dry' || a === '--dry-run') out.dryRun = true;
    else if (a === '--include-non-imported') out.includeNonImported = true;
    else if (a === '--before' && args[i+1]) { out.before = args[i+1]; i++; }
  }
  return out;
}

async function main() {
  const opts = parseArgs();
  const url = `${BASE_URL}/api/admin/calendar/prune-history`;
  const body = {
    before: opts.before,
    includeNonImported: opts.includeNonImported,
    dryRun: opts.dryRun,
  };
  console.log('POST', url);
  console.log('Body', body);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const text = await resp.text();
    console.log('Status:', resp.status);
    try { console.log('Response JSON:', JSON.parse(text)); } catch { console.log('Response Text:', text); }
    if (!resp.ok) process.exit(1);
  } catch (e) {
    console.error('Request failed:', e);
    process.exit(1);
  }
}

main();
