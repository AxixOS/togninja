// Tell the client their booking happened, and tell the studio.
//
// The scheduler saves confirmationMessage, sendReminders and reminderTimings — the admin
// form collects all three and the POST/PUT persist all three — and nothing anywhere sent an
// email. server/routes/scheduler.ts had no mail import at all. So a client picked a slot,
// filled in their details, saw a confirmation screen, and received nothing; and the studio
// found out only by opening the admin.
//
// Two rules, both learned from the gallery email that reported success while sending
// nothing:
//
//  - The result of sending is READ, and a failure is recorded and returned. Never
//    "await sendEmail(...)" followed by an unconditional success.
//  - A failure never breaks the booking. The slot is taken and the money may be committed;
//    losing the booking because a mail server hiccuped would be a far worse outcome than a
//    missing email. Best-effort, but honest about which.
import { EnhancedEmailService } from '../services/enhancedEmailService';
import { pool } from '../db';

export interface BookingEmailResult {
  clientEmailed: boolean;
  studioEmailed: boolean;
  /** Present when something did not send — surfaced to the studio, not swallowed. */
  problem?: string;
}

interface StudioIdentity {
  name: string;
  email: string;
  phone: string;
}

async function studio(): Promise<StudioIdentity> {
  const r = await pool.query(
    `SELECT studio_name, business_name, email, phone FROM studio_configs LIMIT 1`,
  ).catch(() => ({ rows: [] as any[] }));
  const s: any = r.rows?.[0] || {};
  return {
    name: s.studio_name || s.business_name || 'Your photographer',
    email: s.email || '',
    phone: s.phone || '',
  };
}

/** "Monday, 24 August 2026 at 2:00 pm" — in the studio's locale, not the server's. */
function when(date: Date | string, timezone?: string | null): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
      timeZone: timezone || undefined,
    });
  } catch {
    // An invalid timezone string must not cost the client their confirmation.
    return d.toLocaleString('en-GB');
  }
}

const escape = (v: string) =>
  String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Send the confirmation for a booking.
 *
 * Called from both places a booking becomes real: the auto-approve path at the moment of
 * booking, and the manual-confirm path when the studio approves it. Those are the only two
 * transitions to "confirmed", so they are the only two that should tell anybody.
 */
export async function sendBookingConfirmation(opts: {
  booking: {
    id: string;
    clientName: string;
    clientEmail: string;
    clientPhone?: string | null;
    clientNotes?: string | null;
    scheduledDate: Date | string;
    scheduledEndDate?: Date | string | null;
  };
  scheduler: {
    name: string;
    location?: string | null;
    confirmationMessage?: string | null;
    timezone?: string | null;
  };
}): Promise<BookingEmailResult> {
  const s = await studio();
  const b = opts.booking;
  const sch = opts.scheduler;
  const at = when(b.scheduledDate, sch.timezone);

  const problems: string[] = [];
  let clientEmailed = false;
  let studioEmailed = false;

  // ── to the client ─────────────────────────────────────────────────────────
  const detail = [
    `<p><strong>${escape(sch.name)}</strong></p>`,
    `<p>${escape(at)}</p>`,
    sch.location ? `<p>${escape(sch.location)}</p>` : '',
    // The studio's own words, if they wrote any. Their voice beats ours.
    sch.confirmationMessage ? `<p>${escape(sch.confirmationMessage)}</p>` : '',
    `<p style="color:#666">Need to change something? Reply to this email.</p>`,
  ].filter(Boolean).join('\n');

  try {
    const r: any = await EnhancedEmailService.sendEmail({
      to: b.clientEmail,
      subject: `Your booking is confirmed — ${sch.name}`,
      content: `${sch.name}\n${at}\n${sch.location || ''}\n\n${sch.confirmationMessage || ''}`,
      html: `<p>Hi ${escape(b.clientName.split(' ')[0] || b.clientName)},</p>
             <p>Your booking with ${escape(s.name)} is confirmed.</p>
             ${detail}`,
    });
    // The gallery route awaited this and returned ok:true regardless. In demo mode the
    // service reports success:true WITH demo:true and an error explaining nothing was sent.
    if (r?.demo) problems.push('No mail server is configured, so the client was not emailed.');
    else if (r?.success === false) problems.push(`The client could not be emailed: ${r?.error || 'unknown error'}`);
    else clientEmailed = true;
  } catch (e: any) {
    problems.push(`The client could not be emailed: ${e?.message || 'send failed'}`);
  }

  // ── to the studio ─────────────────────────────────────────────────────────
  if (s.email) {
    try {
      const r: any = await EnhancedEmailService.sendEmail({
        to: s.email,
        subject: `New booking — ${sch.name}, ${b.clientName}`,
        content: `${b.clientName} (${b.clientEmail}) booked ${sch.name} for ${at}.`,
        html: `<p><strong>${escape(b.clientName)}</strong> booked <strong>${escape(sch.name)}</strong>.</p>
               <p>${escape(at)}</p>
               <p>${escape(b.clientEmail)}${b.clientPhone ? ' · ' + escape(b.clientPhone) : ''}</p>
               ${b.clientNotes ? `<p><em>${escape(b.clientNotes)}</em></p>` : ''}`,
      });
      if (!r?.demo && r?.success !== false) studioEmailed = true;
    } catch {
      // The studio can see the booking in the admin; this one is genuinely optional.
    }
  }

  return {
    clientEmailed,
    studioEmailed,
    problem: problems.length ? problems.join(' ') : undefined,
  };
}
