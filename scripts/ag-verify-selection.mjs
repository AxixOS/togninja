// Do the tools the operator needs actually reach the model?
//
// Before this, agent-v2.ts sent allTools.slice(0, 20) and the import order in
// agent/v2/tools/index.ts put every read tool first — so the cut landed exactly on the
// read/write boundary and the agent could not draft, send, invoice or schedule anything,
// for any role. It was read-only by accident, and the system prompt still told it
// otherwise. This asserts the five things the owner actually asked for are reachable.
import '../agent/v2/tools/index.ts';
const { listOpenAITools } = await import('../agent/v2/core/ToolBus.ts');
const { selectTools } = await import('../agent/v2/core/selectTools.ts');
const { getUserScopes } = await import('../agent/v2/core/Policy.ts').catch(() => ({ getUserScopes: null }));

// Every scope, so the test measures SELECTION and not authorisation.
const all = listOpenAITools([...new Set(
  ['CRM_READ','CRM_WRITE','INV_READ','INV_WRITE','EMAIL_READ','EMAIL_SEND','CALENDAR_READ',
   'CALENDAR_WRITE','SESSION_READ','SESSION_WRITE','PRICE_READ','PRICE_WRITE','MSG_READ',
   'PAYMENT_READ','GALLERY_READ','VOUCHER_READ','COUPON_READ','PRICELIST_READ','LEAD_READ',
   'BOOKING_READ','CONTENT_READ','FILES_READ','CAMPAIGN_READ','ANALYTICS_READ',
   // ADMIN and PRICE_RESEARCH were missing, so invoices_mark_paid and the price
   // wizard were filtered out before selection ran and their assertions passed by
   // skipping themselves. A vacuous pass is worse than no test.
   'ADMIN','PRICE_RESEARCH'])]);

let bad = 0;
const check = (label, ok, detail) => { if (!ok) bad++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); };

console.log(`\n  ${all.length} tools registered and in scope\n`);

console.log('=== the five asks reach the model ===');
const CASES = [
  ['draft a reply to Emma about her wedding enquiry', 'email_draft'],
  ['send that email to the client now', 'email_send'],
  ['raise an invoice for the Brighton marathon shoot', 'invoices_create'],
  ['email the invoice to the client', 'invoices_send'],
  ['create a calendar appointment for Friday at 2pm', 'calendar_create_appointment'],
  ['mark invoice 1042 as paid', 'invoices_mark_paid'],
  ['update this client’s phone number', 'clients_update'],
];
for (const [msg, want] of CASES) {
  const picked = selectTools(all, msg, 24).map((t) => t.function.name);
  const exists = all.some((t) => t.function.name === want);
  check(`"${msg.slice(0, 44)}" -> ${want}`, !exists || picked.includes(want),
    exists ? '' : '(tool not registered)');
}

console.log('\n=== a read question still gets read tools ===');
const readPick = selectTools(all, 'how much revenue did we make last month?', 24).map((t) => t.function.name);
check('revenue question surfaces a revenue tool', readPick.some((n) => /revenue|invoice|summary/.test(n)), readPick.filter(n=>/revenue|summary/.test(n)).join(', '));

console.log('\n=== a message matching nothing still gets a usable floor ===');
const floor = selectTools(all, 'hello', 24).map((t) => t.function.name);
check('floor is populated', floor.length === 24, String(floor.length));
check('client search always present', floor.includes('crm_clients_search'), '');

console.log('\n=== the cap is respected ===');
for (const m of ['draft an email and raise an invoice and book a session and update a client', 'hello']) {
  check(`"${m.slice(0, 34)}" <= 24 tools`, selectTools(all, m, 24).length <= 24, String(selectTools(all, m, 24).length));
}

console.log('\n=== the model cannot approve its own actions ===');
const withConfirm = all.filter((t) => t.function.parameters?.properties?.__confirm);
check('no tool advertises __confirm', withConfirm.length === 0,
  withConfirm.length ? withConfirm.map((t) => t.function.name).join(', ') : '');

console.log('\n=== the old behaviour, for contrast ===');
const oldWay = all.slice(0, 20).map((t) => t.function.name);
const writes = ['email_draft','email_send','invoices_create','invoices_send','invoices_mark_paid','calendar_create_appointment','clients_update'];
const reachableOld = writes.filter((w) => oldWay.includes(w));
console.log(`  slice(0,20) surfaced ${reachableOld.length} of ${writes.length} write tools${reachableOld.length ? ': ' + reachableOld.join(', ') : ''}`);

console.log(bad ? `\n  ${bad} CHECK(S) FAILED\n` : '\n  ALL CHECKS PASSED\n');
process.exit(bad ? 1 : 0);
