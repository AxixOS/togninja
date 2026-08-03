import { getSmtpTransporter, getFromAddress } from '../utils/smtp-helper';

export async function sendNotification(opts: { to: string; subject: string; html: string }) {
  const transporter = await getSmtpTransporter();
  const from = await getFromAddress();
  await transporter.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html });
}
