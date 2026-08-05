/**
 * SMTP Transporter Factory
 *
 * Creates a Nodemailer transporter using the config-reader (DB first, env fallback).
 * Use this instead of hand-rolling transporter construction throughout routes.ts.
 *
 * Usage:
 *   import { getSmtpTransporter, getFromAddress } from './utils/smtp-helper';
 *   const transporter = await getSmtpTransporter();
 *   await transporter.sendMail({ from: await getFromAddress(), to, subject, html });
 */

import nodemailer from 'nodemailer';
import { config } from '../config-reader';

let cachedTransporter: nodemailer.Transporter | null = null;
let transporterCreatedAt = 0;
const TRANSPORTER_TTL = 5 * 60_000; // 5 minutes

/**
 * Get a reusable Nodemailer transporter configured from DB/env.
 * Caches the transporter for 5 minutes.
 */
export async function getSmtpTransporter(): Promise<nodemailer.Transporter> {
  const now = Date.now();
  if (cachedTransporter && (now - transporterCreatedAt) < TRANSPORTER_TTL) {
    return cachedTransporter;
  }

  const host = await config.getOrDefault('smtp_host', process.env.SMTP_HOST || 'smtp.easyname.com');
  // Default to 465 (implicit SSL) — the port the studio's working automations use
  // for easyname. 587/STARTTLS was the default and silently failed → demo mode →
  // "Sent" rows that never delivered. Override with smtp_port / SMTP_PORT if needed.
  const port = await config.getNumber('smtp_port', parseInt(process.env.SMTP_PORT || '465'));
  const user = await config.get('smtp_user') || process.env.BUSINESS_MAILBOX_USER || process.env.SMTP_USER || '';
  const pass = await config.get('smtp_pass') || process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || '';
  // Port 465 is implicit TLS — always secure on 465, even if smtp_secure was saved false
  // (a toggle left off would otherwise fail the handshake). Other ports use the saved flag.
  const secure = port === 465 ? true : await config.getBoolean('smtp_secure', false);

  if (!user || !pass) {
    console.warn('[smtp-helper] SMTP credentials not configured — emails will fail');
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });

  transporterCreatedAt = now;
  return cachedTransporter;
}

/**
 * Get the "From" address for outgoing emails.
 * Returns "Display Name <email>" format when from_name is set.
 */
export async function getFromAddress(): Promise<string> {
  const fromEmail = await config.get('from_email')
    || await config.get('studio_notify_email')
    // Fall back to the authenticated SMTP user, never a bare no-reply@localhost — most
    // providers (easyname included) reject a From that isn't the authenticated account.
    || await config.get('smtp_user')
    || process.env.SMTP_FROM
    || process.env.STUDIO_NOTIFY_EMAIL
    || process.env.SMTP_USER
    || 'no-reply@localhost';

  const fromName = await config.get('email_from_name')
    || process.env.EMAIL_FROM_NAME;

  if (fromName) {
    return `"${fromName}" <${fromEmail}>`;
  }
  return fromEmail;
}

/**
 * Invalidate the cached transporter (call after config changes).
 */
export function invalidateTransporter(): void {
  cachedTransporter = null;
  transporterCreatedAt = 0;
}

/**
 * Get IMAP connection config from DB/env.
 */
export async function getImapConfig() {
  return {
    host: await config.getOrDefault('imap_host', process.env.IMAP_HOST || process.env.INBOX_IMAP_HOST || 'imap.easyname.com'),
    port: await config.getNumber('imap_port', parseInt(process.env.IMAP_PORT || process.env.INBOX_IMAP_PORT || '993')),
    user: await config.get('imap_user') || process.env.IMAP_USER || process.env.INBOX_IMAP_USER || process.env.BUSINESS_MAILBOX_USER || '',
    password: await config.get('imap_pass') || process.env.IMAP_PASS || process.env.INBOX_IMAP_PASS || process.env.EMAIL_PASSWORD || '',
    tls: await config.getBoolean('imap_tls', true),
  };
}
