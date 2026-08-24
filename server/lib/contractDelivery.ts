// Get the executed contract to the people who are bound by it.
//
// POST /api/contracts/public/:token/sign already detects the moment every signer has
// signed — it flips contracts.status to 'signed' inside the same transaction. Up to now
// that transition told nobody. The studio could see it by opening the admin; the client
// who had just signed a legal document received nothing at all, and had no copy of what
// they had agreed to. A contract nobody holds a copy of is not a contract anyone can rely
// on.
//
// THE TWO RULES THIS FILE IS BUILT ON, both taken from server/lib/bookingEmails.ts:
//
//  1. The result of sending is READ. EnhancedEmailService returns success:true WITH
//     demo:true when it did not actually send anything, and the gallery route once awaited
//     it and returned ok:true regardless — so the studio was told a client had their photos
//     when no mail had left the building. Demo is NOT sent. A timeout is NOT sent. Only a
//     real, confirmed hand-off counts.
//
//  2. A failure never costs the signature. The signing already happened and it is the thing
//     that matters: the row is committed before this is called, and nothing in here throws
//     back into the request. Best-effort delivery, honest about which parts happened.
//
// AND A THIRD, SPECIFIC TO A DEMO INSTANCE
//
// DEMO_MODE is true on the live demo. server/lib/demoMode.ts exists precisely so a demo
// cannot produce real-world side effects, and EnhancedEmailService does NOT check it — its
// idea of "demo" is only "no transporter configured". A demo instance that happens to have
// working SMTP would therefore email real strangers whatever a visitor typed into the
// signing page. So the gate is here, before the service, and it reports honestly that
// nothing was sent.
//
// That gate used to RETURN before the send loop, and in doing so it quietly falsified the
// paragraph below it: nothing reached EnhancedEmailService, so nothing was written to
// crm_messages, so on the one instance this header names as the live one the studio had no
// trace of a delivery at all beyond a line in the server log. There are two ways to make
// the file agree with itself and only one of them keeps the studio informed. Dropping the
// gate would let a demo with working SMTP mail real strangers — the exact side effect
// demoMode.ts exists to prevent, so that is not on the table. Amending the paragraph to
// admit "except under DEMO_MODE, where nothing is recorded" would be honest prose about a
// silent drop, and a message that disappears without a trace is a worse outcome than one
// recorded as not sent. So the gate stays exactly where it is and the record is written
// HERE instead, by recordDemoDelivery(), in the shape and with the status the mail service
// would have used. Not sent is still not sent: `emailed` stays false, `emailedCount` stays
// 0, the problem string says so in words, and the row is filed 'demo_sent', never 'sent'.
//
// WHERE THE STUDIO SEES THE OUTCOME
//
// contracts has no column for a delivery result and adding one is not this change's to
// make. Where a SEND is attempted, the record is durable: EnhancedEmailService writes the
// real ones as status 'sent' and its own unconfigured-SMTP ones as 'demo_sent', and
// recordDemoDelivery() below writes the DEMO_MODE ones, also 'demo_sent'. The sent-mail
// view files that status under Sent — GET /api/emails/sent and AdminInboxPageV2 both name
// it — and the demo rows carry the disclaimer in their subject, because that view renders
// the subject and ignores the status.
//
// This paragraph used to claim that EVERY attempt lands in crm_messages. It does not, and
// saying so was exactly the kind of overclaim this file exists to prevent. THREE paths
// return before any row is written: the contract no longer exists, the PDF could not be
// built, and there is nobody to send to. Each returns a `problem` string, and the caller
// logs it — but nothing durable is filed, so a studio reading the Sent folder alone would
// not learn that delivery was attempted and failed. That gap is known and named here
// rather than papered over; GET /:id/pdf remains the fallback that needs no mail at all.
import { pool } from '../db';
import { EnhancedEmailService } from '../services/enhancedEmailService';
import { isDemoMode } from './demoMode';
import { config } from '../config-reader';
import { formatMoney, studioMoneyContext } from './money';
import { MERGE_FIELDS, resolveStudioEmail } from '../../shared/contractMerge';
import {
  renderExecutedContractPdf,
  executedContractFilename,
  stampLocal,
  type ExecutedSigner,
  type ExecutedStudio,
  type ExecutedContract,
} from './contractPdf';

