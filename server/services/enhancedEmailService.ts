import nodemailer from 'nodemailer';
import { db } from '../db';
import { crmMessages, crmClients } from '@shared/schema';
import { eq, or, ilike } from 'drizzle-orm';
import { BrevoService } from './brevoService';
import { getSmtpTransporter, getFromAddress } from '../utils/smtp-helper';
import { config } from '../config-reader';

export interface EmailAttachment {
  filename: string;
  path?: string;
  content?: Buffer;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  content: string;
  html?: string;
  attachments?: EmailAttachment[];
  clientId?: string;
  autoLinkClient?: boolean; // automatically find client by email
}

export class EnhancedEmailService {
  private static transporter: nodemailer.Transporter | null = null;
  private static useBrevo: boolean = false;

  /**
   * Initialize email transporter
   */
  static async initialize() {
    try {
      // Prefer Brevo when a key is present AND it initialises.
      const brevoKey = await config.get('brevo_api_key') || process.env.BREVO_API_KEY;
      if (brevoKey || process.env.EMAIL_PROVIDER === 'brevo') {
        try {
          if (BrevoService.initialize()) {
            this.useBrevo = true;
            console.log('✅ Email service using Brevo API');
          }
        } catch (brevoErr) {
          console.warn('⚠️ Brevo init failed, will use SMTP instead:', brevoErr);
        }
      }

      // ALWAYS also set up SMTP via shared smtp-helper (reads from DB then env),
      // even when Brevo is active — so a Brevo send failure (e.g. an invalid/
      // disabled key → "API Key is not enabled") can still be delivered via SMTP
      // rather than hard-failing.
      try {
        this.transporter = await getSmtpTransporter();
        console.log('✅ Email transporter created via smtp-helper');
      } catch (smtpErr) {
        console.warn('⚠️ SMTP configuration incomplete:', smtpErr);
        if (!this.useBrevo) console.warn('📧 Email service will work in demo mode');
      }

      return this.useBrevo || !!this.transporter;

    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      console.warn('📧 Email service will work in demo mode');
      return false;
    }
  }

  /**
   * Find client by email address
   */
  static async findClientByEmail(email: string) {
    try {
      const clients = await db
        .select()
        .from(crmClients)
        .where(ilike(crmClients.email, email))
        .limit(1);

      return clients[0] || null;
    } catch (error) {
      console.error('Error finding client by email:', error);
      return null;
    }
  }

