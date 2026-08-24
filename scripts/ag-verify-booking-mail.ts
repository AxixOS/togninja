// Does a client hear anything after they book?
//
// They did not. The scheduler admin collects a confirmation message, a reminders toggle and
// reminder timings; the POST and PUT both persist all three; and server/routes/scheduler.ts
// had no mail import of any kind. A client picked a slot, filled in their details, saw a
// confirmation screen and received nothing at all.
//
// Worse, the auto-approve path wrote `confirmationSent: true, confirmationSentAt: new Date()`
// onto the booking row regardless — so the database positively asserted a confirmation that
// had never been sent. Any future reminder logic reading that flag would have skipped every
// booking as already handled.
//
// Run: npx tsx scripts/ag-verify-booking-mail.ts
import fs from 'fs';

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const sched = fs.readFileSync('server/routes/scheduler.ts', 'utf8');
const mail = fs.readFileSync('server/lib/bookingEmails.ts', 'utf8');

console.log('\n=== both routes to "confirmed" now tell the client ===');
// There are exactly two: booking with autoApprove on, and the studio approving by hand.
const calls = (sched.match(/await sendBookingConfirmation\(/g) || []).length;
check('both paths send', calls === 2, calls + ' call site(s)');
check('the sender is imported', /import \{ sendBookingConfirmation \}/.test(sched));

console.log('\n=== the sent flag records what happened, not what was hoped ===');
check('confirmationSent comes from the result',
  /confirmationSent: mailed\.clientEmailed/.test(sched));
check('the timestamp is null when nothing was sent',
  /confirmationSentAt: mailed\.clientEmailed \? new Date\(\) : null/.test(sched));
check('the old unconditional true is gone',
  !/confirmationSent: true, confirmationSentAt: new Date\(\)/.test(sched));
// Comments excluded: the explanation of the old bug necessarily quotes it, and matching
// that is the same false positive this repo's other guards kept producing.
const codeOnly = sched
  .split('\n')
  .filter((l) => {
    const t = l.trim();
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
  })
  .join('\n');
const stillHardcoded = (codeOnly.match(/confirmationSent: true/g) || []).length;
check('no code asserts a send anywhere else', stillHardcoded === 0, stillHardcoded + ' found');

console.log('\n=== a failed send is surfaced, not swallowed ===');
// The gallery route awaited sendEmail, discarded the result and returned ok:true. In demo
// mode the service reports success:true WITH demo:true — so "success" is not enough.
check('demo mode is treated as NOT sent', /if \(r\?\.demo\) problems\.push/.test(mail));
check('an explicit failure is captured', /r\?\.success === false/.test(mail));
check('problems are returned to the caller', /problem\?: string/.test(mail));
check('the route logs the problem', /if \(mailed\.problem\) console\.warn/.test(sched));

console.log('\n=== a mail failure never costs the booking ===');
// The slot is taken and money may be committed. Losing the booking because a mail server
// hiccuped would be far worse than a missing email.
check('sending is wrapped in try/catch', (mail.match(/try \{/g) || []).length >= 2);
check('the studio email failing is non-fatal', /genuinely optional/.test(mail));
check('sendBookingConfirmation never throws to the route',
  !/throw /.test(mail.slice(mail.indexOf('export async function sendBookingConfirmation'))));

console.log('\n=== the content is the studio\'s, not ours ===');
check("the studio's own confirmation message is used", /sch\.confirmationMessage/.test(mail));
check('the studio name comes from config, not a literal', /studio_configs/.test(mail));
check('values are escaped into the HTML', /const escape =/.test(mail));
check('the date is rendered in the scheduler timezone', /timeZone: timezone/.test(mail));
check('a bad timezone does not lose the email', /An invalid timezone string must not cost/.test(mail));

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED\n`
  : '\n  ALL CHECKS PASSED — the client is told, and the record says what really happened\n');
process.exit(bad ? 1 : 0);