/** One person the executed copy was addressed to, and whether it truly reached the mailer. */
export interface ContractDeliveryRecipient {
  email: string;
  name: string;
  /** 'signer' — a party to the contract. 'studio' — the studio's own file copy. */
  as: 'signer' | 'studio';
  emailed: boolean;
  /** Why not, when `emailed` is false. Never blank in that case. */
  problem?: string;
}

export interface ContractDeliveryResult {
  /** Did the PDF get built at all? Everything else is meaningless if not. */
  generated: boolean;
  filename?: string;
  recipients: ContractDeliveryRecipient[];
  emailedCount: number;
  /** Set whenever anything did not happen. Read this before telling anybody "sent". */
  problem?: string;
}

/**
 * A send that never hangs the signer's request.
 *
 * The signature is committed by the time this runs, but the HTTP response is not sent
 * until delivery finishes, and a wedged SMTP socket would leave the client on a spinner
 * long enough to hit Sign again — which the conditional UPDATE then refuses with a 409, so
 * a person who successfully signed is shown an error. Twenty-five seconds, and a timeout
 * counts as NOT sent: a send that later succeeds and was reported as failed is a nuisance,
 * the reverse is a lie.
 */
const SEND_TIMEOUT_MS = 25_000;

function withTimeout<T>(work: Promise<T>): Promise<T | { timedOut: true }> {
  let timer: any = null;
  const expiry = new Promise<{ timedOut: true }>((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), SEND_TIMEOUT_MS);
  });
  // race() subscribes to `work`, so a rejection arriving after the timeout is already
  // handled and cannot surface as an unhandled rejection and take the process down.
  return Promise.race([work, expiry]).finally(() => clearTimeout(timer));
}

const escapeHtml = (v: unknown) =>
  String(v == null ? '' : v)
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;');

/** The merge keys MERGE_FIELDS calls money, so a new one is picked up without editing this. */
const MONEY_KEYS = MERGE_FIELDS.filter((f) => f.source === 'money').map((f) => f.key);

/**
 * Bare numbers only.
 *
 * A studio that typed "1.200,00 EUR" or "$1,200" into the composer got that exact string
 * merged into contracts.body, and the body IS the agreement. Re-formatting it for the
 * summary block risks printing a different number two inches above the clause it restates.
 * So only a value with nothing in it but digits and one decimal point is handed to
 * formatMoney; everything else is reproduced character for character.
 */
const BARE_NUMBER = /^-?\d+(\.\d{1,2})?$/;

async function moneyLines(mergeValues: any): Promise<Array<{ label: string; value: string }>> {
  const values = mergeValues && typeof mergeValues === 'object' ? mergeValues : {};
  const out: Array<{ label: string; value: string }> = [];
  for (const key of MONEY_KEYS) {
    const raw = String(values[key] ?? '').trim();
    if (!raw) continue;
    out.push({
      label: key,
      value: BARE_NUMBER.test(raw) ? await formatMoney(Number(raw)) : raw,
    });
  }
  return out;
}

interface StudioRow {
  studio: ExecutedStudio;
  timezone: string;
  locale: string;
}

