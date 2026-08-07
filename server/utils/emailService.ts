import nodemailer from 'nodemailer';
import { config } from '../config-reader';

// Get email settings from DB first (per-studio /setup), then environment variables.
// Both mails below share this so a studio that configured SMTP in the wizard gets
// BOTH the notification and the client confirmation — not just one.
async function getEmailSettings() {
  const user = await config.get('smtp_user') || process.env.EMAIL_USER || '';
  const fromEmail = await config.getOrDefault('from_email', '') || user;
  return {
    host: await config.getOrDefault('smtp_host', 'smtp.easyname.com'),
    port: await config.getNumber('smtp_port', 587),
    user,
    pass: await config.get('smtp_pass') || process.env.EMAIL_PASS || '',
    fromEmail,
    // Notify the studio at its notify address, falling back to the SMTP/from address.
    studioEmail: (await config.getOrDefault('studio_notify_email', '')) || fromEmail
  };
}

// The studio's own name, per tenant — never hardcode a studio here.
async function getStudioName() {
  return (await config.getOrDefault('business_name', ''))
    || (await config.getOrDefault('studio_name', ''))
    || process.env.STUDIO_NAME
    || 'My Studio';
}

// Email service for questionnaire notifications
export async function sendStudioNotificationEmail(clientName: string, clientEmail: string, answers: any, link: any): Promise<boolean> {
  try {
    const emailSettings = await getEmailSettings();
    const studioName = await getStudioName();

    if (!emailSettings.user || !emailSettings.pass) {
      console.error('Email credentials not configured');
      return false;
    }
    if (!emailSettings.studioEmail) {
      console.error('Studio notification recipient not configured (studio_notify_email)');
      return false;
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailSettings.host,
      port: emailSettings.port,
      secure: emailSettings.port === 465,
      auth: {
        user: emailSettings.user,
        pass: emailSettings.pass
      }
    });

    // Build answers summary
    let answersText = '';
    for (const [key, value] of Object.entries(answers)) {
      const cleanKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      answersText += `${cleanKey}: ${value}\n`;
    }

    const subject = `New Client Questionnaire - ${clientName}`;
    const text = `
New questionnaire response received!

Client: ${clientName}
Email: ${clientEmail}

Answers:
${answersText}

---
${studioName} CRM System
    `;

    const html = `
      <h2>New questionnaire response received!</h2>

      <p><strong>Client:</strong> ${clientName}</p>
      <p><strong>Email:</strong> ${clientEmail}</p>

      <h3>Answers:</h3>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
        ${answersText.split('\n').map(line => line ? `<p>${line}</p>` : '').join('')}
      </div>

      <hr>
      <p style="color: #666; font-size: 12px;">${studioName} CRM System</p>
    `;

    await transporter.sendMail({
      from: `"${studioName}" <${emailSettings.fromEmail}>`,
      to: emailSettings.studioEmail,
      subject,
      text,
      html
    });

    console.log('Studio notification email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending studio notification email:', error);
    return false;
  }
}

export async function sendClientConfirmationEmail(clientEmail: string, clientName: string): Promise<boolean> {
  try {
    const emailSettings = await getEmailSettings();

    if (!emailSettings.user || !emailSettings.pass) {
      console.error('Email credentials not configured');
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: emailSettings.host,
      port: emailSettings.port,
      secure: emailSettings.port === 465,
      auth: {
        user: emailSettings.user,
        pass: emailSettings.pass
      }
    });

    const studioName = await getStudioName();
    const siteUrl = process.env.APP_URL || process.env.BASE_URL || '';

    // Try to load customised template from database (neutral English default)
    let tplSubject = 'Thank you for completing your questionnaire';
    let tplBody = `Dear {{clientName}},

Thank you for completing our questionnaire!

We've received your answers and will be in touch shortly to discuss the details of your photo session.

If you have any questions in the meantime, feel free to reach out.

Kind regards,
The {{studioName}} team`;
    let tplFooter = '{{studioName}} • {{siteUrl}}';

    try {
      // Dynamic import to avoid circular dependency
      const { neon } = await import('../db-compat.js');
      const sql = neon(process.env.DATABASE_URL!);
      const rows = await sql`SELECT value FROM app_settings WHERE key = 'questionnaire_confirmation_email' LIMIT 1`;
      if (rows.length > 0) {
        const saved = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
        if (saved.subject) tplSubject = saved.subject;
        if (saved.body) tplBody = saved.body;
        if (saved.footer) tplFooter = saved.footer;
      }
    } catch (dbErr) {
      console.log('Using default email template (DB lookup failed):', dbErr);
    }

    // Replace placeholders
    const replacePlaceholders = (text: string) =>
      text.replace(/\{\{clientName\}\}/g, clientName)
          .replace(/\{\{studioName\}\}/g, studioName)
          .replace(/\{\{siteUrl\}\}/g, siteUrl);

    const subject = replacePlaceholders(tplSubject);
    const bodyText = replacePlaceholders(tplBody);
    const footerText = replacePlaceholders(tplFooter);

    const text = bodyText + '\n\n---\n' + footerText;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${bodyText.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<br>').join('\n        ')}
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          ${footerText}
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"${studioName}" <${emailSettings.fromEmail}>`,
      to: clientEmail,
      subject,
      text,
      html
    });

    console.log('Client confirmation email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending client confirmation email:', error);
    return false;
  }
}
