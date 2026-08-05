/**
 * Gmail via Google OAuth — the one-click alternative to Custom SMTP/IMAP for Google users.
 * No app password, no enabling IMAP: the studio clicks "Connect Gmail", grants access, and
 * we read/send through the Gmail API with the stored refresh token (reusing the same Google
 * OAuth app as Calendar). The connection lives on studio_integrations (gmail_email +
 * gmail_refresh_token_encrypted).
 */
import { google } from 'googleapis';
import { pool } from '../db';
import { encrypt, decrypt } from '../utils/encryption';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

export function gmailRedirectUri(): string {
  const base = process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3001';
  return `${base}/api/auth/google/callback`; // shared with Calendar — one URI to register
}

export function makeOAuthClient() {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, gmailRedirectUri());
}

export async function getGmailConnection(): Promise<{ email: string; refreshToken: string } | null> {
  try {
    const r = await pool.query('SELECT gmail_email, gmail_refresh_token_encrypted FROM studio_integrations LIMIT 1');
    const row = r.rows[0];
    if (!row?.gmail_email || !row?.gmail_refresh_token_encrypted) return null;
    const refreshToken = decrypt(row.gmail_refresh_token_encrypted);
    return refreshToken ? { email: row.gmail_email, refreshToken } : null;
  } catch { return null; }
}

export async function isGmailConnected(): Promise<boolean> {
  return !!(await getGmailConnection());
}

export async function saveGmailConnection(email: string, refreshToken: string): Promise<void> {
  const exists = await pool.query('SELECT 1 FROM studio_integrations LIMIT 1');
  if (!exists.rows[0]) await pool.query('INSERT INTO studio_integrations DEFAULT VALUES');
  await pool.query('UPDATE studio_integrations SET gmail_email = $1, gmail_refresh_token_encrypted = $2 WHERE TRUE', [email, encrypt(refreshToken)]);
}

export async function clearGmailConnection(): Promise<void> {
  await pool.query('UPDATE studio_integrations SET gmail_email = NULL, gmail_refresh_token_encrypted = NULL WHERE TRUE').catch(() => {});
}

async function authedGmail() {
  const conn = await getGmailConnection();
  if (!conn) throw new Error('Gmail is not connected');
  const auth = makeOAuthClient();
  auth.setCredentials({ refresh_token: conn.refreshToken });
  return { gmail: google.gmail({ version: 'v1', auth }), email: conn.email };
}

/** The address of the connected account (used in the OAuth callback to store it). */
export async function getConnectedEmail(auth: any): Promise<string> {
  const gmail = google.gmail({ version: 'v1', auth });
  const profile = await gmail.users.getProfile({ userId: 'me' });
  return profile.data.emailAddress || '';
}

function header(payload: any, name: string): string {
  const h = (payload?.headers || []).find((x: any) => (x.name || '').toLowerCase() === name.toLowerCase());
  return h?.value || '';
}

function decodeBody(payload: any): string {
  const walk = (p: any): string => {
    if (!p) return '';
    if (p.mimeType === 'text/plain' && p.body?.data) return Buffer.from(p.body.data, 'base64').toString('utf8');
    if (Array.isArray(p.parts)) { for (const part of p.parts) { const t = walk(part); if (t) return t; } }
    if (p.mimeType === 'text/html' && p.body?.data) return Buffer.from(p.body.data, 'base64').toString('utf8');
    return '';
  };
  return walk(payload);
}

function parseMessage(data: any) {
  const payload = data.payload || {};
  const from = header(payload, 'From');
  const fromEmail = (from.match(/<([^>]+)>/)?.[1] || from).trim() || 'unknown@unknown.com';
  const fromName = from.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || fromEmail;
  const subject = header(payload, 'Subject') || 'No Subject';
  const dateHeader = header(payload, 'Date');
  const date = dateHeader ? new Date(dateHeader) : new Date(Number(data.internalDate) || Date.now());
  const body = decodeBody(payload) || data.snippet || '';
  const isRead = !((data.labelIds || []).includes('UNREAD'));
  return { fromName, from: fromEmail, subject, body, date, isRead };
}

/** Read recent inbox messages via the Gmail API (parallels importEmailsFromIMAP's shape). */
export async function listRecentGmail(max = 50): Promise<any[]> {
  const { gmail } = await authedGmail();
  const list = await gmail.users.messages.list({ userId: 'me', maxResults: Math.min(Math.max(max, 1), 100), q: 'in:inbox' });
  const ids = (list.data.messages || []).map((m) => m.id!).filter(Boolean);
  const out: any[] = [];
  for (const id of ids) {
    try {
      const msg = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
      out.push(parseMessage(msg.data));
    } catch { /* skip a bad message */ }
  }
  return out;
}

/** Send an email via the Gmail API (used by the send path when Gmail is connected). */
export async function sendViaGmail(opts: { to: string; subject: string; html?: string; text?: string; from?: string }): Promise<void> {
  const { gmail, email } = await authedGmail();
  const from = opts.from || email;
  const contentType = opts.html ? 'text/html' : 'text/plain';
  const mime = [
    `From: ${from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: ${contentType}; charset=UTF-8`,
    '',
    opts.html || opts.text || '',
  ].join('\r\n');
  const raw = Buffer.from(mime).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}