async function studioContext(): Promise<StudioRow> {
  const r = await pool.query(
    `SELECT studio_name, business_name, email, phone, address, city, country,
            timezone, date_format
       FROM studio_configs LIMIT 1`,
  ).catch(() => ({ rows: [] as any[] }));
  const s: any = r.rows?.[0] || {};

  // The studio's own zone. DEFAULT_CAL_TZ is hydrated from this same column by
  // config-reader, so it is the same value by a different route and only used when the
  // query above found nothing. UTC is the fallback — stating the wrong local time on a
  // signature is worse than stating a neutral one, and no studio is assumed European.
  const timezone = String(s.timezone || process.env.DEFAULT_CAL_TZ || 'UTC').trim() || 'UTC';

  // date_format is 'auto' or a BCP-47 tag. When it is auto, the locale money.ts already
  // derives from site_language is reused rather than derived a second time here.
  const configured = String(s.date_format || '').trim();
  const locale = configured && configured.toLowerCase() !== 'auto'
    ? configured
    : (await studioMoneyContext()).locale;

  return {
    timezone,
    locale,
    studio: {
      name: s.studio_name || s.business_name || '',
      // The SAME chain as the merge engine and the composer preview. Resolved here
      // independently, this became a fourth answer to "what is the studio's email" —
      // and it feeds both the executed-copy recipient list and the PDF letterhead, so
      // disagreeing with the body text produces a contract that contradicts itself.
      email: resolveStudioEmail(s),
      phone: s.phone || '',
      address: s.address || '',
      city: s.city || '',
      country: s.country || '',
    },
  };
}

export interface ExecutedContractPackage {
  pdf: Buffer;
  filename: string;
  contract: ExecutedContract;
  signers: ExecutedSigner[];
  studio: ExecutedStudio;
  timezone: string;
  locale: string;
}

/**
 * Build the executed copy.
 *
 * Returns null when there is no such contract, and throws `not_executed` when somebody has
 * not signed yet — a half-signed PDF handed to a client is a document that looks binding
 * and is not, which is the one outcome worth refusing outright.
 */
export async function buildExecutedContract(contractId: string): Promise<ExecutedContractPackage | null> {
  const c = await pool.query(
    `SELECT id, title, body, status, merge_values, created_at, sent_at, viewed_at, signed_at
       FROM contracts WHERE id = $1`,
    [contractId],
  );
  if (!c.rows.length) return null;
  const row: any = c.rows[0];

  const s = await pool.query(
    `SELECT name, email, role, signed_at, signature, signed_ip, signed_user_agent
       FROM contract_signers WHERE contract_id = $1 ORDER BY sort_order, created_at`,
    [contractId],
  );
  const signers: ExecutedSigner[] = s.rows.map((x: any) => ({
    name: x.name || '',
    email: x.email || '',
    role: x.role || 'client',
    signedAt: x.signed_at || null,
    signature: x.signature || null,
    signedIp: x.signed_ip || null,
    signedUserAgent: x.signed_user_agent || null,
  }));

  if (!signers.length || signers.some((x) => !x.signedAt)) {
    const err: any = new Error('This contract is not signed by everybody yet.');
    err.code = 'not_executed';
    throw err;
  }

  const ctx = await studioContext();
  const contract: ExecutedContract = {
    id: row.id,
    title: row.title || 'Contract',
    body: row.body || '',
    status: row.status,
    createdAt: row.created_at,
    sentAt: row.sent_at,
    viewedAt: row.viewed_at,
    signedAt: row.signed_at,
  };

  const pdf = await renderExecutedContractPdf({
    contract,
    signers,
    studio: ctx.studio,
    timezone: ctx.timezone,
    locale: ctx.locale,
    amounts: await moneyLines(row.merge_values),
  });

  return {
    pdf,
    filename: executedContractFilename(contract.title, contract.id),
    contract,
    signers,
    studio: ctx.studio,
    timezone: ctx.timezone,
    locale: ctx.locale,
  };
}

