// Batch cleanup tool for stacked calendar sessions on a base URL
// Usage:
//  node scripts/cleanup-stacked.js --dry-run
//  node scripts/cleanup-stacked.js --execute
// Env:
//  BASE_URL (default: https://www.newagefotografie.com)
//  THRESHOLD (default: 20)
//  LIMIT (default: 200)

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const THRESHOLD = parseInt(process.env.THRESHOLD || '20', 10);
const LIMIT = parseInt(process.env.LIMIT || '200', 10);
const EXECUTE = process.argv.includes('--execute');
const ONLY_NULL_ICAL = process.argv.includes('--only-null-ical'); // optional safety flag

async function main() {
  const listUrl = `${BASE_URL}/api/admin/calendar/stacked-clusters?threshold=${THRESHOLD}&limit=${LIMIT}`;
  console.log(`GET ${listUrl}`);
  const listResp = await fetch(listUrl);
  if (!listResp.ok) {
    const text = await listResp.text();
    console.error('Failed to fetch clusters:', listResp.status, text);
    process.exit(1);
  }
  const data = await listResp.json();
  const clusters = data.clusters || [];
  console.log(`Found ${clusters.length} clusters with count >= ${THRESHOLD}`);
  if (clusters.length === 0) return;

  const results = [];
  for (const c of clusters) {
    const body = {
      targetStartTimeIso: c.start_time_iso,
      onlyNullIcalUid: ONLY_NULL_ICAL,
      dryRun: !EXECUTE,
    };
    const url = `${BASE_URL}/api/admin/calendar/cleanup-stacked`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { text }; }
    console.log(`${EXECUTE ? 'DELETE' : 'DRY-RUN'} ${c.start_time_iso} ->`, json);
    results.push(json);
  }
  const totals = results.reduce((acc, r) => {
    const s = r.summary || r.deleted || {}; // dry-run returns summary; execute returns deleted
    acc.total += s.total || 0;
    acc.without_ical_uid += s.without_ical_uid || 0;
    acc.with_ical_uid += s.with_ical_uid || 0;
    return acc;
  }, { total: 0, without_ical_uid: 0, with_ical_uid: 0 });
  console.log('Aggregate:', totals);
}

main().catch(err => { console.error(err); process.exit(1); });
