"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendStudioNotificationEmail = sendStudioNotificationEmail;
exports.sendClientConfirmationEmail = sendClientConfirmationEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Email service for questionnaire notifications
async function sendStudioNotificationEmail(clientName, clientEmail, answers, link) {
    try {
        // Get email settings from database or environment
        const emailSettings = {
            host: process.env.SMTP_HOST || 'smtp.easyname.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            user: process.env.SMTP_USER || process.env.EMAIL_USER,
            pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
            fromEmail: process.env.FROM_EMAIL || 'studio@newagefotografie.com',
            studioEmail: process.env.STUDIO_NOTIFY_EMAIL || 'studio@newagefotografie.com'
        };
        if (!emailSettings.user || !emailSettings.pass) {
            console.error('Email credentials not configured');
            return;
        }
        // Create transporter
        const transporter = nodemailer_1.default.createTransport({
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
New Age Fotografie CRM System
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
      <p style="color: #666; font-size: 12px;">New Age Fotografie CRM System</p>
    `;
        await transporter.sendMail({
            from: `"New Age Fotografie" <${emailSettings.fromEmail}>`,
            to: emailSettings.studioEmail,
            subject,
            text,
            html
        });
        console.log('Studio notification email sent successfully');
    }
    catch (error) {
        console.error('Error sending studio notification email:', error);
        throw error;
    }
}
async function sendClientConfirmationEmail(clientEmail, clientName) {
    try {
        const emailSettings = {
            host: process.env.SMTP_HOST || 'smtp.easyname.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            user: process.env.SMTP_USER || process.env.EMAIL_USER,
            pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
            fromEmail: process.env.FROM_EMAIL || 'studio@newagefotografie.com'
        };
        if (!emailSettings.user || !emailSettings.pass) {
            console.error('Email credentials not configured');
            return;
        }
        const transporter = nodemailer_1.default.createTransport({
            host: emailSettings.host,
            port: emailSettings.port,
            secure: emailSettings.port === 465,
            auth: {
                user: emailSettings.user,
                pass: emailSettings.pass
            }
        });
        const subject = 'Vielen Dank für Ihren Fragebogen - New Age Fotografie';
        const text = `
Liebe/r ${clientName},

vielen Dank, dass Sie unseren Fragebogen ausgefüllt haben!

Wir haben Ihre Antworten erhalten und werden uns in Kürze bei Ihnen melden, um weitere Details für Ihr Fotoshooting zu besprechen.

Bei Fragen können Sie uns jederzeit kontaktieren.

Mit freundlichen Grüßen,
Ihr Team von New Age Fotografie

---
New Age Fotografie
Website: https://newagefotografie.com
    `;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Vielen Dank für Ihren Fragebogen!</h2>
        
        <p>Liebe/r ${clientName},</p>
        
        <p>vielen Dank, dass Sie unseren Fragebogen ausgefüllt haben!</p>
        
        <p>Wir haben Ihre Antworten erhalten und werden uns in Kürze bei Ihnen melden, um weitere Details für Ihr Fotoshooting zu besprechen.</p>
        
        <p>Bei Fragen können Sie uns jederzeit kontaktieren.</p>
        
        <p>Mit freundlichen Grüßen,<br>
        Ihr Team von New Age Fotografie</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          New Age Fotografie<br>
          Website: <a href="https://newagefotografie.com">https://newagefotografie.com</a>
        </p>
      </div>
    `;
        await transporter.sendMail({
            from: `"New Age Fotografie" <${emailSettings.fromEmail}>`,
            to: clientEmail,
            subject,
            text,
            html
        });
        console.log('Client confirmation email sent successfully');
    }
    catch (error) {
        console.error('Error sending client confirmation email:', error);
        throw error;
    }
}