/**
 * Write down the attempt DEMO_MODE refused to make.
 *
 * Shaped exactly like the row EnhancedEmailService writes on its own demo path — outbound,
 * status 'demo_sent', the recipient in recipient_email — because the sent-mail view keys off
 * precisely those, and a differently shaped row would simply never appear.
 *
 * Raw SQL with the columns named, not a Drizzle object literal: crm_messages declares
 * sender_name, sender_email, subject, content and message_type NOT NULL, and a mistyped key
 * in a Drizzle insert is dropped in silence rather than rejected — which here would surface
 * as a NOT NULL violation on a column the code appears to set.
 *
 * Never throws. Rule 2 of this file is that delivery cannot cost the signature, and that has
 * to hold for the bookkeeping too. Returns whether the row really was written, so the caller
 * can avoid claiming a record it does not have.
 */
async function recordDemoDelivery(
  to: string,
  subject: string,
  content: string,
  filename: string,
): Promise<boolean> {
  try {
    const fromEmail = (await config.get('from_email')) || process.env.SMTP_FROM || process.env.SMTP_USER || 'demo@example.com';
    const fromName = (await config.get('business_name')) || process.env.BUSINESS_NAME || 'Studio';
    await pool.query(
      `INSERT INTO crm_messages
         (sender_name, sender_email, recipient_email, subject, content,
          message_type, status, direction, email_message_id, attachments, sent_at, created_at)
       VALUES ($1, $2, $3, $4, $5, 'email', 'demo_sent', 'outbound', $6, $7::jsonb, NOW(), NOW())`,
      [
        String(fromName),
        String(fromEmail),
        to,
        // Marked in the SUBJECT, not only in status. See the note above recordDemoDelivery.
        `[DEMO — not actually sent] ${subject}`,
        content,
        `demo_${Date.now()}`,
        JSON.stringify([{ filename, contentType: 'application/pdf' }]),
      ],
    );
    return true;
  } catch (e: any) {
    console.warn('[contracts] demo delivery could not be recorded:', e?.message);
    return false;
  }
}

/**
 * Email the executed copy to every signer and to the studio.
 *
 * Never throws. Every failure comes back in the result, named, so a caller cannot
 * accidentally report a delivery it did not make.
 */
