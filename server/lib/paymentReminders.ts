// Chasing an unpaid invoice, without chasing somebody who already paid.
//
// WHAT EXISTED BEFORE: nothing. Three schedulers run in this product and none of them touch
// invoices, there is no dunning logic anywhere, and 'overdue' is a value the status dropdown
// offers that no code path has ever written. An invoice went out and was never mentioned
// again.
//
// THE ORDER THIS HAD TO BE BUILT IN. Reminders on top of wrong payment state are worse than
// no reminders: the studio emails a client who has already paid, which costs more goodwill
// than the invoice is worth. So server/lib/reconcileInvoicePayments.ts came first (v1.9.107),
// and every send here re-reads the invoice immediately beforehand rather than trusting the
// row it was selected with.
//
// WHAT IT WILL NOT DO:
//   - Send twice for the same stage. Each send is recorded on the invoice.
//   - Send to a paid, cancelled or draft invoice.
//   - Send without a due date. "Overdue" is meaningless then, and guessing a due date to
//     chase somebody with is not a guess worth making.
//   - Send in DEMO_MODE. It records what it WOULD have sent instead, marked as such — the
//     same honesty rule the contract delivery path settled on.
import { pool } from '../db';
import { documentBrand, formatDocumentMoney } from './documentBrand';

export type ReminderStage = 'due-soon' | 'due-today' | 'overdue-7' | 'overdue-14';

interface StageRule {
  stage: ReminderStage;
  /** Days relative to the due date. Negative is before. */
  offset: number;
  subject: (n: string, brand: string) => string;
  opening: (due: string) => string;
}

/**
 * Four touches and then silence.
 *
 * Deliberately not an endless sequence. After two weeks past due this stops emailing and
 * leaves the invoice marked overdue for a human to deal with — an automated system that
 * keeps mailing somebody indefinitely is how a studio loses a client it might have kept.
 */
const STAGES: StageRule[] = [
  {
    stage: 'due-soon',
    offset: -3,
    subject: (n, b) => `Invoice ${n} from ${b} is due in a few days`,
    opening: (due) => `A quick note that this invoice is due on ${due}.`,
  },
  {
    stage: 'due-today',
    offset: 0,
    subject: (n, b) => `Invoice ${n} from ${b} is due today`,
    opening: (due) => `This invoice is due today, ${due}.`,
  },
  {
    stage: 'overdue-7',
    offset: 7,
    subject: (n, b) => `Invoice ${n} from ${b} is now overdue`,
    opening: (due) => `This invoice was due on ${due} and is still showing as unpaid.`,
  },
  {
    stage: 'overdue-14',
    offset: 14,
    subject: (n, b) => `Invoice ${n} from ${b} — two weeks overdue`,
    opening: (due) => `This invoice was due on ${due}. If it has been paid, please ignore this.`,
  },
];

export interface ReminderResult {
  considered: number;
  sent: number;
  markedOverdue: number;
  details: string[];
  problem?: string;
}

/** Whole days between two dates, ignoring the time of day. */
function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

/** The stage an invoice is due for today, if any. */
export function stageForInvoice(dueDate: Date, today: Date, alreadySent: string[]): StageRule | null {
  const past = daysBetween(dueDate, today);
  // Walk latest-first: an instance that was asleep for a week should send the stage that is
  // now correct, not work through three stale ones in a row.
  for (const rule of [...STAGES].reverse()) {
    if (past >= rule.offset && !alreadySent.includes(rule.stage)) return rule;
  }
  return null;
}

