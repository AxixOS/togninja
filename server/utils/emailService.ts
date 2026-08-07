import nodemailer from 'nodemailer';
import { config } from '../config-reader';

// Email service for questionnaire notifications
export async function sendStudioNotificationEmail(clientName: string, clientEmail: string, answers: any, link: any) {
  try {
    // Get email settings from DB first, then environment variables
    const emailSettings = {
      host: await config.getOrDefault('smtp_host', 'smtp.easyname.com'),
      port: await config.getNumber('smtp_port', 587),
      user: await config.get('smtp_user') || process.env.EMAIL_USER,
      pass: await config.get('smtp_pass') || process.env.EMAIL_PASS,
      fromEmail: await config.getOrDefault('from_email', ''),
      studioEmail: await config.getOrDefault('studio_notify_email', '')
    };

    if (!emailSettings.user || !emailSettings.pass) {
      console.error('Email credentials not configured');
      return;
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
Neue Fragebogen-Antwort erhalten!

Client: ${clientName}
Email: ${clientEmail}

Antworten:
${answersText}

---
${process.env.STUDIO_NAME || 'My Studio'} CRM System
    `;

    const html = `
      <h2>Neue Fragebogen-Antwort erhalten!</h2>
      
      <p><strong>Client:</strong> ${clientName}</p>
      <p><strong>Email:</strong> ${clientEmail}</p>
      
      <h3>Antworten:</h3>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
        ${answersText.split('\n').map(line => line ? `<p>${line}</p>` : '').join('')}
      </div>
      
      <hr>
      <p style="color: #666; font-size: 12px;">${process.env.STUDIO_NAME || 'My Studio'} CRM System</p>
    `;

    await transporter.sendMail({
      from: `"${process.env.STUDIO_NAME || 'My Studio'}" <${emailSettings.fromEmail}>`,
      to: emailSettings.studioEmail,
      subject,
      text,
      html
    });

    console.log('Studio notification email sent successfully');
  } catch (error) {
    console.error('Error sending studio notification email:', error);
    throw error;
  }
}

export async function sendClientConfirmationEmail(clientEmail: string, clientName: string) {
  try {
    const emailSettings = {
      host: process.env.SMTP_HOST || 'smtp.easyname.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
      fromEmail: process.env.FROM_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com'
    };

    if (!emailSettings.user || !emailSettings.pass) {
      console.error('Email credentials not configured');
      return;
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

    const studioName = process.env.STUDIO_NAME || 'My Studio';
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
  } catch (error) {
    console.error('Error sending client confirmation email:', error);
    throw error;
  }
}