export async function deliverExecutedContract(contractId: string): Promise<ContractDeliveryResult> {
  let pkg: ExecutedContractPackage | null = null;
  try {
    pkg = await buildExecutedContract(contractId);
  } catch (e: any) {
    console.error('[contracts] executed PDF could not be built:', e?.message);
    return {
      generated: false,
      recipients: [],
      emailedCount: 0,
      problem: `The signature is recorded, but the signed copy could not be produced: ${e?.message || 'unknown error'}`,
    };
  }
  if (!pkg) {
    return { generated: false, recipients: [], emailedCount: 0, problem: 'That contract no longer exists.' };
  }

  const { pdf, filename, contract, signers, studio, timezone, locale } = pkg;

  // Every signer, then the studio's own file copy. Deduplicated on the address because the
  // studio is very often a signer too (the schema expects exactly that), and sending the
  // same person two identical copies looks like a bug in the product.
  const targets: ContractDeliveryRecipient[] = [];
  const seen = new Set<string>();
  const add = (email: string, name: string, as: 'signer' | 'studio') => {
    const key = String(email || '').trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    targets.push({ email: String(email).trim(), name: name || '', as, emailed: false });
  };
  for (const s of signers) add(s.email, s.name, 'signer');
  add(studio.email, studio.name, 'studio');

  if (!targets.length) {
    return {
      generated: true,
      filename,
      recipients: [],
      emailedCount: 0,
      problem: 'The signed copy was produced but there was no address to send it to.',
    };
  }

  const executedAt = stampLocal(contract.signedAt, timezone, locale);
  const whoSigned = signers
    .map((s) => `${s.name} (${s.email}) — ${stampLocal(s.signedAt, timezone, locale)}`)
    .join('\n');
  const whoSignedHtml = signers
    .map((s) => `<li>${escapeHtml(s.name)} &lt;${escapeHtml(s.email)}&gt; — ${escapeHtml(stampLocal(s.signedAt, timezone, locale))}</li>`)
    .join('');

  const problems: string[] = [];

  // The demo gate. Before the mailer, not after it — see the header. Read ONCE, so every
  // recipient of one delivery is treated the same way and a half-demo result is impossible.
  const demo = isDemoMode();
  let demoRecorded = 0;

  for (const t of targets) {
    const forStudio = t.as === 'studio';
    const subject = forStudio
      ? `Signed contract — ${contract.title}`
      : `Your signed copy — ${contract.title}`;
    const intro = forStudio
      ? `<p>Every signer has now signed <strong>${escapeHtml(contract.title)}</strong>. The executed copy is attached for your records.</p>`
      : `<p>Hi ${escapeHtml((t.name || '').split(' ')[0] || t.name)},</p>
         <p>Everyone has now signed <strong>${escapeHtml(contract.title)}</strong>. Your copy is attached, including the record of who signed and when.</p>`;

    // Built before the branch rather than inside the send call: the demo record has to
    // carry the same words a real send would have carried, or the sent-mail view shows a
    // stand-in for a message that was never actually composed.
    const content =
      `${contract.title}\n\nFully executed ${executedAt}.\n\nSigned by:\n${whoSigned}\n\n` +
      `The signed PDF is attached.`;
    const html = `${intro}
                 <p style="color:#666">Fully executed ${escapeHtml(executedAt)}.</p>
                 <ul style="color:#666">${whoSignedHtml}</ul>
                 <p style="color:#666">${escapeHtml(studio.name)}</p>`;

    if (demo) {
      // Nothing is handed to the mailer. The attempt is still written down, so the studio
      // can see what would have gone where — filed as demo_sent, which is not sent.
      t.emailed = false;
      const recorded = await recordDemoDelivery(t.email, subject, content, filename);
      if (recorded) demoRecorded++;
      t.problem = recorded
        ? 'DEMO_MODE is on, so no email was sent. The message is in the sent-mail view, filed as demo_sent.'
        : 'DEMO_MODE is on, so no email was sent — and the record of it could not be written either.';
    } else {
      try {
        const sent: any = await withTimeout(
          EnhancedEmailService.sendEmail({
            to: t.email,
            subject,
            content,
            html,
            attachments: [{ filename, content: pdf, contentType: 'application/pdf' }],
            autoLinkClient: true,
          }),
        );

        if (sent && sent.timedOut) {
          t.problem = `No confirmation from the mail server within ${Math.round(SEND_TIMEOUT_MS / 1000)} seconds, so this copy is not confirmed as sent.`;
        } else if (sent?.demo) {
          // success:true WITH demo:true. Reading only `success` is the exact defect the
          // gallery route shipped.
          t.problem = sent?.error || 'No mail server is configured, so nothing was sent.';
        } else if (sent?.success === false) {
          t.problem = sent?.error || 'The mail server refused it.';
        } else {
          t.emailed = true;
        }
      } catch (e: any) {
        t.problem = e?.message || 'The send failed.';
      }
    }
    if (!t.emailed) {
      problems.push(`${t.email}: ${t.problem}`);
    }
  }

  const emailedCount = targets.filter((t) => t.emailed).length;
  return {
    generated: true,
    filename,
    recipients: targets,
    emailedCount,
    problem: demo
      ? `The contract is signed and the signed copy was produced, but this instance runs in demo mode so nothing was emailed to ${targets.length === 1 ? 'the signer' : 'the signers'} or the studio. ${
        demoRecorded === targets.length
          ? 'Each copy is listed in the sent-mail view as demo_sent.'
          : `Only ${demoRecorded} of ${targets.length} could even be recorded in the sent-mail view.`
      } Download it from the contract instead.`
      : problems.length
        ? `The contract is signed and the signed copy was produced, but it did not reach everybody — ${problems.join('; ')}`
        : undefined,
  };
}