export async function runPaymentReminders(limit = 50): Promise<ReminderResult> {
  const out: ReminderResult = { considered: 0, sent: 0, markedOverdue: 0, details: [] };
  const today = new Date();

  const rows = await pool.query(
    `SELECT i.id, i.invoice_number, i.status, i.due_date, i.total, i.currency,
            i.reminders_sent, c.email AS client_email, c.first_name, c.last_name
       FROM crm_invoices i
       LEFT JOIN crm_clients c ON c.id = i.client_id
      WHERE i.due_date IS NOT NULL
        AND coalesce(i.status, '') NOT IN ('paid', 'cancelled', 'draft', 'void')
      ORDER BY i.due_date ASC
      LIMIT $1`,
    [limit],
  ).catch((e: any) => {
    out.problem = `Could not read invoices: ${e?.message}`;
    return { rows: [] as any[] };
  });
  if (out.problem) return out;

  const brand = await documentBrand();
  const { isDemoMode } = await import('./demoMode').catch(() => ({ isDemoMode: () => false })) as any;
  const demo = typeof isDemoMode === 'function' ? !!isDemoMode() : false;

  for (const inv of rows.rows as any[]) {
    out.considered++;
    const due = new Date(inv.due_date);
    if (Number.isNaN(due.getTime())) continue;

    // Mark it overdue. Nothing in this product has ever written this status, so an invoice
    // sat at 'sent' forever however late it was — and any screen filtering on overdue found
    // nothing, which reads as "nothing is late".
    if (daysBetween(due, today) > 0 && String(inv.status) !== 'overdue') {
      await pool.query(`UPDATE crm_invoices SET status = 'overdue' WHERE id = $1`, [inv.id])
        .then(() => { out.markedOverdue++; })
        .catch(() => { /* a status that will not write is not a reason to skip the email */ });
    }

    const sentStages: string[] = Array.isArray(inv.reminders_sent)
      ? inv.reminders_sent.map((r: any) => String(r?.stage || '')).filter(Boolean)
      : [];
    const rule = stageForInvoice(due, today, sentStages);
    if (!rule) continue;

    const to = String(inv.client_email || '').trim();
    if (!to) {
      out.details.push(`${inv.invoice_number}: no client email, skipped`);
      continue;
    }

    // RE-READ before sending. This row was selected up to a few seconds ago and the
    // reconciler runs on its own schedule — the whole point of that job is that an invoice
    // can turn out to be paid without anyone here knowing.
    const fresh = await pool.query(`SELECT status FROM crm_invoices WHERE id = $1`, [inv.id])
      .catch(() => ({ rows: [] as any[] }));
    const freshStatus = String(fresh.rows?.[0]?.status || '');
    if (['paid', 'cancelled', 'draft', 'void'].includes(freshStatus)) {
      out.details.push(`${inv.invoice_number}: became ${freshStatus} before sending, skipped`);
      continue;
    }

    const dueText = due.toLocaleDateString(brand.locale, { year: 'numeric', month: 'long', day: 'numeric' });
    const amount = formatDocumentMoney(parseFloat(String(inv.total ?? '0')) || 0, brand);
    const who = String(inv.first_name || '').trim() || 'there';
    const subject = rule.subject(String(inv.invoice_number), brand.name || 'your photographer');
    const body = [
      `Hi ${who},`,
      '',
      rule.opening(dueText),
      '',
      `Invoice ${inv.invoice_number} — ${amount}`,
      '',
      brand.name ? `Thank you,\n${brand.name}` : 'Thank you.',
    ].join('\n');

    if (demo) {
      // The same rule the contract path settled on: record what WOULD have gone, marked so
      // nobody reading the sent folder believes a client received it.
      await pool.query(
        `INSERT INTO crm_messages (sender_name, sender_email, recipient_email, subject, content,
           message_type, status, direction, sent_at, created_at)
         VALUES ($1,$2,$3,$4,$5,'email','demo_sent','outbound',NOW(),NOW())`,
        [brand.name || 'Studio', brand.email || 'demo@example.com', to,
         `[DEMO — not actually sent] ${subject}`, body],
      ).catch(() => {});
      out.details.push(`${inv.invoice_number}: ${rule.stage} recorded (demo mode, nothing sent)`);
    } else {
      const { EnhancedEmailService } = await import('../services/enhancedEmailService');
      const res = await EnhancedEmailService.sendEmail({
        to, subject, content: body, autoLinkClient: true,
      }).catch((e: any) => ({ success: false, error: e?.message }));
      if (!res?.success) {
        out.details.push(`${inv.invoice_number}: ${rule.stage} FAILED — ${res?.error || 'unknown'}`);
        // Deliberately NOT recorded as sent. A failed send that marks itself done is a
        // reminder the client never gets and the studio never learns about.
        continue;
      }
      out.details.push(`${inv.invoice_number}: ${rule.stage} sent to ${to}`);
    }

    out.sent++;
    const next = [...(Array.isArray(inv.reminders_sent) ? inv.reminders_sent : []),
      { stage: rule.stage, at: new Date().toISOString(), demo }];
    await pool.query(`UPDATE crm_invoices SET reminders_sent = $2::jsonb WHERE id = $1`,
      [inv.id, JSON.stringify(next)]).catch(() => {});
  }

  return out;
}
