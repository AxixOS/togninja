// Simple helper to trigger ICS import locally or on a remote base URL
// Usage:
//   node scripts/reimport-ics.js --dry-run
//   BASE_URL=https://your-app.example.com ICS_URL=https://.../basic.ics node scripts/reimport-ics.js
// Defaults:
//   BASE_URL=http://127.0.0.1:3000
//   ICS_URL=https://calendar.google.com/calendar/ical/newagefotografen%40gmail.com/public/basic.ics

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const ICS_URL = process.env.ICS_URL || 'https://calendar.google.com/calendar/ical/newagefotografen%40gmail.com/public/basic.ics';
const DRY = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';

// Parse optional window flags: --from=YYYY-MM-DD, --to=YYYY-MM-DD, --includePast
function getArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.substring(prefix.length) : undefined;
}
const argFrom = getArg('from') || process.env.FROM;
const argTo = getArg('to') || getArg('until') || process.env.TO || process.env.UNTIL;
const includePast = process.argv.includes('--includePast') || process.argv.includes('--include-past') || (process.env.INCLUDE_PAST === 'true');

async function main() {
  const qp = new URLSearchParams();
  if (DRY) qp.set('dryRun', 'true');
  if (includePast) qp.set('includePast', 'true');
  if (argFrom) qp.set('from', argFrom);
  if (argTo) qp.set('to', argTo);
  const qs = qp.toString();
  const url = `${BASE_URL}/api/calendar/import/ics-url${qs ? `?${qs}` : ''}`;
  const payload = { icsUrl: ICS_URL };
  console.log(`POST ${url}`);
  console.log(`Body:`, payload);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await resp.text();
    console.log(`Status: ${resp.status}`);
    try {
      console.log('Response JSON:', JSON.parse(text));
    } catch {
      console.log('Response Text:', text);
    }
    if (!resp.ok) process.exit(1);
  } catch (e) {
    console.error('Request failed:', e);
    process.exit(1);
  }
}

main();
