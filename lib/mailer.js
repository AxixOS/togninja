const nodemailer = require('nodemailer');
const { ENV } = require('./env');

let _tx = null;
function mailer() {
  if (_tx) return _tx;
  if (!ENV || !ENV.SMTP_HOST) {
    // Fallback JSON transport for development when SMTP missing
    _tx = nodemailer.createTransport({ jsonTransport: true });
    return _tx;
  }
  _tx = nodemailer.createTransport({
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT || 587,
    secure: (ENV.SMTP_PORT || 587) === 465,
    auth: ENV.SMTP_USER ? { user: ENV.SMTP_USER, pass: ENV.SMTP_PASS } : undefined,
  });
  return _tx;
}

async function assertMailer() {
  try {
    const ok = await mailer().verify();
    if (!ok) throw new Error('SMTP verify failed');
  } catch (e) {
    throw new Error('SMTP verify failed. Check SMTP_* env vars.');
  }
}

module.exports = { mailer, assertMailer };