  /**
   * Send email and automatically link to client record
   */
  static async sendEmail(options: SendEmailOptions): Promise<{
    success: boolean;
    messageId?: string;
    clientId?: string;
    error?: string;
  }> {
    try {
      // Initialize if not already done
      if (!this.transporter && !this.useBrevo) {
        console.log('📧 Transporter not initialized, initializing now...');
        const initResult = await this.initialize();
        console.log('📧 Initialize result:', initResult, 'Using Brevo:', this.useBrevo, 'Transporter exists:', !!this.transporter);
      }

      // Prefer Brevo ONLY when it actually initialised. A mere BREVO_API_KEY env
      // var (possibly invalid/disabled — "API Key is not enabled") must not hijack
      // sending and block the working SMTP path. If a Brevo send fails, fall
      // through to the SMTP path below instead of returning the error.
      if (this.useBrevo) {
        console.log('📧 Routing email through Brevo API');
        const brevoResult = await BrevoService.sendEmail({
          to: options.to,
          subject: options.subject,
          htmlContent: options.html,
          textContent: options.content,
          clientId: options.clientId,
          autoLinkClient: options.autoLinkClient,
          attachments: options.attachments?.map(att => ({
            name: att.filename,
            content: att.content ? att.content.toString('base64') : '',
          })),
        });
        if (brevoResult?.success) return brevoResult;
        console.warn('📧 Brevo send failed, falling back to SMTP:', brevoResult?.error);
      }

      // Auto-link to client if requested
      let clientId = options.clientId;
      if (options.autoLinkClient && !clientId) {
        const client = await this.findClientByEmail(options.to);
        if (client) {
          clientId = client.id;
          console.log(`📧 Auto-linked email to client: ${client.firstName} ${client.lastName}`);
        }
      }

      // Demo mode if transporter not available
      if (!this.transporter) {
        console.log('📧 Demo mode: Email would be sent to:', options.to);
        console.log('📧 Demo mode: Subject:', options.subject);
        console.log('📧 Demo mode: Content preview:', options.content.substring(0, 100) + '...');
        
        // Save demo email to database
  const demoFromEmail = (await config.get('from_email')) || process.env.SMTP_FROM || process.env.SMTP_USER || 'demo@example.com';
  const demoBizName = (await config.get('business_name')) || process.env.BUSINESS_NAME || 'Studio';

  await db.insert(crmMessages).values({
          senderName: demoBizName,
          senderEmail: demoFromEmail,
          recipientEmail: options.to, // Store the recipient for sent emails view
          subject: options.subject,
          content: options.content,
          messageType: 'email',
          status: 'demo_sent',
          direction: 'outbound',
          clientId: clientId,
          emailMessageId: 'demo_' + Date.now(),
          sentAt: new Date(),
  }).returning({ id: crmMessages.id });

        return {
          success: true,
          demo: true,
          error: 'SMTP is not configured — email was NOT actually sent (demo mode).',
          messageId: 'demo_' + Date.now(),
          clientId: clientId,
        };
      }

      // Real email sending
      const fromAddr = await getFromAddress();
      const fromEmail = (await config.get('from_email')) || process.env.SMTP_FROM || process.env.SMTP_USER || '';
      const bizName = (await config.get('business_name')) || process.env.BUSINESS_NAME || 'Studio';
      const mailOptions = {
        from: fromAddr,
        to: options.to,
        subject: options.subject,
        text: options.content,
        html: options.html || options.content.replace(/\n/g, '<br>'),
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);

      // Save to database with recipient info for sent emails view
  await db.insert(crmMessages).values({
        senderName: bizName,
        senderEmail: fromEmail,
        recipientEmail: options.to, // Store the recipient for sent emails view
        subject: options.subject,
        content: options.content,
        messageType: 'email',
        status: 'sent',
        direction: 'outbound',
        clientId: clientId,
        emailMessageId: result.messageId,
        attachments: options.attachments ? JSON.stringify(options.attachments.map(att => ({
          filename: att.filename,
          contentType: att.contentType
        }))) : null,
        sentAt: new Date(),
  }).returning({ id: crmMessages.id });

      console.log(`✅ Email sent successfully to ${options.to}`, {
        messageId: result.messageId,
        clientLinked: !!clientId
      });

      return {
        success: true,
        messageId: result.messageId,
        clientId: clientId,
      };

    } catch (error) {
      console.error('❌ Failed to send email:', error);
      console.error('❌ SMTP Error details:', {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        command: (error as any)?.command,
        responseCode: (error as any)?.responseCode,
        response: (error as any)?.response,
      });
      
      // Fallback to demo mode on SMTP errors
      console.log('📧 Falling back to demo mode due to SMTP error');
      
      try {
        // Auto-link to client if requested
        let clientId = options.clientId;
        if (options.autoLinkClient && !clientId) {
          const client = await this.findClientByEmail(options.to);
          if (client) {
            clientId = client.id;
          }
        }

        // Save demo email to database with recipient info
  const fbFromEmail = (await config.get('from_email')) || process.env.SMTP_FROM || process.env.SMTP_USER || 'demo@example.com';
  const fbBizName = (await config.get('business_name')) || process.env.BUSINESS_NAME || 'Studio';
  await db.insert(crmMessages).values({
          senderName: fbBizName,
          senderEmail: fbFromEmail,
          recipientEmail: options.to, // Store the recipient for sent emails view
          subject: options.subject,
          content: options.content,
          messageType: 'email',
          status: 'demo_sent',
          direction: 'outbound',
          clientId: clientId,
          emailMessageId: 'demo_fallback_' + Date.now(),
          sentAt: new Date(),
  }).returning({ id: crmMessages.id });

        return {
          success: true,
          demo: true,
          error: `SMTP send failed (email NOT delivered): ${error instanceof Error ? error.message : String(error)}`,
          messageId: 'demo_fallback_' + Date.now(),
          clientId: clientId,
        };

      } catch (dbError) {
        console.error('Failed to save demo email:', dbError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get email history for a specific client
   */
  static async getClientEmailHistory(clientId: string) {
    try {
      return await db
        .select()
        .from(crmMessages)
        .where(
          eq(crmMessages.clientId, clientId)
        )
        .orderBy(crmMessages.createdAt);
    } catch (error) {
      console.error('Error fetching client email history:', error);
      return [];
    }
  }

  /**
   * Get all email communications
   */
  static async getAllEmailHistory(limit = 50) {
    try {
        return await db
        .select({
          id: crmMessages.id,
          subject: crmMessages.subject,
          senderEmail: crmMessages.senderEmail,
          status: crmMessages.status,
          clientId: crmMessages.clientId,
          sentAt: crmMessages.sentAt,
          createdAt: crmMessages.createdAt,
          // Join client info
          clientName: crmClients.firstName,
          clientLastName: crmClients.lastName,
          clientEmail: crmClients.email,
        })
        .from(crmMessages)
        .leftJoin(crmClients, eq(crmMessages.clientId, crmClients.id))
        .where(eq(crmMessages.messageType, 'email'))
        .orderBy(crmMessages.createdAt)
        .limit(limit);
    } catch (error) {
      console.error('Error fetching email history:', error);
      return [];
    }
  }

  /**
   * Mark email as read
   */
  static async markAsRead(messageId: string) {
    try {
      await db
        .update(crmMessages)
        .set({ 
          status: 'read',
          readAt: new Date()
        })
        .where(eq(crmMessages.id, messageId));
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  }
}

// Email templates for common scenarios
export const EmailTemplates = {
  /**
   * Welcome email for new clients
   */
  welcome: (clientName: string) => ({
    subject: 'Willkommen bei New Age Fotografie!',
    content: `Liebe/r ${clientName},

herzlich willkommen bei New Age Fotografie! 

Wir freuen uns sehr, Sie als neuen Kunden begrüßen zu dürfen. Unser Team steht Ihnen jederzeit zur Verfügung, um Ihre Fotoshoot-Wünsche zu verwirklichen.

Was Sie als nächstes erwartet:
• Terminbestätigung innerhalb von 24 Stunden
• Persönliche Beratung zu Ihrem Fotoshoot
• Professionelle Nachbearbeitung Ihrer Bilder
• Zugang zu Ihrer privaten Online-Galerie

Bei Fragen können Sie uns jederzeit unter dieser E-Mail-Adresse oder telefonisch erreichen.

Wir freuen uns auf Ihr Fotoshoot!

Herzliche Grüße
Ihr Team von New Age Fotografie`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7C3AED;">Willkommen bei New Age Fotografie!</h2>
        <p>Liebe/r ${clientName},</p>
        <p>herzlich willkommen bei New Age Fotografie!</p>
        <p>Wir freuen uns sehr, Sie als neuen Kunden begrüßen zu dürfen. Unser Team steht Ihnen jederzeit zur Verfügung, um Ihre Fotoshoot-Wünsche zu verwirklichen.</p>
        
        <h3>Was Sie als nächstes erwartet:</h3>
        <ul>
          <li>Terminbestätigung innerhalb von 24 Stunden</li>
          <li>Persönliche Beratung zu Ihrem Fotoshoot</li>
          <li>Professionelle Nachbearbeitung Ihrer Bilder</li>
          <li>Zugang zu Ihrer privaten Online-Galerie</li>
        </ul>
        
        <p>Bei Fragen können Sie uns jederzeit unter dieser E-Mail-Adresse oder telefonisch erreichen.</p>
        <p>Wir freuen uns auf Ihr Fotoshoot!</p>
        
        <p>Herzliche Grüße<br>
        Ihr Team von New Age Fotografie</p>
      </div>
    `
  }),

  /**
   * Booking confirmation email
   */
  bookingConfirmation: (clientName: string, date: string, time: string, type: string) => ({
    subject: 'Terminbestätigung - Ihr Fotoshoot bei New Age Fotografie',
    content: `Liebe/r ${clientName},

vielen Dank für Ihre Buchung! Hiermit bestätigen wir Ihren Termin:

📅 Datum: ${date}
🕐 Uhrzeit: ${time}
📸 Art: ${type}
📍 Ort: Unser Studio in Wien

Bitte bringen Sie mit:
• Verschiedene Outfits nach Ihrem Geschmack
• Persönliche Accessoires
• Gute Laune!

Bei Fragen oder Änderungen kontaktieren Sie uns bitte mindestens 24 Stunden vorher.

Wir freuen uns auf Sie!

Herzliche Grüße
Ihr Team von New Age Fotografie`
  }),

  /**
   * Follow-up after photoshoot
   */
  shootingFollowUp: (clientName: string) => ({
    subject: 'Danke für Ihr Vertrauen - Ihre Bilder sind in Bearbeitung',
    content: `Liebe/r ${clientName},

vielen Dank für das wunderbare Fotoshoot! Es hat uns große Freude bereitet, Sie zu fotografieren.

Ihre Bilder befinden sich nun in der professionellen Nachbearbeitung. Sie können sich auf folgendes freuen:

• Farbkorrektur und Optimierung jedes Bildes
• Zugang zu Ihrer privaten Online-Galerie
• High-Resolution Downloads verfügbar
• Optional: Professionelle Prints und Produkte

Die Bearbeitung dauert normalerweise 7-14 Werktage. Sie erhalten automatisch eine E-Mail, sobald Ihre Galerie bereit ist.

Vielen Dank für Ihr Vertrauen!

Herzliche Grüße
Ihr Team von New Age Fotografie`
  })
};

export default EnhancedEmailService;
